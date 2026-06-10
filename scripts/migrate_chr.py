"""
Миграция данных Чемпионата России 2026 из MySQL в SQLite.

Что делает:
1. Подключается к локальной MySQL (russian_championship_2026).
2. Создаёт новый SQLite-файл data/chr2026.db.
3. Копирует таблицы: players, games, frames.
4. Строит индексы для скорости.
5. Строит витрину v_player_stats с готовыми агрегатами
   (страйки %, спэа %, single pin % и т.д.).

Запуск:
    python scripts/migrate_chr.py
"""

import os
import sqlite3
import sys
from pathlib import Path

import mysql.connector
from dotenv import load_dotenv

# ---------- Настройки ----------

# Корень проекта = на уровень выше папки scripts
ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = ROOT / "data"
DATA_DIR.mkdir(exist_ok=True)
SQLITE_PATH = DATA_DIR / "chr2026.db"

# Загружаем .env из корня проекта
load_dotenv(ROOT / ".env")

MYSQL_CONFIG = {
    "host": os.getenv("MYSQL_HOST", "localhost"),
    "port": int(os.getenv("MYSQL_PORT", 3306)),
    "user": os.getenv("MYSQL_USER", "root"),
    "password": os.getenv("MYSQL_PASSWORD", ""),
    "database": os.getenv("MYSQL_DATABASE", "russian_championship_2026"),
    "charset": "utf8mb4",
}


# ---------- Шаги миграции ----------

def connect_mysql():
    print(f"→ Подключаюсь к MySQL: {MYSQL_CONFIG['user']}@{MYSQL_CONFIG['host']}:{MYSQL_CONFIG['port']}/{MYSQL_CONFIG['database']}")
    try:
        conn = mysql.connector.connect(**MYSQL_CONFIG)
        print("  ✓ Подключение установлено")
        return conn
    except mysql.connector.Error as e:
        print(f"  ✗ Ошибка подключения: {e}")
        sys.exit(1)


def create_sqlite_schema(sqlite_conn):
    print("→ Создаю схему в SQLite")
    cur = sqlite_conn.cursor()

    cur.executescript("""
        DROP TABLE IF EXISTS frames;
        DROP TABLE IF EXISTS games;
        DROP TABLE IF EXISTS players;
        DROP VIEW IF EXISTS v_player_stats;
        DROP TABLE IF EXISTS v_player_stats;

        CREATE TABLE players (
            player_id   INTEGER PRIMARY KEY,
            player_name TEXT NOT NULL,
            gender      TEXT,
            sport_rank  TEXT,
            region      TEXT
        );

        -- lane / time_* / play_date допускают NULL: у зачёта 'single' нет
        -- дорожки и времени (только результат), дата проставлена не у всех.
        CREATE TABLE games (
            game_id      INTEGER PRIMARY KEY,
            player_name  TEXT NOT NULL,
            player_id    INTEGER,
            lane         INTEGER,
            game_number  INTEGER NOT NULL,
            play_date    TEXT,
            time_start   TEXT,
            time_end     TEXT,
            total_score  INTEGER NOT NULL,
            event        TEXT
        );

        CREATE TABLE frames (
            game_id      INTEGER NOT NULL,
            frame_number INTEGER NOT NULL,
            content      TEXT NOT NULL,
            PRIMARY KEY (game_id, frame_number)
        );

        CREATE INDEX idx_games_player ON games(player_id);
        CREATE INDEX idx_games_event  ON games(event);
        CREATE INDEX idx_games_date   ON games(play_date);
    """)

    sqlite_conn.commit()
    print("  ✓ Схема создана")


def copy_table(mysql_conn, sqlite_conn, table, columns, where=None):
    """
    Копирует таблицу из MySQL в SQLite. Перед вставкой конвертирует
    типы, которые SQLite не понимает (date, time, timedelta, Decimal).

    where: опциональное условие WHERE (без слова WHERE), например
           "event IN ('doubles', 'doubles mix')".
    """
    import datetime
    from decimal import Decimal

    label = f"{table} (WHERE {where})" if where else table
    print(f"→ Копирую таблицу {label}")
    mysql_cur = mysql_conn.cursor()
    sqlite_cur = sqlite_conn.cursor()

    col_list = ", ".join(columns)
    placeholders = ", ".join(["?"] * len(columns))

    sql = f"SELECT {col_list} FROM {table}"
    if where:
        sql += f" WHERE {where}"
    mysql_cur.execute(sql)
    rows = mysql_cur.fetchall()

    def convert(value):
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

    converted_rows = [tuple(convert(v) for v in row) for row in rows]

    sqlite_cur.executemany(
        f"INSERT INTO {table} ({col_list}) VALUES ({placeholders})",
        converted_rows,
    )
    sqlite_conn.commit()

    print(f"  ✓ Скопировано строк: {len(rows)}")


def build_player_stats_view(sqlite_conn):
    """
    Считает агрегаты по каждому игроку и сохраняет как материализованную
    таблицу v_player_stats. Логика взята из твоего рабочего MySQL-запроса.

    SQLite не поддерживает REGEXP по умолчанию, поэтому single pin spare
    мы определяем явными условиями на первый символ контента.
    """
    print("→ Считаю витрину v_player_stats")
    cur = sqlite_conn.cursor()

    cur.executescript("""
        DROP TABLE IF EXISTS v_player_stats;

        CREATE TABLE v_player_stats AS
        /*
          Игровые агрегаты (средний, кол-во игр, лучшая/худшая) считаются из
          games НАПРЯМУЮ — по всем играм, включая 'single' без фреймов.
          Фреймовые агрегаты (страйки/спэа/одиночки) считаются ОТДЕЛЬНО только
          по играм, где есть фреймы, и приджойниваются. Так зачёт без фреймов
          не искажает проценты, а зачёт с фреймами — не «весит» больше в среднем.
        */
        WITH frame_stats AS (
            SELECT
                g.event,
                g.player_id,
                f.frame_number,
                REPLACE(f.content, 'S', '') AS frame_content,

                /* Количество страйков в фрейме */
                CASE
                    WHEN f.frame_number BETWEEN 1 AND 9 AND REPLACE(f.content, 'S', '') = 'X'
                        THEN 1
                    WHEN f.frame_number = 10
                        THEN length(REPLACE(f.content, 'S', '')) - length(replace(REPLACE(f.content, 'S', ''), 'X', ''))
                    ELSE 0
                END AS strikes_count,

                /* Количество спэа в фрейме */
                CASE
                    WHEN f.frame_number BETWEEN 1 AND 9
                         AND length(REPLACE(f.content, 'S', '')) = 2
                         AND substr(REPLACE(f.content, 'S', ''), 2, 1) = '/'
                        THEN 1
                    WHEN f.frame_number = 10
                        THEN length(REPLACE(f.content, 'S', '')) - length(replace(REPLACE(f.content, 'S', ''), '/', ''))
                    ELSE 0
                END AS spares_count,

                /* Открытый фрейм (ни страйка, ни спэа) */
                CASE
                    WHEN f.frame_number BETWEEN 1 AND 9
                         AND REPLACE(f.content, 'S', '') <> 'X'
                         AND NOT (length(REPLACE(f.content, 'S', '')) = 2 AND substr(REPLACE(f.content, 'S', ''), 2, 1) = '/')
                        THEN 1
                    WHEN f.frame_number = 10
                         AND (
                            (substr(REPLACE(f.content, 'S', ''), 1, 1) <> 'X'
                             AND substr(REPLACE(f.content, 'S', ''), 2, 1) <> '/')
                            OR
                            (substr(REPLACE(f.content, 'S', ''), 1, 1) = 'X'
                             AND substr(REPLACE(f.content, 'S', ''), 2, 1) <> 'X'
                             AND substr(REPLACE(f.content, 'S', ''), 3, 1) <> '/')
                         )
                        THEN 1
                    ELSE 0
                END AS opens_count,

                /* Количество попыток страйка */
                CASE
                    WHEN f.frame_number BETWEEN 1 AND 9
                        THEN 1
                    WHEN f.frame_number = 10
                         AND substr(REPLACE(f.content, 'S', ''), 1, 1) = 'X'
                         AND substr(REPLACE(f.content, 'S', ''), 2, 1) = 'X'
                        THEN 3
                    WHEN f.frame_number = 10
                         AND substr(REPLACE(f.content, 'S', ''), 1, 1) = 'X'
                         AND substr(REPLACE(f.content, 'S', ''), 2, 1) <> 'X'
                        THEN 2
                    WHEN f.frame_number = 10
                         AND substr(REPLACE(f.content, 'S', ''), 1, 1) <> 'X'
                         AND substr(REPLACE(f.content, 'S', ''), 2, 1) <> '/'
                        THEN 1
                    WHEN f.frame_number = 10
                         AND substr(REPLACE(f.content, 'S', ''), 1, 1) <> 'X'
                         AND substr(REPLACE(f.content, 'S', ''), 2, 1) = '/'
                        THEN 2
                    ELSE 0
                END AS strike_attempts,

                /* Single pin spare — остался один кегль (9 + что-то) */
                CASE
                    WHEN f.frame_number BETWEEN 1 AND 9
                         AND substr(REPLACE(f.content, 'S', ''), 1, 1) = '9'
                         AND length(REPLACE(f.content, 'S', '')) = 2
                         AND substr(REPLACE(f.content, 'S', ''), 2, 1) IN ('-', '/', 'F')
                        THEN 1
                    WHEN f.frame_number = 10
                         AND (
                             (substr(REPLACE(f.content, 'S', ''), 1, 1) = '9'
                              AND substr(REPLACE(f.content, 'S', ''), 2, 1) IN ('-', '/', 'F'))
                             OR
                             (substr(REPLACE(f.content, 'S', ''), 1, 1) = 'X'
                              AND substr(REPLACE(f.content, 'S', ''), 2, 1) = '9'
                              AND substr(REPLACE(f.content, 'S', ''), 3, 1) IN ('-', '/', 'F'))
                         )
                        THEN 1
                    ELSE 0
                END AS singles_left,

                /* Из single pin — закрытые (9/) */
                CASE
                    WHEN f.frame_number BETWEEN 1 AND 9
                         AND substr(REPLACE(f.content, 'S', ''), 1, 1) = '9'
                         AND substr(REPLACE(f.content, 'S', ''), 2, 1) = '/'
                        THEN 1
                    WHEN f.frame_number = 10
                         AND (
                             (substr(REPLACE(f.content, 'S', ''), 1, 1) = '9'
                              AND substr(REPLACE(f.content, 'S', ''), 2, 1) = '/')
                             OR
                             (substr(REPLACE(f.content, 'S', ''), 1, 1) = 'X'
                              AND substr(REPLACE(f.content, 'S', ''), 2, 1) = '9'
                              AND substr(REPLACE(f.content, 'S', ''), 3, 1) = '/')
                         )
                        THEN 1
                    ELSE 0
                END AS singles_converted

            FROM frames f
            JOIN games g ON g.game_id = f.game_id
        ),
        frame_agg AS (
            SELECT
                player_id,
                COUNT(DISTINCT event)                  AS blocks_with_frames,
                SUM(strike_attempts)                   AS strike_attempts,
                SUM(strikes_count)                     AS strikes,
                ROUND(CAST(SUM(strikes_count) AS REAL) * 100.0
                      / NULLIF(SUM(strike_attempts), 0), 2)        AS strike_percent,
                SUM(spares_count)                      AS spares,
                SUM(opens_count)                       AS opens,
                ROUND(CAST(SUM(spares_count) AS REAL) * 100.0
                      / NULLIF(SUM(spares_count) + SUM(opens_count), 0), 2) AS spare_conversion_percent,
                SUM(singles_left)                      AS singles_left,
                SUM(singles_converted)                 AS singles_converted,
                ROUND(CAST(SUM(singles_converted) AS REAL) * 100.0
                      / NULLIF(SUM(singles_left), 0), 2)           AS single_pin_percent
            FROM frame_stats
            GROUP BY player_id
        ),
        game_agg AS (
            SELECT
                player_id,
                MAX(player_name)                       AS player_name,
                COUNT(DISTINCT event)                  AS events_played,
                COUNT(DISTINCT game_id)                AS games_played,
                SUM(total_score)                       AS total_pins,
                ROUND(AVG(total_score), 2)             AS average_score,
                MAX(total_score)                       AS best_game,
                MIN(total_score)                       AS worst_game,
                MAX(total_score) - MIN(total_score)    AS score_diff
            FROM games
            GROUP BY player_id
        )
        SELECT
            ga.player_id,
            ga.player_name,
            ga.events_played,
            ga.games_played,
            ga.total_pins,
            ga.average_score,
            ga.best_game,
            ga.worst_game,
            ga.score_diff,

            COALESCE(fa.strike_attempts, 0)            AS strike_attempts,
            COALESCE(fa.strikes, 0)                    AS strikes,
            fa.strike_percent                          AS strike_percent,
            COALESCE(fa.spares, 0)                     AS spares,
            COALESCE(fa.opens, 0)                      AS opens,
            fa.spare_conversion_percent                AS spare_conversion_percent,
            COALESCE(fa.singles_left, 0)               AS singles_left,
            COALESCE(fa.singles_converted, 0)          AS singles_converted,
            COALESCE(fa.singles_left, 0) - COALESCE(fa.singles_converted, 0) AS singles_missed,
            fa.single_pin_percent                      AS single_pin_percent,
            COALESCE(fa.blocks_with_frames, 0)         AS blocks_with_frames,

            p.gender                                   AS gender,
            p.sport_rank                               AS sport_rank,
            p.region                                   AS region

        FROM game_agg ga
        LEFT JOIN frame_agg  fa ON fa.player_id = ga.player_id
        LEFT JOIN players    p  ON p.player_id  = ga.player_id;

        CREATE INDEX idx_vps_player ON v_player_stats(player_id);
    """)

    sqlite_conn.commit()

    cur.execute("SELECT COUNT(*) FROM v_player_stats")
    n = cur.fetchone()[0]
    print(f"  ✓ Витрина построена: {n} игроков")


# ---------- Main ----------

def main():
    print("=" * 60)
    print(f"Миграция MySQL → SQLite ({SQLITE_PATH.name})")
    print("=" * 60)

    if SQLITE_PATH.exists():
        SQLITE_PATH.unlink()
        print(f"→ Удалил старый файл {SQLITE_PATH.name}")

    mysql_conn = connect_mysql()
    sqlite_conn = sqlite3.connect(SQLITE_PATH)

    try:
        create_sqlite_schema(sqlite_conn)

        # Зачёты, которые попадают на сайт. 'single' (личный) теперь полноценный
        # зачёт с результатами; фреймы есть только у Сазонова (3 блок).
        PUBLIC_EVENTS_SQL = "event IN ('doubles', 'doubles mix', 'single')"

        copy_table(mysql_conn, sqlite_conn, "players",
                   ["player_id", "player_name", "gender", "sport_rank", "region"])
        copy_table(mysql_conn, sqlite_conn, "games",
                   ["game_id", "player_name", "player_id", "lane",
                    "game_number", "play_date", "time_start", "time_end",
                    "total_score", "event"],
                   where=PUBLIC_EVENTS_SQL)
        # Фреймы — только тех игр, что прошли фильтр.
        copy_table(mysql_conn, sqlite_conn, "frames",
                   ["game_id", "frame_number", "content"],
                   where=f"game_id IN (SELECT game_id FROM games WHERE {PUBLIC_EVENTS_SQL})")

        build_player_stats_view(sqlite_conn)

        # Маленький контрольный запрос
        cur = sqlite_conn.cursor()
        cur.execute("""
            SELECT player_name, games_played, average_score, strike_percent
            FROM v_player_stats
            ORDER BY strike_percent DESC
            LIMIT 5
        """)
        print("\nТоп-5 по % страйков (контрольная выборка):")
        print(f"{'Игрок':<30} {'Игр':>5} {'Сред':>8} {'%X':>8}")
        for row in cur.fetchall():
            print(f"{row[0]:<30} {row[1]:>5} {row[2]:>8} {row[3]:>8}")

        print(f"\n✓ Готово. Файл: {SQLITE_PATH}")

    finally:
        sqlite_conn.close()
        mysql_conn.close()


if __name__ == "__main__":
    main()