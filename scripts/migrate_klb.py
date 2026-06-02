"""
Миграция данных Континентальной Лиги Боулинга (КЛБ) из MySQL в SQLite.

Источник: MySQL БД `bowling` (8 таблиц).
Цель: data/klb.db с витринами для сайта.

Витрины:
  v_player_personal   - личная статистика игрока (с разбивкой квалы/RR/плей-офф)
  v_team_stats        - командная статистика
  v_club_stats        - агрегаты по клубам
  v_player_rolloff    - ролл-офф статистика игроков
  v_team_rolloff      - ролл-офф статистика команд
  v_tournament_personal - результаты турнира x игрок
  v_tournament_team   - результаты турнира x команда

Запуск:
    python scripts/migrate_klb.py
"""

import datetime
import os
import re
import sqlite3
import sys
from decimal import Decimal
from pathlib import Path

import mysql.connector
from dotenv import load_dotenv


# ---------- Настройки ----------

ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
DATA_DIR.mkdir(exist_ok=True)
SQLITE_PATH = DATA_DIR / "klb.db"

load_dotenv(ROOT / ".env")

MYSQL_CONFIG = {
    "host": os.getenv("MYSQL_HOST", "localhost"),
    "port": int(os.getenv("MYSQL_PORT", 3306)),
    "user": os.getenv("MYSQL_USER", "root"),
    "password": os.getenv("MYSQL_PASSWORD", ""),
    "database": "bowling",  # явно указываем КЛБ
    "charset": "utf8mb4",
}


# ---------- Классификация этапов ----------

# Для использования в SQL — формируем строки списков
QUALS_STAGES = ("'PTQ'", "'Основная квалификация'")
RR_STAGES = ("'RR'", "'RR_A'", "'RR_B'", "'RR_C'")
PO_STAGES = (
    "'1 этап'", "'2 этап'",
    "'Четвертьфинал'", "'Полуфинал'", "'Финал'",
    "'Матч за 3 место'", "'double elimination'", "'Степледдер'",
)

QUALS_SQL = ", ".join(QUALS_STAGES)
RR_SQL = ", ".join(RR_STAGES)
PO_SQL = ", ".join(PO_STAGES)


# ---------- Парсинг ролл-офф ----------

def parse_rolloff(raw: str | None) -> list[int]:
    """
    Разбирает строку rolloff_p1/p2 в список значений бросков.

    Учитываем:
      - X или Х (лат/кир) = 10
      - 0-9 = соответствующее число
      - / и \\ = разделители (не броски)
      - всё в скобках () = мусор, выкидываем
      - пробелы, F, прочие символы = игнор
    """
    if not raw:
        return []

    # Убираем всё в скобках вместе со скобками
    s = re.sub(r"\([^)]*\)", "", raw)

    throws = []
    for ch in s:
        if ch in ("X", "Х"):  # лат и кир
            throws.append(10)
        elif ch.isdigit():
            throws.append(int(ch))
        # всё остальное (/, \, пробелы, буквы, символы) — пропускаем

    return throws


# ---------- Подключения ----------

def connect_mysql():
    print(f"→ Подключаюсь к MySQL: {MYSQL_CONFIG['user']}@{MYSQL_CONFIG['host']}:{MYSQL_CONFIG['port']}/{MYSQL_CONFIG['database']}")
    try:
        conn = mysql.connector.connect(**MYSQL_CONFIG)
        print("  ✓ Подключение установлено")
        return conn
    except mysql.connector.Error as e:
        print(f"  ✗ Ошибка подключения: {e}")
        sys.exit(1)


def convert_value(value):
    """Конвертирует типы MySQL в типы, которые SQLite принимает."""
    if value is None:
        return None
    if isinstance(value, datetime.date) and not isinstance(value, datetime.datetime):
        return value.isoformat()
    if isinstance(value, datetime.datetime):
        return value.isoformat(sep=" ")
    if isinstance(value, datetime.time):
        return value.isoformat()
    if isinstance(value, datetime.timedelta):
        total = int(value.total_seconds())
        h, rem = divmod(total, 3600)
        m, s = divmod(rem, 60)
        return f"{h:02d}:{m:02d}:{s:02d}"
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (bytes, bytearray)):
        return value.decode("utf-8", errors="replace")
    return value


# ---------- Схема SQLite ----------

def create_sqlite_schema(conn):
    print("→ Создаю схему SQLite")
    cur = conn.cursor()

    cur.executescript("""
        DROP TABLE IF EXISTS games;
        DROP TABLE IF EXISTS matches;
        DROP TABLE IF EXISTS player_team_history;
        DROP TABLE IF EXISTS player_club_history;
        DROP TABLE IF EXISTS teams;
        DROP TABLE IF EXISTS clubs;
        DROP TABLE IF EXISTS players;
        DROP TABLE IF EXISTS oil_patterns;
        DROP TABLE IF EXISTS tournaments;

        CREATE TABLE tournaments (
            tournament_id      INTEGER PRIMARY KEY,
            name               TEXT NOT NULL,
            file_name          TEXT,
            year               INTEGER,
            season             INTEGER,
            stage              INTEGER NOT NULL DEFAULT 1,
            oil_pattern_id     INTEGER,
            oil_pattern_ptq_id INTEGER
        );

        CREATE TABLE oil_patterns (
            id          INTEGER PRIMARY KEY,
            pattern_name TEXT NOT NULL,
            distance_ft INTEGER,
            volume_ml   REAL,
            ratio       REAL,
            photo_file  TEXT
        );

        CREATE TABLE clubs (
            club_id   INTEGER PRIMARY KEY,
            club_name TEXT
        );

        CREATE TABLE players (
            player_id INTEGER PRIMARY KEY,
            full_name TEXT NOT NULL,
            gender    TEXT DEFAULT 'U',
            club_id   INTEGER,
            hand      TEXT DEFAULT 'R'
        );

        CREATE TABLE teams (
            team_id   INTEGER PRIMARY KEY,
            team_name TEXT NOT NULL,
            club_id   INTEGER NOT NULL
        );

        CREATE TABLE games (
            game_id       INTEGER PRIMARY KEY,
            tournament_id INTEGER NOT NULL,
            player_id     INTEGER,
            team_id       INTEGER,
            match_id      INTEGER,
            stage_type    TEXT,
            "group"       TEXT,
            game_number   INTEGER,
            raw_score     INTEGER,
            hcp           INTEGER DEFAULT 0,
            created_at    TEXT,
            event         TEXT DEFAULT 'личный'
        );

        CREATE TABLE matches (
            match_id        INTEGER PRIMARY KEY,
            tournament_id   INTEGER NOT NULL,
            stage_type      TEXT,
            match_number    INTEGER,
            player1_id      INTEGER,
            player2_id      INTEGER,
            team1_id        INTEGER,
            team2_id        INTEGER,
            score_str       TEXT,
            rolloff_p1      TEXT,
            rolloff_p2      TEXT,
            winner_id       INTEGER,
            winner_team_id  INTEGER,
            N_qual1         TEXT,
            N_qual2         TEXT,
            event           TEXT DEFAULT 'личный'
        );

        CREATE TABLE player_club_history (
            id            INTEGER PRIMARY KEY,
            player_id     INTEGER NOT NULL,
            club_id       INTEGER,
            tournament_id INTEGER NOT NULL
        );

        CREATE TABLE player_team_history (
            id            INTEGER PRIMARY KEY,
            player_id     INTEGER NOT NULL,
            team_id       INTEGER NOT NULL,
            tournament_id INTEGER NOT NULL
        );

        CREATE INDEX idx_games_player     ON games(player_id);
        CREATE INDEX idx_games_team       ON games(team_id);
        CREATE INDEX idx_games_tournament ON games(tournament_id);
        CREATE INDEX idx_games_event      ON games(event);
        CREATE INDEX idx_games_stage      ON games(stage_type);

        CREATE INDEX idx_matches_player1  ON matches(player1_id);
        CREATE INDEX idx_matches_player2  ON matches(player2_id);
        CREATE INDEX idx_matches_team1    ON matches(team1_id);
        CREATE INDEX idx_matches_team2    ON matches(team2_id);

        CREATE INDEX idx_pth_player ON player_team_history(player_id);
        CREATE INDEX idx_pch_player ON player_club_history(player_id);
    """)
    conn.commit()
    print("  ✓ Схема создана")


# ---------- Копирование таблиц ----------

def copy_table(mysql_conn, sqlite_conn, table, columns, sqlite_columns=None):
    """
    Копирует таблицу. sqlite_columns — имена колонок в SQLite (если отличаются от MySQL,
    например для зарезервированного слова `group`).
    """
    print(f"→ Копирую {table}")
    mysql_cur = mysql_conn.cursor()
    sqlite_cur = sqlite_conn.cursor()

    mysql_col_list = ", ".join(f"`{c}`" for c in columns)
    sqlite_col_list = ", ".join(f'"{c}"' for c in (sqlite_columns or columns))
    placeholders = ", ".join(["?"] * len(columns))

    mysql_cur.execute(f"SELECT {mysql_col_list} FROM {table}")
    rows = mysql_cur.fetchall()
    converted = [tuple(convert_value(v) for v in row) for row in rows]

    sqlite_cur.executemany(
        f"INSERT INTO {table} ({sqlite_col_list}) VALUES ({placeholders})",
        converted,
    )
    sqlite_conn.commit()
    print(f"  ✓ {len(rows)} строк")


# ---------- Витрины ----------

def build_player_personal(conn):
    print("→ v_player_personal")
    cur = conn.cursor()

    cur.executescript(f"""
        DROP TABLE IF EXISTS v_player_personal;

        CREATE TABLE v_player_personal AS
        WITH
        /* текущий клуб игрока */
        current_club AS (
            SELECT p.player_id, c.club_name
            FROM players p
            LEFT JOIN clubs c ON c.club_id = p.club_id
        ),
        /* агрегаты по личным играм с разбивкой по этапам */
        agg AS (
            SELECT
                player_id,
                COUNT(*)                                        AS games_total,
                ROUND(AVG(raw_score + hcp), 1)                  AS avg_total,
                MAX(raw_score + hcp)                            AS best_game,
                MIN(raw_score + hcp)                            AS worst_game,
                COUNT(DISTINCT tournament_id)                   AS tournaments_played,

                SUM(CASE WHEN stage_type IN ({QUALS_SQL}) THEN 1 ELSE 0 END) AS quals_games,
                ROUND(AVG(CASE WHEN stage_type IN ({QUALS_SQL}) THEN raw_score + hcp END), 1) AS quals_avg,

                SUM(CASE WHEN stage_type IN ({RR_SQL}) THEN 1 ELSE 0 END) AS rr_games,
                ROUND(AVG(CASE WHEN stage_type IN ({RR_SQL}) THEN raw_score + hcp END), 1) AS rr_avg,

                SUM(CASE WHEN stage_type IN ({PO_SQL}) THEN 1 ELSE 0 END) AS po_games,
                ROUND(AVG(CASE WHEN stage_type IN ({PO_SQL}) THEN raw_score + hcp END), 1) AS po_avg,
                MAX(CASE WHEN stage_type IN ({PO_SQL}) THEN raw_score + hcp END) AS po_best
            FROM games
            WHERE event = 'личный'
              AND player_id IS NOT NULL
              AND raw_score IS NOT NULL
            GROUP BY player_id
        )
        SELECT
            p.player_id,
            p.full_name        AS player_name,
            p.gender,
            p.hand,
            cc.club_name       AS current_club_name,
            COALESCE(a.games_total, 0)        AS games_total,
            a.avg_total,
            a.best_game,
            a.worst_game,
            COALESCE(a.tournaments_played, 0) AS tournaments_played,
            COALESCE(a.quals_games, 0) AS quals_games,
            a.quals_avg,
            COALESCE(a.rr_games, 0)    AS rr_games,
            a.rr_avg,
            COALESCE(a.po_games, 0)    AS po_games,
            a.po_avg,
            a.po_best
        FROM players p
        LEFT JOIN current_club cc ON cc.player_id = p.player_id
        LEFT JOIN agg a           ON a.player_id  = p.player_id;

        CREATE INDEX idx_vpp_player ON v_player_personal(player_id);
    """)
    conn.commit()

    cur.execute("SELECT COUNT(*) FROM v_player_personal WHERE games_total > 0")
    n = cur.fetchone()[0]
    print(f"  ✓ {n} игроков с играми")


def build_team_stats(conn):
    print("→ v_team_stats")
    cur = conn.cursor()

    cur.executescript(f"""
        DROP TABLE IF EXISTS v_team_stats;

        CREATE TABLE v_team_stats AS
        WITH agg AS (
            SELECT
                g.team_id,

                /* Общий счёт игр: в RR счёт = сумма двоих, считаем как 2 игры */
                SUM(CASE WHEN g.stage_type IN ({RR_SQL}) THEN 2 ELSE 1 END) AS games_total,

                /* Средний на игру: сумма счёта (hcp NULL = 0) делить на число игр (RR×2) */
                ROUND(CAST(SUM(g.raw_score + COALESCE(g.hcp, 0)) AS REAL)
                      / SUM(CASE WHEN g.stage_type IN ({RR_SQL}) THEN 2 ELSE 1 END), 1) AS avg_total,

                MAX(CASE WHEN g.stage_type IN ({PO_SQL}) THEN g.raw_score + COALESCE(g.hcp, 0) END) AS best_game,

                SUM(CASE WHEN g.stage_type IN ({RR_SQL}) THEN 2 ELSE 0 END) AS rr_games,
                ROUND(CAST(SUM(CASE WHEN g.stage_type IN ({RR_SQL}) THEN g.raw_score + COALESCE(g.hcp, 0) END) AS REAL)
                      / NULLIF(SUM(CASE WHEN g.stage_type IN ({RR_SQL}) THEN 2 ELSE 0 END), 0), 1) AS rr_avg,

                SUM(CASE WHEN g.stage_type = 'PTQ' THEN 1 ELSE 0 END) AS quals_games,
                ROUND(AVG(CASE WHEN g.stage_type = 'PTQ' THEN g.raw_score + COALESCE(g.hcp, 0) END), 1) AS quals_avg,

                SUM(CASE WHEN g.stage_type IN ({PO_SQL}) THEN 1 ELSE 0 END) AS po_games,
                ROUND(AVG(CASE WHEN g.stage_type IN ({PO_SQL}) THEN g.raw_score + COALESCE(g.hcp, 0) END), 1) AS po_avg,
                MAX(CASE WHEN g.stage_type IN ({PO_SQL}) THEN g.raw_score + COALESCE(g.hcp, 0) END) AS po_best
            FROM games g
            WHERE g.event = 'командный'
              AND g.team_id IS NOT NULL
              AND g.raw_score IS NOT NULL
            GROUP BY g.team_id
        ),
               seasons_raw AS (
            /* Сезоны, в которых команда играла */
            SELECT DISTINCT
                g.team_id,
                t.season
            FROM games g
            JOIN tournaments t ON t.tournament_id = g.tournament_id
            WHERE g.event = 'командный' AND g.team_id IS NOT NULL
        ),
        seasons AS (
            SELECT
                team_id,
                GROUP_CONCAT(season) AS seasons_list,
                MAX(season)          AS latest_season
            FROM (
                SELECT team_id, season FROM seasons_raw ORDER BY team_id, season
            )
            GROUP BY team_id
        )
        SELECT
            t.team_id,
            t.team_name,
            t.club_id,
            c.club_name,
            COALESCE(a.games_total, 0) AS games_total,
            a.avg_total,
            a.best_game,
            COALESCE(a.rr_games, 0)    AS rr_games,
            a.rr_avg,
            COALESCE(a.quals_games, 0) AS quals_games,
            a.quals_avg,
            COALESCE(a.po_games, 0)    AS po_games,
            a.po_avg,
            a.po_best,
            s.seasons_list,
            s.latest_season
        FROM teams t
        LEFT JOIN clubs c    ON c.club_id = t.club_id
        LEFT JOIN agg a      ON a.team_id = t.team_id
        LEFT JOIN seasons s  ON s.team_id = t.team_id;

        CREATE INDEX idx_vts_team ON v_team_stats(team_id);
        CREATE INDEX idx_vts_club ON v_team_stats(club_id);
    """)
    conn.commit()

    cur.execute("SELECT COUNT(*) FROM v_team_stats WHERE games_total > 0")
    n = cur.fetchone()[0]
    print(f"  ✓ {n} команд с играми")


def build_club_stats(conn):
    print("→ v_club_stats")
    cur = conn.cursor()

    cur.executescript(f"""
        DROP TABLE IF EXISTS v_club_stats;

        CREATE TABLE v_club_stats AS
        WITH player_counts AS (
            SELECT pch.club_id, COUNT(DISTINCT pch.player_id) AS players_count
            FROM player_club_history pch
            WHERE pch.club_id IS NOT NULL
            GROUP BY pch.club_id
        ),
        team_counts AS (
            SELECT club_id, COUNT(*) AS teams_count
            FROM teams
            GROUP BY club_id
        ),
        latest_season AS (
            SELECT
                t.club_id,
                MAX(tr.season) AS latest_season_with_team
            FROM teams t
            JOIN games g       ON g.team_id = t.team_id AND g.event = 'командный'
            JOIN tournaments tr ON tr.tournament_id = g.tournament_id
            GROUP BY t.club_id
        )
        SELECT
            c.club_id,
            c.club_name,
            COALESCE(pc.players_count, 0) AS players_count,
            COALESCE(tc.teams_count, 0)   AS teams_count,
            ls.latest_season_with_team
        FROM clubs c
        LEFT JOIN player_counts pc ON pc.club_id = c.club_id
        LEFT JOIN team_counts tc   ON tc.club_id = c.club_id
        LEFT JOIN latest_season ls ON ls.club_id = c.club_id;
    """)
    conn.commit()

    cur.execute("SELECT COUNT(*) FROM v_club_stats")
    n = cur.fetchone()[0]
    print(f"  ✓ {n} клубов")


def build_rolloff_stats(conn):
    """
    Ролл-офф статистика для игроков и команд.
    Делается на Python — парсинг сложен для SQL.
    """
    print("→ v_player_rolloff и v_team_rolloff")
    cur = conn.cursor()

    cur.executescript("""
        DROP TABLE IF EXISTS v_player_rolloff;
        DROP TABLE IF EXISTS v_team_rolloff;

        CREATE TABLE v_player_rolloff (
            player_id      INTEGER PRIMARY KEY,
            player_name    TEXT,
            throws_count   INTEGER,
            throws_avg     REAL,
            matches_total  INTEGER,
            matches_won    INTEGER,
            winrate        REAL
        );

        CREATE TABLE v_team_rolloff (
            team_id        INTEGER PRIMARY KEY,
            team_name      TEXT,
            throws_count   INTEGER,
            throws_avg     REAL,
            matches_total  INTEGER,
            matches_won    INTEGER,
            winrate        REAL
        );
    """)
    conn.commit()

    # ---- Игроки ----
    cur.execute("""
        SELECT player1_id, player2_id, rolloff_p1, rolloff_p2, winner_id
        FROM matches
        WHERE event = 'личный'
          AND (rolloff_p1 IS NOT NULL OR rolloff_p2 IS NOT NULL)
          AND (rolloff_p1 != '' OR rolloff_p2 != '')
    """)

    player_data = {}  # player_id -> {throws: [], matches: int, wins: int}

    for p1, p2, ro1, ro2, winner in cur.fetchall():
        for player_id, raw_ro in [(p1, ro1), (p2, ro2)]:
            if player_id is None:
                continue
            throws = parse_rolloff(raw_ro)
            if not throws:
                continue
            if player_id not in player_data:
                player_data[player_id] = {"throws": [], "matches": 0, "wins": 0}
            player_data[player_id]["throws"].extend(throws)
            player_data[player_id]["matches"] += 1
            if winner == player_id:
                player_data[player_id]["wins"] += 1

    # Получаем имена
    cur.execute("SELECT player_id, full_name FROM players")
    player_names = dict(cur.fetchall())

    player_rows = []
    for pid, data in player_data.items():
        throws = data["throws"]
        avg = round(sum(throws) / len(throws), 2) if throws else None
        winrate = round(data["wins"] / data["matches"] * 100, 1) if data["matches"] else None
        player_rows.append((
            pid,
            player_names.get(pid),
            len(throws),
            avg,
            data["matches"],
            data["wins"],
            winrate,
        ))

    cur.executemany(
        "INSERT INTO v_player_rolloff VALUES (?, ?, ?, ?, ?, ?, ?)",
        player_rows,
    )

    # ---- Команды ----
    cur.execute("""
        SELECT team1_id, team2_id, rolloff_p1, rolloff_p2, winner_team_id
        FROM matches
        WHERE event = 'командный'
          AND (rolloff_p1 IS NOT NULL OR rolloff_p2 IS NOT NULL)
          AND (rolloff_p1 != '' OR rolloff_p2 != '')
    """)

    team_data = {}
    for t1, t2, ro1, ro2, winner in cur.fetchall():
        for team_id, raw_ro in [(t1, ro1), (t2, ro2)]:
            if team_id is None:
                continue
            throws = parse_rolloff(raw_ro)
            if not throws:
                continue
            if team_id not in team_data:
                team_data[team_id] = {"throws": [], "matches": 0, "wins": 0}
            team_data[team_id]["throws"].extend(throws)
            team_data[team_id]["matches"] += 1
            if winner == team_id:
                team_data[team_id]["wins"] += 1

    cur.execute("SELECT team_id, team_name FROM teams")
    team_names = dict(cur.fetchall())

    team_rows = []
    for tid, data in team_data.items():
        throws = data["throws"]
        avg = round(sum(throws) / len(throws), 2) if throws else None
        winrate = round(data["wins"] / data["matches"] * 100, 1) if data["matches"] else None
        team_rows.append((
            tid,
            team_names.get(tid),
            len(throws),
            avg,
            data["matches"],
            data["wins"],
            winrate,
        ))

    cur.executemany(
        "INSERT INTO v_team_rolloff VALUES (?, ?, ?, ?, ?, ?, ?)",
        team_rows,
    )

    conn.commit()
    print(f"  ✓ игроков с ролл-оффами: {len(player_rows)}, команд: {len(team_rows)}")


def build_tournament_personal(conn):
    print("→ v_tournament_personal")
    cur = conn.cursor()

    cur.executescript(f"""
        DROP TABLE IF EXISTS v_tournament_personal;

        CREATE TABLE v_tournament_personal AS
        WITH agg AS (
            SELECT
                g.tournament_id,
                g.player_id,
                COUNT(*)                       AS games_total,
                ROUND(AVG(g.raw_score + g.hcp), 1) AS avg_total,
                MAX(g.raw_score + g.hcp)       AS best_game,

                SUM(CASE WHEN g.stage_type IN ({QUALS_SQL}) THEN 1 ELSE 0 END) AS quals_games,
                ROUND(AVG(CASE WHEN g.stage_type IN ({QUALS_SQL}) THEN g.raw_score + g.hcp END), 1) AS quals_avg,

                SUM(CASE WHEN g.stage_type IN ({RR_SQL}) THEN 1 ELSE 0 END) AS rr_games,
                ROUND(AVG(CASE WHEN g.stage_type IN ({RR_SQL}) THEN g.raw_score + g.hcp END), 1) AS rr_avg,

                SUM(CASE WHEN g.stage_type IN ({PO_SQL}) THEN 1 ELSE 0 END) AS po_games,
                ROUND(AVG(CASE WHEN g.stage_type IN ({PO_SQL}) THEN g.raw_score + g.hcp END), 1) AS po_avg
            FROM games g
            WHERE g.event = 'личный' AND g.player_id IS NOT NULL
              AND g.raw_score IS NOT NULL
            GROUP BY g.tournament_id, g.player_id
        ),
        team_at_tournament AS (
            SELECT
                pth.tournament_id,
                pth.player_id,
                t.team_name
            FROM player_team_history pth
            JOIN teams t ON t.team_id = pth.team_id
        )
        SELECT
            a.tournament_id,
            a.player_id,
            p.full_name              AS player_name,
            tat.team_name            AS team_name_at_tournament,
            a.games_total,
            a.avg_total,
            a.best_game,
            a.quals_games, a.quals_avg,
            a.rr_games, a.rr_avg,
            a.po_games, a.po_avg
        FROM agg a
        JOIN players p ON p.player_id = a.player_id
        LEFT JOIN team_at_tournament tat
            ON tat.tournament_id = a.tournament_id
           AND tat.player_id     = a.player_id;

        CREATE INDEX idx_vtp_tournament ON v_tournament_personal(tournament_id);
        CREATE INDEX idx_vtp_player     ON v_tournament_personal(player_id);
    """)
    conn.commit()

    cur.execute("SELECT COUNT(*) FROM v_tournament_personal")
    n = cur.fetchone()[0]
    print(f"  ✓ {n} строк (турнир × игрок)")


def build_tournament_team(conn):
    print("→ v_tournament_team")
    cur = conn.cursor()

    cur.executescript(f"""
        DROP TABLE IF EXISTS v_tournament_team;

        CREATE TABLE v_tournament_team AS
        WITH agg AS (
            SELECT
                g.tournament_id,
                g.team_id,

                SUM(CASE WHEN g.stage_type IN ({RR_SQL}) THEN 2 ELSE 1 END) AS games_total,
                ROUND(CAST(SUM(g.raw_score + COALESCE(g.hcp, 0)) AS REAL)
                      / SUM(CASE WHEN g.stage_type IN ({RR_SQL}) THEN 2 ELSE 1 END), 1) AS avg_total,
                MAX(CASE WHEN g.stage_type IN ({PO_SQL}) THEN g.raw_score + COALESCE(g.hcp, 0) END) AS best_game,

                SUM(CASE WHEN g.stage_type IN ({RR_SQL}) THEN 2 ELSE 0 END) AS rr_games,
                ROUND(CAST(SUM(CASE WHEN g.stage_type IN ({RR_SQL}) THEN g.raw_score + COALESCE(g.hcp, 0) END) AS REAL)
                      / NULLIF(SUM(CASE WHEN g.stage_type IN ({RR_SQL}) THEN 2 ELSE 0 END), 0), 1) AS rr_avg,

                SUM(CASE WHEN g.stage_type IN ({PO_SQL}) THEN 1 ELSE 0 END) AS po_games,
                ROUND(AVG(CASE WHEN g.stage_type IN ({PO_SQL}) THEN g.raw_score + COALESCE(g.hcp, 0) END), 1) AS po_avg
            FROM games g
            WHERE g.event = 'командный' AND g.team_id IS NOT NULL
              AND g.raw_score IS NOT NULL
            GROUP BY g.tournament_id, g.team_id
        )
        SELECT
            a.tournament_id,
            a.team_id,
            t.team_name,
            c.club_name,
            a.games_total,
            a.avg_total,
            a.best_game,
            a.rr_games, a.rr_avg,
            a.po_games, a.po_avg
        FROM agg a
        JOIN teams t ON t.team_id = a.team_id
        LEFT JOIN clubs c ON c.club_id = t.club_id;

        CREATE INDEX idx_vtt_tournament ON v_tournament_team(tournament_id);
        CREATE INDEX idx_vtt_team       ON v_tournament_team(team_id);
    """)
    conn.commit()

    cur.execute("SELECT COUNT(*) FROM v_tournament_team")
    n = cur.fetchone()[0]
    print(f"  ✓ {n} строк (турнир × команда)")


# ---------- Факт-витрины (для фильтруемых таблиц на фронте) ----------

# Разрешение программы масла для конкретной стадии.
# PTQ/VPTQ и весь ветеранский зачёт идут на PTQ-проге (если она задана),
# иначе — на основной. Остальное — основная прога турнира.
PATTERN_CASE = """
    CASE WHEN gm.stage_type IN ('PTQ','VPTQ') OR gm.event = 'ветераны'
         THEN COALESCE(t.oil_pattern_ptq_id, t.oil_pattern_id)
         ELSE t.oil_pattern_id
    END
"""


def build_player_facts(conn):
    """
    v_player_facts — зерно «игрок × турнир × стадия», только личный зачёт.
    Счёт с гандикапом (raw_score + hcp). Клуб — на момент турнира из
    player_club_history (не текущий). Фронт суммирует эти факты под фильтром.
    """
    print("→ v_player_facts")
    cur = conn.cursor()

    cur.executescript(f"""
        DROP TABLE IF EXISTS v_player_facts;

        CREATE TABLE v_player_facts AS
        SELECT
            gm.player_id      AS pid,
            gm.tournament_id  AS tid,
            t.season          AS season,
            gm.stage_type     AS st,
            c.club_name       AS club,
            COUNT(*)                       AS g,
            SUM(gm.raw_score + gm.hcp)     AS ss,
            MAX(gm.raw_score + gm.hcp)     AS bg,
            MIN(gm.raw_score + gm.hcp)     AS wg,
            {PATTERN_CASE}                 AS patt
        FROM games gm
        JOIN tournaments t           ON t.tournament_id = gm.tournament_id
        LEFT JOIN player_club_history pch
               ON pch.player_id = gm.player_id
              AND pch.tournament_id = gm.tournament_id
        LEFT JOIN clubs c            ON c.club_id = pch.club_id
        WHERE gm.event = 'личный' AND gm.player_id IS NOT NULL
          AND gm.raw_score IS NOT NULL
        GROUP BY gm.player_id, gm.tournament_id, gm.stage_type;

        CREATE INDEX idx_vpf_pid ON v_player_facts(pid);
    """)
    conn.commit()

    cur.execute("SELECT COUNT(*) FROM v_player_facts")
    print(f"  ✓ {cur.fetchone()[0]} строк (игрок × турнир × стадия)")


def build_team_facts(conn):
    """
    v_team_facts — зерно «команда × турнир × стадия», только командный зачёт.

    В RR строка games = сумма двух игроков за матч → считаем как 2 игры (g),
    ss хранит сумму (raw_score + hcp); средний на фронте = Σss / Σg даёт
    счёт на игрока. Лучшая/худшая берутся ТОЛЬКО из плей-офф стадий.
    """
    print("→ v_team_facts")
    cur = conn.cursor()

    cur.executescript(f"""
        DROP TABLE IF EXISTS v_team_facts;

        CREATE TABLE v_team_facts AS
        SELECT
            gm.team_id        AS teamid,
            gm.tournament_id  AS tid,
            t.season          AS season,
            gm.stage_type     AS st,
            SUM(CASE WHEN gm.stage_type IN ({RR_SQL}) THEN 2 ELSE 1 END) AS g,
            SUM(gm.raw_score + COALESCE(gm.hcp, 0))                      AS ss,
            MAX(CASE WHEN gm.stage_type IN ({PO_SQL}) THEN gm.raw_score + COALESCE(gm.hcp, 0) END) AS bg,
            MIN(CASE WHEN gm.stage_type IN ({PO_SQL}) THEN gm.raw_score + COALESCE(gm.hcp, 0) END) AS wg,
            {PATTERN_CASE}                                               AS patt
        FROM games gm
        JOIN tournaments t ON t.tournament_id = gm.tournament_id
        WHERE gm.event = 'командный' AND gm.team_id IS NOT NULL
          AND gm.raw_score IS NOT NULL
        GROUP BY gm.team_id, gm.tournament_id, gm.stage_type;

        CREATE INDEX idx_vtf_teamid ON v_team_facts(teamid);
    """)
    conn.commit()

    cur.execute("SELECT COUNT(*) FROM v_team_facts")
    print(f"  ✓ {cur.fetchone()[0]} строк (команда × турнир × стадия)")


# ---------- Main ----------

def main():
    print("=" * 60)
    print(f"Миграция MySQL bowling → SQLite ({SQLITE_PATH.name})")
    print("=" * 60)

    if SQLITE_PATH.exists():
        SQLITE_PATH.unlink()
        print(f"→ Удалил старый {SQLITE_PATH.name}")

    mysql_conn = connect_mysql()
    sqlite_conn = sqlite3.connect(SQLITE_PATH)

    try:
        create_sqlite_schema(sqlite_conn)

        copy_table(mysql_conn, sqlite_conn, "tournaments",
                   ["tournament_id", "name", "file_name", "year", "season", "stage",
                    "oil_pattern_id", "oil_pattern_ptq_id"])
        copy_table(mysql_conn, sqlite_conn, "oil_patterns",
                   ["id", "pattern_name", "distance_ft", "volume_ml", "ratio", "photo_file"])
        copy_table(mysql_conn, sqlite_conn, "clubs",
                   ["club_id", "club_name"])
        copy_table(mysql_conn, sqlite_conn, "players",
                   ["player_id", "full_name", "gender", "club_id", "hand"])
        copy_table(mysql_conn, sqlite_conn, "teams",
                   ["team_id", "team_name", "club_id"])
        copy_table(mysql_conn, sqlite_conn, "games",
                   ["game_id", "tournament_id", "player_id", "team_id", "match_id",
                    "stage_type", "group", "game_number", "raw_score", "hcp",
                    "created_at", "event"])
        copy_table(mysql_conn, sqlite_conn, "matches",
                   ["match_id", "tournament_id", "stage_type", "match_number",
                    "player1_id", "player2_id", "team1_id", "team2_id",
                    "score_str", "rolloff_p1", "rolloff_p2",
                    "winner_id", "winner_team_id", "N_qual1", "N_qual2", "event"])
        copy_table(mysql_conn, sqlite_conn, "player_club_history",
                   ["id", "player_id", "club_id", "tournament_id"])
        copy_table(mysql_conn, sqlite_conn, "player_team_history",
                   ["id", "player_id", "team_id", "tournament_id"])

        print()
        print("Строю витрины:")
        build_player_personal(sqlite_conn)
        build_team_stats(sqlite_conn)
        build_club_stats(sqlite_conn)
        build_rolloff_stats(sqlite_conn)
        build_tournament_personal(sqlite_conn)
        build_tournament_team(sqlite_conn)
        build_player_facts(sqlite_conn)
        build_team_facts(sqlite_conn)

        # Контрольные проверки
        print()
        print("Контрольные выборки:")
        cur = sqlite_conn.cursor()

        cur.execute("""
            SELECT player_name, games_total, avg_total, po_best
            FROM v_player_personal
            WHERE games_total >= 30
            ORDER BY avg_total DESC
            LIMIT 5
        """)
        print("\nТоп-5 игроков по среднему (≥30 игр):")
        print(f"{'Игрок':<35} {'Игр':>5} {'Сред':>8} {'Лучшая ПО':>12}")
        for row in cur.fetchall():
            print(f"{row[0]:<35} {row[1]:>5} {str(row[2]):>8} {str(row[3]):>12}")

        cur.execute("""
            SELECT team_name, club_name, games_total, avg_total
            FROM v_team_stats
            WHERE games_total >= 10
            ORDER BY avg_total DESC
            LIMIT 5
        """)
        print("\nТоп-5 команд:")
        print(f"{'Команда':<30} {'Клуб':<20} {'Игр':>5} {'Сред':>8}")
        for row in cur.fetchall():
            print(f"{str(row[0]):<30} {str(row[1]):<20} {row[2]:>5} {str(row[3]):>8}")

        cur.execute("""
            SELECT player_name, throws_count, throws_avg, winrate
            FROM v_player_rolloff
            WHERE matches_total >= 5
            ORDER BY throws_avg DESC
            LIMIT 5
        """)
        print("\nТоп-5 по среднему броску ролл-офф (≥5 матчей):")
        print(f"{'Игрок':<35} {'Бросков':>8} {'Сред':>6} {'Winrate':>8}")
        for row in cur.fetchall():
            print(f"{row[0]:<35} {row[1]:>8} {str(row[2]):>6} {str(row[3]) + '%':>8}")

        print(f"\n✓ Готово. Файл: {SQLITE_PATH}")

    finally:
        sqlite_conn.close()
        mysql_conn.close()


if __name__ == "__main__":
    main()