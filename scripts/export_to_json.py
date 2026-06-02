"""
Экспорт SQLite-витрин в статические JSON-файлы для фронта.

Запуск из корня репо:
    python scripts/export_to_json.py

Что делает:
    Для каждого спорта из реестра SPORTS вызывает свой экспортёр, который
    дёргает функции из backend.queries (без HTTP) и пишет JSON-файлы в
    frontend/public/data/<sport>/. Запись идёт через временную папку
    *.staging, потом атомарной подменой заменяет старую — поэтому
    прерванный экспорт не оставит фронт с полупустыми данными.

Структура вывода:
    frontend/public/data/
    ├── klb/
    │   ├── meta.json
    │   ├── personal/
    │   │   ├── players.json
    │   │   ├── players/{id}.json
    │   │   ├── tournaments.json
    │   │   └── tournaments/{id}.json
    │   ├── team/
    │   │   ├── teams.json
    │   │   ├── teams/{id}.json
    │   │   ├── tournaments.json
    │   │   └── tournaments/{id}.json
    │   ├── clubs.json
    │   └── clubs/{id}.json
    └── chr/
        ├── meta.json
        ├── tournament.json
        ├── events.json
        ├── players.json
        └── players/{id}.json
"""

from __future__ import annotations

import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

# Добавляем корень репо в sys.path, чтобы импорт backend.* работал
# при запуске `python scripts/export_to_json.py` из корня.
ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from backend import queries  # noqa: E402
from backend.db import SPORTS, get_conn  # noqa: E402


# Корневая папка для всех JSON
OUTPUT_ROOT = ROOT / "frontend" / "public" / "data"


# ──────────────────────────────────────────────────────────────────────────
# Утилиты записи
# ──────────────────────────────────────────────────────────────────────────


def write_json(path: Path, data) -> None:
    """Записать JSON с отступами, кириллицей и созданием папок при необходимости."""
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)


def replace_dir(target: Path, staging: Path) -> None:
    """Атомарно подменить target папкой staging."""
    if target.exists():
        shutil.rmtree(target)
    staging.rename(target)


# ──────────────────────────────────────────────────────────────────────────
# Экспорт КЛБ
# ──────────────────────────────────────────────────────────────────────────


def export_klb(out_dir: Path) -> dict:
    """Сгенерировать JSON-дерево для КЛБ. Возвращает счётчики для meta.json."""
    conn = get_conn("klb")
    try:
        counts = {}
        
         # Количество уникальных сезонов — для отображения на главной странице
        seasons_row = conn.execute(
            "SELECT COUNT(DISTINCT year || '-' || season) AS n FROM tournaments"
        ).fetchone()
        counts["seasons"] = seasons_row["n"]


        # ── Личный зачёт ─────────────────────────────────────────
        print("    личный зачёт: игроки...")
        players = queries.klb_personal_players(conn)
        write_json(out_dir / "personal" / "players.json", players)
        counts["personal_players"] = len(players)

        for p in players:
            card = queries.klb_personal_player(conn, p["player_id"])
            write_json(
                out_dir / "personal" / "players" / f"{p['player_id']}.json",
                card,
            )

        print("    личный зачёт: турниры...")
        personal_tournaments = queries.klb_personal_tournaments(conn)
        write_json(out_dir / "personal" / "tournaments.json", personal_tournaments)
        counts["personal_tournaments"] = len(personal_tournaments)

        for t in personal_tournaments:
            card = queries.klb_personal_tournament(conn, t["tournament_id"])
            write_json(
                out_dir / "personal" / "tournaments" / f"{t['tournament_id']}.json",
                card,
            )

        # ── Командный зачёт ──────────────────────────────────────
        print("    командный зачёт: команды...")
        teams = queries.klb_team_teams(conn)
        write_json(out_dir / "team" / "teams.json", teams)
        counts["teams"] = len(teams)

        for t in teams:
            card = queries.klb_team_team(conn, t["team_id"])
            write_json(out_dir / "team" / "teams" / f"{t['team_id']}.json", card)

        print("    командный зачёт: турниры...")
        team_tournaments = queries.klb_team_tournaments(conn)
        write_json(out_dir / "team" / "tournaments.json", team_tournaments)
        counts["team_tournaments"] = len(team_tournaments)

        for t in team_tournaments:
            card = queries.klb_team_tournament(conn, t["tournament_id"])
            write_json(
                out_dir / "team" / "tournaments" / f"{t['tournament_id']}.json",
                card,
            )

        # ── Клубы ────────────────────────────────────────────────
        print("    клубы...")
        clubs = queries.klb_clubs(conn)
        write_json(out_dir / "clubs.json", clubs)
        counts["clubs"] = len(clubs)

        for c in clubs:
            card = queries.klb_club(conn, c["club_id"])
            write_json(out_dir / "clubs" / f"{c['club_id']}.json", card)

        # ── Факт-витрины + справочники (фильтруемые таблицы) ─────
        print("    факты + справочники...")
        player_facts = queries.klb_player_facts(conn)
        write_json(out_dir / "player_facts.json", player_facts)
        counts["player_facts"] = len(player_facts)

        team_facts = queries.klb_team_facts(conn)
        write_json(out_dir / "team_facts.json", team_facts)
        counts["team_facts"] = len(team_facts)

        # patterns.json — словарь {id: {...}}; путь к фото собираем здесь.
        patterns = {
            str(p["id"]): {
                "name": p["pattern_name"],
                "length": p["distance_ft"],
                "volume": p["volume_ml"],
                "ratio": p["ratio"],
                "photo": f"/data/klb/patterns/{p['photo_file']}" if p["photo_file"] else None,
            }
            for p in queries.klb_patterns(conn)
        }
        write_json(out_dir / "patterns.json", patterns)
        counts["patterns"] = len(patterns)

        # tournaments.json — словарь {tid: {...}}
        tournaments = {
            str(t["tournament_id"]): {
                "name": t["name"],
                "year": t["year"],
                "season": t["season"],
                # seq — монотонный хронологический порядок турнира:
                # season*100 + stage (stage = порядковый номер внутри сезона,
                # грандфинал = 8). Нужен, т.к. tournament_id не по времени.
                "seq": (t["season"] or 0) * 100 + (t["stage"] or 0),
                "main": t["main"],
                "ptq": t["ptq"],
            }
            for t in queries.klb_tournaments_meta(conn)
        }
        write_json(out_dir / "tournaments.json", tournaments)

        # players_lookup.json — словарь {pid: {...}}
        players_lookup = {
            str(p["player_id"]): {"name": p["name"], "gender": p["gender"], "hand": p["hand"]}
            for p in queries.klb_players_lookup(conn)
        }
        write_json(out_dir / "players_lookup.json", players_lookup)

        # teams_lookup.json — словарь {teamid: {...}}
        teams_lookup = {
            str(t["team_id"]): {"name": t["name"], "club": t["club"]}
            for t in queries.klb_teams_lookup(conn)
        }
        write_json(out_dir / "teams_lookup.json", teams_lookup)

        return counts
    finally:
        conn.close()


# ──────────────────────────────────────────────────────────────────────────
# Экспорт ЧР
# ──────────────────────────────────────────────────────────────────────────


# Метаданные турнира ЧР — конфигурация, не данные. Раньше жили в backend/main.py
# в TOURNAMENT_INFO; теперь здесь, в точке генерации JSON.
CHR_TOURNAMENT_META = {
    "name": "Чемпионат России 2026",
    "date_start": "2026-05-02",
    "date_end": "2026-05-07",
    "slug": "chr2026",
}


def export_chr(out_dir: Path) -> dict:
    """Сгенерировать JSON-дерево для ЧР."""
    conn = get_conn("chr")
    try:
        counts = {}

        print("    турнир + сводка...")
        summary = queries.chr_tournament_summary(conn)
        write_json(
            out_dir / "tournament.json",
            {**CHR_TOURNAMENT_META, "summary": summary},
        )

        print("    зачёты...")
        events = queries.chr_events(conn)
        write_json(out_dir / "events.json", events)
        counts["events"] = len(events)

        print("    игроки (агрегат)...")
        players = queries.chr_players(conn)
        write_json(out_dir / "players.json", players)
        counts["players"] = len(players)

        # Срезы по зачётам: для каждого event пишем отдельный JSON.
        # Фронт переключает источник одной строчкой при клике на фильтр.
        for event_row in events:
            event_name = event_row["event"]
            # Имя файла: 'doubles' → players_doubles.json, 'doubles mix' → players_doubles_mix.json
            safe_name = event_name.replace(" ", "_")
            print(f"    игроки (срез: {event_name})...")
            sliced = queries.chr_players_by_event(conn, event_name)
            write_json(out_dir / f"players_{safe_name}.json", sliced)

        print("    карточки игроков...")
        for p in players:
            card = queries.chr_player(conn, p["player_id"])
            write_json(out_dir / "players" / f"{p['player_id']}.json", card)
            
        print("    карточки игр...")
        game_id_rows = conn.execute(
            "SELECT game_id FROM games ORDER BY game_id"
        ).fetchall()
        game_ids = [row["game_id"] for row in game_id_rows]
        counts["games"] = len(game_ids)

        for gid in game_ids:
            card = queries.chr_game(conn, gid)
            write_json(out_dir / "games" / f"{gid}.json", card)
        return counts
    finally:
        conn.close()


# ──────────────────────────────────────────────────────────────────────────
# Главная процедура
# ──────────────────────────────────────────────────────────────────────────


SPORT_EXPORTERS = {
    "klb": export_klb,
    "chr": export_chr,
}


def export_sport(sport: str) -> None:
    """Экспорт одного спорта с атомарной подменой папки."""
    if sport not in SPORT_EXPORTERS:
        print(f"  [skip] {sport}: нет экспортёра")
        return

    db_path = SPORTS[sport]
    if not db_path.exists():
        print(f"  [skip] {sport}: SQLite-файл не найден ({db_path})")
        return

    target = OUTPUT_ROOT / sport
    staging = OUTPUT_ROOT / f"{sport}.staging"

    # На случай, если предыдущий запуск упал и оставил staging
    if staging.exists():
        shutil.rmtree(staging)
    staging.mkdir(parents=True)

    print(f"\n[{sport}] экспорт в {staging.name}/")
    counts = SPORT_EXPORTERS[sport](staging)

    # meta.json: фиксируем момент генерации и счётчики
    meta = {
        "sport": sport,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "db_mtime": datetime.fromtimestamp(
            db_path.stat().st_mtime, tz=timezone.utc
        ).isoformat(),
        "counts": counts,
    }
    write_json(staging / "meta.json", meta)

    # Атомарная подмена
    replace_dir(target, staging)
    print(f"[{sport}] готово: {counts}")


def main() -> None:
    print("=" * 60)
    print(f"Экспорт SQLite → JSON")
    print(f"Назначение: {OUTPUT_ROOT}")
    print("=" * 60)

    OUTPUT_ROOT.mkdir(parents=True, exist_ok=True)

    for sport in SPORTS:
        export_sport(sport)

    print("\n" + "=" * 60)
    print("Готово.")


if __name__ == "__main__":
    main()