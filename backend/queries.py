"""
Все SELECT-запросы к витринам.

Принципы:
- Каждая функция принимает открытое соединение и возвращает чистые dict/list.
- Никакой бизнес-логики — только SELECT из v_*. Все агрегаты уже посчитаны
  на стадии миграции.
- Функции для КЛБ — префикс klb_*, для ЧР — chr_*. Изолируем по спортам.
"""

from __future__ import annotations

import sqlite3
from typing import Any


# ──────────────────────────────────────────────────────────────────────────
# Утилиты
# ──────────────────────────────────────────────────────────────────────────


def _rows(conn: sqlite3.Connection, sql: str, params: tuple = ()) -> list[dict[str, Any]]:
    """Выполнить SELECT и вернуть список dict'ов."""
    cur = conn.execute(sql, params)
    return [dict(row) for row in cur.fetchall()]


def _one(conn: sqlite3.Connection, sql: str, params: tuple = ()) -> dict[str, Any] | None:
    """Выполнить SELECT и вернуть один dict или None."""
    cur = conn.execute(sql, params)
    row = cur.fetchone()
    return dict(row) if row else None


# ──────────────────────────────────────────────────────────────────────────
# КЛБ — личный зачёт
# ──────────────────────────────────────────────────────────────────────────


def klb_personal_players(conn: sqlite3.Connection) -> list[dict]:
    """Список всех игроков с агрегатами личного зачёта."""
    sql = """
        SELECT *
        FROM v_player_personal
        ORDER BY avg_total DESC NULLS LAST, player_name
    """
    return _rows(conn, sql)


def klb_personal_player(conn: sqlite3.Connection, player_id: int) -> dict | None:
    """
    Карточка игрока: статистика личного зачёта + блок ролл-офф.
    Возвращает None, если игрока нет в v_player_personal.
    """
    personal = _one(
        conn,
        "SELECT * FROM v_player_personal WHERE player_id = ?",
        (player_id,),
    )
    if personal is None:
        return None

    rolloff = _one(
        conn,
        "SELECT * FROM v_player_rolloff WHERE player_id = ?",
        (player_id,),
    )
    # Если игрок не участвовал в ролл-оффах — отдаём None, фронт нарисует «—».
    personal["rolloff"] = rolloff
    return personal


def klb_personal_tournaments(conn: sqlite3.Connection) -> list[dict]:
    """Список турниров для раздела личного зачёта."""
    sql = """
        SELECT tournament_id, name, year, season, stage
        FROM tournaments
        ORDER BY year DESC, season DESC, stage
    """
    return _rows(conn, sql)


def klb_personal_tournament(conn: sqlite3.Connection, tournament_id: int) -> dict | None:
    """
    Результаты турнира × игрок.
    Возвращает {tournament: {...}, results: [...]} или None, если турнира нет.
    """
    tournament = _one(
        conn,
        """
        SELECT tournament_id, name, year, season, stage
        FROM tournaments
        WHERE tournament_id = ?
        """,
        (tournament_id,),
    )
    if tournament is None:
        return None

    results = _rows(
        conn,
        """
        SELECT *
        FROM v_tournament_personal
        WHERE tournament_id = ?
        ORDER BY avg_total DESC NULLS LAST, player_name
        """,
        (tournament_id,),
    )
    return {"tournament": tournament, "results": results}


# ──────────────────────────────────────────────────────────────────────────
# КЛБ — командный зачёт
# ──────────────────────────────────────────────────────────────────────────


def klb_team_teams(conn: sqlite3.Connection) -> list[dict]:
    """Список команд: сначала самые свежие сезоны, внутри — по среднему."""
    sql = """
        SELECT *
        FROM v_team_stats
        ORDER BY latest_season DESC, avg_total DESC NULLS LAST, team_name
    """
    return _rows(conn, sql)


def klb_team_team(conn: sqlite3.Connection, team_id: int) -> dict | None:
    """Карточка команды: статистика команды + ролл-офф команды."""
    team = _one(
        conn,
        "SELECT * FROM v_team_stats WHERE team_id = ?",
        (team_id,),
    )
    if team is None:
        return None

    rolloff = _one(
        conn,
        "SELECT * FROM v_team_rolloff WHERE team_id = ?",
        (team_id,),
    )
    team["rolloff"] = rolloff
    return team


def klb_team_tournaments(conn: sqlite3.Connection) -> list[dict]:
    """
    Турниры, где были командные результаты.
    Фильтруем по наличию строк в v_tournament_team — некоторые турниры могли
    быть чисто личными.
    """
    sql = """
        SELECT t.tournament_id, t.name, t.year, t.season, t.stage
        FROM tournaments t
        WHERE EXISTS (
            SELECT 1 FROM v_tournament_team vtt
            WHERE vtt.tournament_id = t.tournament_id
        )
        ORDER BY t.year DESC, t.season DESC, t.stage
    """
    return _rows(conn, sql)


def klb_team_tournament(conn: sqlite3.Connection, tournament_id: int) -> dict | None:
    """Командные результаты турнира."""
    tournament = _one(
        conn,
        """
        SELECT tournament_id, name, year, season, stage
        FROM tournaments
        WHERE tournament_id = ?
        """,
        (tournament_id,),
    )
    if tournament is None:
        return None

    results = _rows(
        conn,
        """
        SELECT *
        FROM v_tournament_team
        WHERE tournament_id = ?
        ORDER BY avg_total DESC NULLS LAST, team_name
        """,
        (tournament_id,),
    )
    return {"tournament": tournament, "results": results}


# ──────────────────────────────────────────────────────────────────────────
# КЛБ — клубы (общие для обоих режимов)
# ──────────────────────────────────────────────────────────────────────────


def klb_clubs(conn: sqlite3.Connection) -> list[dict]:
    """Список клубов с агрегатами."""
    sql = """
        SELECT *
        FROM v_club_stats
        ORDER BY latest_season_with_team DESC NULLS LAST, club_name
    """
    return _rows(conn, sql)


def klb_club(conn: sqlite3.Connection, club_id: int) -> dict | None:
    """
    Карточка клуба: агрегаты + список текущих игроков клуба + список команд клуба.

    «Текущие игроки» = те, у кого current_club_name совпадает с именем клуба.
    Этот срез приходит уже из витрины v_player_personal, дополнительно ничего
    не считаем.
    """
    club = _one(
        conn,
        "SELECT * FROM v_club_stats WHERE club_id = ?",
        (club_id,),
    )
    if club is None:
        return None

    players = _rows(
        conn,
        """
        SELECT *
        FROM v_player_personal
        WHERE current_club_name = ?
        ORDER BY avg_total DESC NULLS LAST, player_name
        """,
        (club["club_name"],),
    )
    teams = _rows(
        conn,
        """
        SELECT *
        FROM v_team_stats
        WHERE club_id = ?
        ORDER BY latest_season DESC, team_name
        """,
        (club_id,),
    )
    club["players"] = players
    club["teams"] = teams
    return club


# ──────────────────────────────────────────────────────────────────────────
# ЧР — заглушки на будущее (реализуем, когда дойдём до миграции под новый API)
# ──────────────────────────────────────────────────────────────────────────


def chr_players(conn: sqlite3.Connection) -> list[dict]:
    """Список игроков ЧР с агрегатами из v_player_stats."""
    return _rows(conn, "SELECT * FROM v_player_stats ORDER BY player_name")


def chr_players_by_event(conn: sqlite3.Connection, event: str) -> list[dict]:
    """
    Статистика игроков ЧР, отфильтрованная по конкретному зачёту.

    Витрина v_player_stats считает агрегаты по всем играм игрока. Для среза
    по event нужно пересчитать ту же логику на подмножестве games, поэтому
    запрос длинный — это копия логики витрины с фильтром в normalized CTE.

    event: например 'doubles' или 'doubles mix'.
    """
    sql = """
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
                    WHEN frame_number = 10
                        THEN length(frame_content) - length(replace(frame_content, 'X', ''))
                    ELSE 0
                END AS strikes_count,

                CASE
                    WHEN frame_number BETWEEN 1 AND 9
                         AND length(frame_content) = 2
                         AND substr(frame_content, 2, 1) = '/' THEN 1
                    WHEN frame_number = 10
                        THEN length(frame_content) - length(replace(frame_content, '/', ''))
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
            MAX(player_name)                          AS player_name,
            COUNT(DISTINCT event)                     AS events_played,
            COUNT(DISTINCT game_id)                   AS games_played,
            SUM(total_score)                          AS total_pins,
            ROUND(AVG(total_score), 2)                AS average_score,
            MAX(total_score)                          AS best_game,
            MIN(total_score)                          AS worst_game,
            MAX(total_score) - MIN(total_score)       AS score_diff,
            SUM(strike_attempts)                      AS strike_attempts,
            SUM(strikes_count)                        AS strikes,
            ROUND(CAST(SUM(strikes_count) AS REAL) * 100.0
                  / NULLIF(SUM(strike_attempts), 0), 2) AS strike_percent,
            SUM(spares_count)                         AS spares,
            SUM(opens_count)                          AS opens,
            ROUND(CAST(SUM(spares_count) AS REAL) * 100.0
                  / NULLIF(SUM(spares_count) + SUM(opens_count), 0), 2) AS spare_conversion_percent,
            SUM(singles_left)                         AS singles_left,
            SUM(singles_converted)                    AS singles_converted,
            SUM(singles_left) - SUM(singles_converted) AS singles_missed,
            ROUND(CAST(SUM(singles_converted) AS REAL) * 100.0
                  / NULLIF(SUM(singles_left), 0), 2)  AS single_pin_percent
        FROM fs
        GROUP BY player_id
        ORDER BY average_score DESC NULLS LAST, player_name
    """
    return _rows(conn, sql, (event,))

def chr_player(conn: sqlite3.Connection, player_id: int) -> dict | None:
    """Карточка игрока ЧР: статистика + список всех игр."""
    stats = _one(
        conn,
        "SELECT * FROM v_player_stats WHERE player_id = ?",
        (player_id,),
    )
    if stats is None:
        return None

    games = _rows(
        conn,
        """
        SELECT game_id, game_number, play_date, time_start, time_end,
               lane, event, total_score
        FROM games
        WHERE player_id = ?
        ORDER BY play_date, time_start
        """,
        (player_id,),
    )
    stats["games"] = games
    return stats


def chr_tournament_summary(conn: sqlite3.Connection) -> dict:
    """
    Сводка по турниру ЧР: количество игроков, игр, общая сумма, среднее.
    Метаданные турнира (имя, даты) добавляются в export_to_json.py — это
    не данные, а конфигурация.
    """
    sql = """
        SELECT
            COUNT(DISTINCT player_id) AS players_count,
            COUNT(*)                  AS games_count,
            SUM(total_score)          AS total_pins,
            ROUND(AVG(total_score), 2) AS avg_score
        FROM games
    """
    row = conn.execute(sql).fetchone()
    return dict(row)


def chr_events(conn: sqlite3.Connection) -> list[dict]:
    """Список зачётов ЧР с количеством игр в каждом."""
    sql = """
        SELECT event, COUNT(*) AS games_count
        FROM games
        GROUP BY event
        ORDER BY event
    """
    return _rows(conn, sql)

