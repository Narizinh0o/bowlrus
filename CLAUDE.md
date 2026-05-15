markdown# BowlRus Stats — контекст проекта

## Что это

Сайт со статистикой турниров по боулингу. Public production: https://bowlrus.vercel.app

Владелец проекта — Анастасия (Анастасия не программист, но владеет базовыми концепциями; на Python ориентируется лучше, чем на JS). Все объяснения — на русском. Тон — дружелюбный наставник, без снисходительности.

## Текущее состояние

- В работе одна БД: **ЧР 2026** (`russian_championship_2026`, 196 игроков, 2094 игр, 20940 фреймов).
- Сайт работает на статических JSON-файлах, без живого backend.
- Следующая большая задача: подключение **Лиги** (8-9 таблиц, отдельная MySQL-БД, тестовый функционал).
- Парные соревнования: парная статистика не нужна, только индивидуальная.

## Архитектура
MySQL (локально) → SQLite (data/chr2026.db) → JSON (frontend/public/data/) → React (Vercel)
↑              ↑                            ↑                          ↑
рабочая БД    миграция                  экспорт через                    публично
владельца    + витрины                  работающий backend

**Ключевой принцип:** наружу попадает только то, что прошло через витрины и экспорт. Чувствительные поля остаются в MySQL и физически не покидают ноут.

## Структура папок
bowlrus/
├── backend/
│   ├── init.py
│   └── main.py             # FastAPI, 4 эндпоинта
├── frontend/
│   ├── public/data/        # ← JSON-файлы для production
│   ├── src/
│   │   ├── api/client.ts   # fetch() для JSON-файлов
│   │   ├── pages/          # HomePage, PlayersPage, PlayerPage, TournamentPage
│   │   ├── components/Layout.tsx
│   │   └── types/index.ts
│   ├── vercel.json         # SPA fallback rewrite
│   └── package.json
├── scripts/
│   ├── migrate_chr.py      # MySQL → SQLite + витрина
│   └── export_to_json.py   # SQLite (через API) → JSON
├── data/
│   └── chr2026.db          # SQLite (в .gitignore)
└── .env                    # MYSQL_* пароли (в .gitignore)

## Стек

- **Backend:** Python 3.10, FastAPI, uvicorn, mysql-connector-python, sqlite3.
- **Frontend:** Vite + React 18 + TypeScript + Tailwind CSS v3 + React Router v6 + Recharts.
- **Хостинг:** Vercel (Hobby tier, Personal Project).
- **БД для прода:** SQLite-файл, экспортируемый в JSON (read-only).
- **Git:** ветка main, репозиторий https://github.com/Narizinh0o/bowlrus (public).

## Как запускать локально

```powershell
# Backend (нужен только для регенерации JSON)
uvicorn backend.main:app --reload

# Frontend
cd frontend
npm run dev
```

## Workflow обновления данных

1. Внести данные в MySQL Workbench.
2. `python scripts/migrate_chr.py` (пересоздаёт `chr2026.db` + витрины).
3. `uvicorn backend.main:app --reload` (в одном терминале).
4. `python scripts/export_to_json.py` (в другом терминале, генерит JSON).
5. `git add . && git commit -m "Update data" && git push` — Vercel сам передеплоит за 1-2 минуты.

## Витрина v_player_stats (логика)

Считается из таблицы `frames` в `migrate_chr.py`. Формулы взяты из рабочего MySQL-запроса владельца. Главные поля:

- **strike_attempts** — попытки страйка с учётом 10-го фрейма (может быть 1, 2 или 3).
- **strike_percent** — `strikes / strike_attempts * 100`.
- **spare_conversion_percent** — `spares / (spares + opens) * 100` (только когда был шанс).
- **single_pin_percent** — `singles_converted / singles_left * 100` (9 + закрытие vs 9 + промах).
- `S` в начале `content` нормализуется (удаляется) — это правки оператора, а не сплиты.

## Формат фреймов (frames.content, varchar(8))

- `X` — страйк, `/` — спэа, `-` — промах, `F` — заступ, цифры — кегли.
- 1-9 фреймы: `9/`, `X`, `72`, `8-`, `8F`.
- 10 фрейм (особый, 2-3 символа): `XXX`, `XX6`, `X9/`, `X9-`, `9/X`, `9/9`, `-/5`, открытый `63`.

## Зачёты (event в таблице games)

- ЧР 2026: `doubles`, `doubles mix` (через пробел).
- Лига (будет): `личный`, `командный`, `ветераны`.

## Темы и принципы

- **Тёмная тема** (Tailwind slate-900), акцент янтарный/amber.
- Шрифт **Inter**, числа выровнены вправо в таблицах.
- Топ-3 в таблицах — медали 🥇🥈🥉.
- Только десктоп, mobile responsive не делаем.
- Всё на русском.

## Безопасность

- `.env` всегда в `.gitignore`, пароли никогда не коммитятся.
- SQLite-файлы в `data/` тоже в `.gitignore` (только JSON попадают в Git).
- MySQL слушает localhost, наружу не открыт.
- Репозиторий public, но в нём нет чувствительных данных.

## Что НЕ делать без явного запроса

- Не использовать `create-react-app` (только Vite).
- Не ставить Tailwind v4 (только v3, у v4 проблемы с Windows).
- Не добавлять backend на Vercel как serverless (архитектура статическая).
- Не делать mobile-вёрстку.
- Не использовать яркие/розовые/неоновые цвета, только спортивная палитра.
- Не делать парную статистику (только индивидуальную, даже на парных турнирах).
- Не показывать сплиты пока их нет в данных (S в content — это правки, не сплиты).

## Стиль общения

- Объяснения на русском, дружелюбный наставник.
- Шаги — пронумерованные, с командами для копирования.
- Перед большой работой — короткий план и подтверждение.
- При ошибках — сначала диагностика (какие команды дадут понять причину), потом фикс.
- Длинные технические решения — с обоснованием «почему именно так».

## Полезные ссылки

- Production: https://bowlrus.vercel.app
- Repo: https://github.com/Narizinh0o/bowlrus
- Vercel dashboard: https://vercel.com/narizinhooo/bowlrus
- API docs (когда backend поднят): http://127.0.0.1:8000/docs

## Теги Git (точки возврата)

- `v0.1-local-working` — backend + frontend на axios, работает локально.
- `v0.2-static-json` — frontend переведён на JSON, готов к деплою.
- `v1.0-launched` — публичный запуск на Vercel.