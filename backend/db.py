"""
Реестр спортов и подключение к SQLite.

Один спорт = одна SQLite-база. Здесь — единственное место, где задаются пути
к базам. Если добавляем новый спорт (например, Кубок России), достаточно
добавить строчку в SPORTS.
"""

from __future__ import annotations

import sqlite3
from pathlib import Path

# Корень репозитория (на два уровня выше этого файла: backend/db.py → backend → корень)
ROOT = Path(__file__).resolve().parent.parent

# Реестр спортов: ключ — короткий код спорта в URL, значение — путь к SQLite-файлу.
SPORTS: dict[str, Path] = {
    "klb": ROOT / "data" / "klb.db",
    "chr": ROOT / "data" / "chr2026.db",
}


class UnknownSportError(Exception):
    """Спорт не зарегистрирован в SPORTS."""


def get_conn(sport: str) -> sqlite3.Connection:
    """
    Открыть соединение к SQLite-базе нужного спорта.

    - row_factory = sqlite3.Row, чтобы из курсора можно было сразу делать dict(row).
    - Открываем в режиме read-only (?mode=ro) через URI: данные мы трогаем
      только миграцией, runtime их не меняет.
    """
    if sport not in SPORTS:
        raise UnknownSportError(f"Unknown sport: {sport!r}. Known: {list(SPORTS)}")

    db_path = SPORTS[sport]
    if not db_path.exists():
        raise FileNotFoundError(
            f"SQLite-файл для спорта {sport!r} не найден: {db_path}. "
            f"Сначала запусти миграцию (scripts/migrate_{sport}.py)."
        )

    uri = f"file:{db_path}?mode=ro"
    conn = sqlite3.connect(uri, uri=True)
    conn.row_factory = sqlite3.Row
    return conn


def list_sports() -> list[str]:
    """Список доступных спортов — для /api/sports."""
    return list(SPORTS.keys())