"""
Экспортирует все эндпоинты backend API в статические JSON-файлы.

После выполнения файлы лежат в frontend/public/data/ и могут
быть напрямую загружены фронтендом без работающего backend.

Использование:
    1. Запусти backend: uvicorn backend.main:app --reload
    2. В другом терминале: python scripts/export_to_json.py
"""

import json
import sys
from pathlib import Path

import requests

API_URL = "http://127.0.0.1:8000"

ROOT = Path(__file__).resolve().parent.parent
OUT_DIR = ROOT / "frontend" / "public" / "data"


def fetch(endpoint):
    print(f"  → GET {endpoint}")
    response = requests.get(f"{API_URL}{endpoint}", timeout=30)
    response.raise_for_status()
    return response.json()


def save(filename, data):
    path = OUT_DIR / filename
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, separators=(",", ":"))
    size_kb = path.stat().st_size / 1024
    print(f"    ✓ {filename} ({size_kb:.1f} KB)")


def main():
    print("=" * 60)
    print(f"Экспорт API → {OUT_DIR}")
    print("=" * 60)

    # Проверяем что backend жив
    try:
        requests.get(f"{API_URL}/", timeout=3)
    except requests.exceptions.RequestException:
        print(f"✗ Не могу подключиться к {API_URL}")
        print("  Запусти сначала backend: uvicorn backend.main:app --reload")
        sys.exit(1)

    # Чистим папку перед экспортом
    if OUT_DIR.exists():
        for item in OUT_DIR.rglob("*"):
            if item.is_file():
                item.unlink()
        print(f"→ Очистил старые файлы из {OUT_DIR.name}/")

    # Основные эндпоинты
    print("\n→ Экспорт основных данных:")

    tournament = fetch("/api/tournament")
    save("tournament.json", tournament)

    events = fetch("/api/events")
    save("events.json", events)

    # Игроки — три варианта: все, doubles, doubles mix
    players_all = fetch("/api/players")
    save("players.json", players_all)

    players_doubles = fetch("/api/players?event=doubles")
    save("players_doubles.json", players_doubles)

    players_doubles_mix = fetch("/api/players?event=doubles mix")
    save("players_doubles_mix.json", players_doubles_mix)

    # Карточки игроков
    print(f"\n→ Экспорт карточек игроков ({len(players_all)} шт.):")

    players_dir = OUT_DIR / "players"
    players_dir.mkdir(parents=True, exist_ok=True)

    for i, player in enumerate(players_all, 1):
        player_id = player["player_id"]
        try:
            data = fetch(f"/api/players/{player_id}")
            save(f"players/{player_id}.json", data)
        except Exception as e:
            print(f"    ✗ Игрок {player_id}: {e}")

    print(f"\n✓ Готово. Экспортировано {len(players_all)} игроков.")
    print(f"  Папка: {OUT_DIR}")


if __name__ == "__main__":
    main()