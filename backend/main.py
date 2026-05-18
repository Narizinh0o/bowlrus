"""
FastAPI-приложение для BowlRus.

Тонкие роуты поверх backend.queries. Сам runtime нужен только для локальной
разработки и для запуска scripts/export_to_json.py: на проде Vercel отдаёт
статические JSON-файлы, FastAPI там не работает.
"""

from __future__ import annotations

import sqlite3
from typing import Iterator

from fastapi import Depends, FastAPI, HTTPException, Path, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from backend import queries
from backend.db import UnknownSportError, get_conn, list_sports


app = FastAPI(
    title="BowlRus API",
    description="Локальный API поверх SQLite-витрин. На проде не используется.",
    version="1.2.0",
)

# CORS для локального фронта (Vite по умолчанию на 5173).
# На проде это не нужно — фронт читает статику с того же домена.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["GET"],
    allow_headers=["*"],
)


# ──────────────────────────────────────────────────────────────────────────
# Зависимости
# ──────────────────────────────────────────────────────────────────────────


def klb_conn() -> Iterator[sqlite3.Connection]:
    """Соединение к БД КЛБ на время запроса. Закрывается автоматически."""
    conn = get_conn("klb")
    try:
        yield conn
    finally:
        conn.close()


def chr_conn() -> Iterator[sqlite3.Connection]:
    """Соединение к БД ЧР на время запроса."""
    conn = get_conn("chr")
    try:
        yield conn
    finally:
        conn.close()


# ──────────────────────────────────────────────────────────────────────────
# Сервисные эндпоинты
# ──────────────────────────────────────────────────────────────────────────


@app.get("/", tags=["service"])
def root() -> dict:
    """Корень — чтобы сразу видеть, что сервер жив."""
    return {
        "service": "BowlRus API",
        "docs": "/docs",
        "sports": list_sports(),
    }


@app.get("/healthz", tags=["service"])
def healthz() -> dict:
    """Пинг — для самопроверки."""
    return {"status": "ok"}


@app.get("/api/sports", tags=["service"])
def get_sports() -> list[str]:
    """Список доступных спортов. Фронт использует на главной."""
    return list_sports()


# ──────────────────────────────────────────────────────────────────────────
# КЛБ — личный зачёт
# ──────────────────────────────────────────────────────────────────────────


@app.get("/api/klb/personal/players", tags=["klb-personal"])
def klb_personal_players(conn: sqlite3.Connection = Depends(klb_conn)) -> list[dict]:
    """Список игроков с агрегатами личного зачёта."""
    return queries.klb_personal_players(conn)


@app.get("/api/klb/personal/players/{player_id}", tags=["klb-personal"])
def klb_personal_player(
    player_id: int = Path(..., ge=1),
    conn: sqlite3.Connection = Depends(klb_conn),
) -> dict:
    """Карточка игрока: статистика + ролл-офф."""
    player = queries.klb_personal_player(conn, player_id)
    if player is None:
        raise HTTPException(status_code=404, detail="Player not found")
    return player


@app.get("/api/klb/personal/tournaments", tags=["klb-personal"])
def klb_personal_tournaments(conn: sqlite3.Connection = Depends(klb_conn)) -> list[dict]:
    """Список турниров."""
    return queries.klb_personal_tournaments(conn)


@app.get("/api/klb/personal/tournaments/{tournament_id}", tags=["klb-personal"])
def klb_personal_tournament(
    tournament_id: int = Path(..., ge=1),
    conn: sqlite3.Connection = Depends(klb_conn),
) -> dict:
    """Личные результаты конкретного турнира."""
    result = queries.klb_personal_tournament(conn, tournament_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return result


# ──────────────────────────────────────────────────────────────────────────
# КЛБ — командный зачёт
# ──────────────────────────────────────────────────────────────────────────


@app.get("/api/klb/team/teams", tags=["klb-team"])
def klb_team_teams(conn: sqlite3.Connection = Depends(klb_conn)) -> list[dict]:
    """Список команд."""
    return queries.klb_team_teams(conn)


@app.get("/api/klb/team/teams/{team_id}", tags=["klb-team"])
def klb_team_team(
    team_id: int = Path(..., ge=1),
    conn: sqlite3.Connection = Depends(klb_conn),
) -> dict:
    """Карточка команды: статистика + ролл-офф."""
    team = queries.klb_team_team(conn, team_id)
    if team is None:
        raise HTTPException(status_code=404, detail="Team not found")
    return team


@app.get("/api/klb/team/tournaments", tags=["klb-team"])
def klb_team_tournaments(conn: sqlite3.Connection = Depends(klb_conn)) -> list[dict]:
    """Турниры, где были командные результаты."""
    return queries.klb_team_tournaments(conn)


@app.get("/api/klb/team/tournaments/{tournament_id}", tags=["klb-team"])
def klb_team_tournament(
    tournament_id: int = Path(..., ge=1),
    conn: sqlite3.Connection = Depends(klb_conn),
) -> dict:
    """Командные результаты конкретного турнира."""
    result = queries.klb_team_tournament(conn, tournament_id)
    if result is None:
        raise HTTPException(status_code=404, detail="Tournament not found")
    return result


# ──────────────────────────────────────────────────────────────────────────
# КЛБ — клубы (общие для обоих режимов)
# ──────────────────────────────────────────────────────────────────────────


@app.get("/api/klb/clubs", tags=["klb-clubs"])
def klb_clubs(conn: sqlite3.Connection = Depends(klb_conn)) -> list[dict]:
    """Список клубов."""
    return queries.klb_clubs(conn)


@app.get("/api/klb/clubs/{club_id}", tags=["klb-clubs"])
def klb_club(
    club_id: int = Path(..., ge=1),
    conn: sqlite3.Connection = Depends(klb_conn),
) -> dict:
    """Карточка клуба: агрегаты + игроки + команды."""
    club = queries.klb_club(conn, club_id)
    if club is None:
        raise HTTPException(status_code=404, detail="Club not found")
    return club


# ──────────────────────────────────────────────────────────────────────────
# ЧР
# ──────────────────────────────────────────────────────────────────────────


@app.get("/api/chr/tournament", tags=["chr"])
def chr_tournament(conn: sqlite3.Connection = Depends(chr_conn)) -> dict:
    """Сводка по турниру ЧР: игроки, игры, общая сумма, среднее."""
    return queries.chr_tournament_summary(conn)


@app.get("/api/chr/events", tags=["chr"])
def chr_events(conn: sqlite3.Connection = Depends(chr_conn)) -> list[dict]:
    """Список зачётов ЧР с количеством игр."""
    return queries.chr_events(conn)


@app.get("/api/chr/players", tags=["chr"])
def chr_players(
    event: str | None = None,
    conn: sqlite3.Connection = Depends(chr_conn),
) -> list[dict]:
    """
    Список игроков ЧР.

    Без параметра — агрегат по всем играм (быстро, из витрины).
    С параметром event — срез по конкретному зачёту (пересчёт на лету).
    """
    if event is None:
        return queries.chr_players(conn)
    return queries.chr_players_by_event(conn, event)


@app.get("/api/chr/players/{player_id}", tags=["chr"])
def chr_player(
    player_id: int = Path(..., ge=1),
    conn: sqlite3.Connection = Depends(chr_conn),
) -> dict:
    """Карточка игрока ЧР: статистика + список всех игр."""
    player = queries.chr_player(conn, player_id)
    if player is None:
        raise HTTPException(status_code=404, detail="Player not found")
    return player


# ──────────────────────────────────────────────────────────────────────────
# Глобальные обработчики ошибок
# ──────────────────────────────────────────────────────────────────────────


@app.exception_handler(UnknownSportError)
def _unknown_sport_handler(_request, exc: UnknownSportError):
    """Если спорт неизвестен — 404, а не 500."""
    return JSONResponse(status_code=404, content={"detail": str(exc)})


@app.exception_handler(FileNotFoundError)
def _missing_db_handler(_request, exc: FileNotFoundError):
    """Если SQLite-файл отсутствует — 503, чтобы было видно, что миграция не запущена."""
    return JSONResponse(status_code=503, content={"detail": str(exc)})