"""
BowlRus Stats — backend API.

Эндпоинты:
  GET /api/tournament       — общая информация о текущем турнире
  GET /api/players          — список игроков с полной статистикой
                              (опциональный фильтр ?event=doubles)
  GET /api/players/{id}     — карточка игрока: статистика + список всех его игр
  GET /api/events           — список зачётов (doubles, doubles mix)

Запуск:
    uvicorn backend.main:app --reload
"""

import sqlite3
from pathlib import Path
from typing import Optional

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware


# ---------- Настройки ----------

ROOT = Path(__file__).resolve().parent.parent
DB_PATH = ROOT / "data" / "chr2026.db"

# Метаданные турнира (захардкожены — это БД ЧР 2026)
TOURNAMENT_INFO = {
    "name": "Чемпионат России 2026",
    "date_start": "2026-05-02",
    "date_end": "2026-05-07",
    "slug": "chr2026",
}


# ---------- Приложение ----------

app = FastAPI(
    title="BowlRus Stats API",
    description="API статистики турниров по боулингу",
    version="0.1.0",
)

# CORS: разрешаем фронтенду (на другом порту) обращаться к API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # на проде ограничим
    allow_methods=["*"],
    allow_headers=["*"],
)


# ---------- Подключение к БД ----------

def get_db():
    """
    Новое подключение на каждый запрос. SQLite быстрый, можно не пулить.
    row_factory=Row позволяет обращаться к колонкам по имени.
    """
    if not DB_PATH.exists():
        raise HTTPException(
            status_code=500,
            detail=f"База {DB_PATH} не найдена. Запусти scripts/migrate_chr.py",
        )
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def rows_to_dicts(rows):
    return [dict(row) for row in rows]


# ---------- Эндпоинты ----------

@app.get("/")
def root():
    """Заглушка чтобы сразу видеть, что сервер жив."""
    return {
        "service": "BowlRus Stats API",
        "tournament": TOURNAMENT_INFO["name"],
        "docs": "/docs",
    }


@app.get("/api/tournament")
def get_tournament():
    """Общая информация о турнире + сводные цифры."""
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT
                COUNT(DISTINCT player_id) AS players_count,
                COUNT(*)                  AS games_count,
                SUM(total_score)          AS total_pins,
                ROUND(AVG(total_score), 2) AS avg_score
            FROM games
        """)
        summary = dict(cur.fetchone())
        return {**TOURNAMENT_INFO, "summary": summary}
    finally:
        conn.close()


@app.get("/api/events")
def get_events():
    """Список зачётов (event) с количеством игр."""
    conn = get_db()
    try:
        cur = conn.cursor()
        cur.execute("""
            SELECT event, COUNT(*) AS games_count
            FROM games
            GROUP BY event
            ORDER BY event
        """)
        return rows_to_dicts(cur.fetchall())
    finally:
        conn.close()


@app.get("/api/players")
def get_players(event: Optional[str] = Query(None, description="Фильтр по зачёту")):
    """
    Список игроков с полной статистикой.

    Без фильтра — берём готовую витрину v_player_stats (быстро).
    С фильтром по event — считаем агрегаты на лету по подмножеству.
    """
    conn = get_db()
    try:
        cur = conn.cursor()

        if event is None:
            cur.execute("""
                SELECT *
                FROM v_player_stats
                ORDER BY average_score DESC, player_name
            """)
            return rows_to_dicts(cur.fetchall())

        # С фильтром — повторяем логику витрины, но только по выбранному event
        cur.execute("""
            WITH normalized AS (
                SELECT
                    g.game_id, g.player_id, g.player_name, g.event,
                    g.total_score,
                    f.frame_number,
                    REPLACE(f.content, 'S', '') AS frame_content
                FROM games g
                LEFT JOIN frames f ON f.game_id = g.game_id
                WHERE g.event = ?
            ),
            fs AS (
                SELECT
                    game_id, player_id, player_name, event, total_score,

                    CASE
                        WHEN frame_number BETWEEN 1 AND 9 AND frame_content = 'X' THEN 1
                        WHEN frame_number = 10 THEN length(frame_content) - length(replace(frame_content, 'X', ''))
                        ELSE 0
                    END AS strikes_count,

                    CASE
                        WHEN frame_number BETWEEN 1 AND 9
                             AND length(frame_content) = 2
                             AND substr(frame_content, 2, 1) = '/' THEN 1
                        WHEN frame_number = 10 THEN length(frame_content) - length(replace(frame_content, '/', ''))
                        ELSE 0
                    END AS spares_count,

                    CASE
                        WHEN frame_number BETWEEN 1 AND 9
                             AND frame_content <> 'X'
                             AND NOT (length(frame_content) = 2 AND substr(frame_content, 2, 1) = '/') THEN 1
                        WHEN frame_number = 10
                             AND ((substr(frame_content, 1, 1) <> 'X' AND substr(frame_content, 2, 1) <> '/')
                                  OR (substr(frame_content, 1, 1) = 'X' AND substr(frame_content, 2, 1) <> 'X'
                                      AND substr(frame_content, 3, 1) <> '/'))
                            THEN 1
                        ELSE 0
                    END AS opens_count,

                    CASE
                        WHEN frame_number BETWEEN 1 AND 9 THEN 1
                        WHEN frame_number = 10 AND substr(frame_content, 1, 1) = 'X'
                             AND substr(frame_content, 2, 1) = 'X' THEN 3
                        WHEN frame_number = 10 AND substr(frame_content, 1, 1) = 'X'
                             AND substr(frame_content, 2, 1) <> 'X' THEN 2
                        WHEN frame_number = 10 AND substr(frame_content, 1, 1) <> 'X'
                             AND substr(frame_content, 2, 1) <> '/' THEN 1
                        WHEN frame_number = 10 AND substr(frame_content, 1, 1) <> 'X'
                             AND substr(frame_content, 2, 1) = '/' THEN 2
                        ELSE 0
                    END AS strike_attempts,

                    CASE
                        WHEN frame_number BETWEEN 1 AND 9
                             AND substr(frame_content, 1, 1) = '9'
                             AND length(frame_content) = 2
                             AND substr(frame_content, 2, 1) IN ('-', '/', 'F') THEN 1
                        WHEN frame_number = 10
                             AND ((substr(frame_content, 1, 1) = '9'
                                   AND substr(frame_content, 2, 1) IN ('-', '/', 'F'))
                                  OR (substr(frame_content, 1, 1) = 'X'
                                      AND substr(frame_content, 2, 1) = '9'
                                      AND substr(frame_content, 3, 1) IN ('-', '/', 'F'))) THEN 1
                        ELSE 0
                    END AS singles_left,

                    CASE
                        WHEN frame_number BETWEEN 1 AND 9
                             AND substr(frame_content, 1, 1) = '9'
                             AND substr(frame_content, 2, 1) = '/' THEN 1
                        WHEN frame_number = 10
                             AND ((substr(frame_content, 1, 1) = '9'
                                   AND substr(frame_content, 2, 1) = '/')
                                  OR (substr(frame_content, 1, 1) = 'X'
                                      AND substr(frame_content, 2, 1) = '9'
                                      AND substr(frame_content, 3, 1) = '/')) THEN 1
                        ELSE 0
                    END AS singles_converted

                FROM normalized
            )
            SELECT
                player_id,
                MAX(player_name)             AS player_name,
                COUNT(DISTINCT event)         AS events_played,
                COUNT(DISTINCT game_id)       AS games_played,
                SUM(total_score)              AS total_pins,
                ROUND(AVG(total_score), 2)    AS average_score,
                MAX(total_score)              AS best_game,
                MIN(total_score)              AS worst_game,
                MAX(total_score) - MIN(total_score) AS score_diff,
                SUM(strike_attempts)          AS strike_attempts,
                SUM(strikes_count)            AS strikes,
                ROUND(CAST(SUM(strikes_count) AS REAL) * 100.0
                      / NULLIF(SUM(strike_attempts), 0), 2)         AS strike_percent,
                SUM(spares_count)             AS spares,
                SUM(opens_count)              AS opens,
                ROUND(CAST(SUM(spares_count) AS REAL) * 100.0
                      / NULLIF(SUM(spares_count) + SUM(opens_count), 0), 2) AS spare_conversion_percent,
                SUM(singles_left)             AS singles_left,
                SUM(singles_converted)        AS singles_converted,
                SUM(singles_left) - SUM(singles_converted) AS singles_missed,
                ROUND(CAST(SUM(singles_converted) AS REAL) * 100.0
                      / NULLIF(SUM(singles_left), 0), 2) AS single_pin_percent
            FROM fs
            GROUP BY player_id
            ORDER BY average_score DESC, player_name
        """, (event,))
        return rows_to_dicts(cur.fetchall())
    finally:
        conn.close()


@app.get("/api/players/{player_id}")
def get_player(player_id: int):
    """Карточка одного игрока: его сводная статистика + список всех его игр."""
    conn = get_db()
    try:
        cur = conn.cursor()

        cur.execute("SELECT * FROM v_player_stats WHERE player_id = ?", (player_id,))
        stats = cur.fetchone()
        if stats is None:
            raise HTTPException(status_code=404, detail="Игрок не найден")

        cur.execute("""
            SELECT game_id, game_number, play_date, time_start, time_end,
                   lane, event, total_score
            FROM games
            WHERE player_id = ?
            ORDER BY play_date, time_start
        """, (player_id,))
        games = rows_to_dicts(cur.fetchall())

        return {
            "stats": dict(stats),
            "games": games,
        }
    finally:
        conn.close()