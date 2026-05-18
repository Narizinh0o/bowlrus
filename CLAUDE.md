# BowlRus Stats — контекст проекта

## Что это

Сайт со статистикой турниров по боулингу. Public: https://bowlrus.vercel.app

Владелец проекта — Анастасия (Анастасия не программист, владеет базовыми концепциями; на Python ориентируется лучше, чем на JS). Все объяснения — на русском. Тон — дружелюбный наставник, без снисходительности.

## Архитектура (мульти-спорт)

Сайт поддерживает несколько «спортов» — независимых соревнований со своими БД и страницами:

- **КЛБ** (Континентальная Лига Боулинга) — основной спорт, 4 сезона с 2023 г. БД MySQL `bowling`.
- **ЧР** (Чемпионат России) — тестовый, отдельные ЧР по годам. БД MySQL `russian_championship_2026` для ЧР 2026.

В будущем могут добавиться: Кубок России, всероссийские соревнования.

Каждый спорт имеет свой SQLite-файл и свою папку JSON-витрин.
MySQL (локально)            SQLite (data/)        JSON (frontend/public/data/)   React (Vercel)
─────────────────           ─────────────────     ───────────────────────────    ──────────────
bowling                  →  klb.db             →  klb/...                     →  /klb/*
russian_championship_2026 → chr2026.db         →  chr/...                     →  /chr/*

**Ключевой принцип:** наружу попадает только то, что прошло через витрины и экспорт. Чувствительные поля остаются в MySQL и физически не покидают ноут.

## URL и навигация
/                                  главная: выбор спорта (КЛБ / ЧР)
/klb                               главная КЛБ: режим (Личный / Командный)
/klb/personal/players              список игроков (личный зачёт)
/klb/personal/players/:id          карточка игрока
/klb/personal/tournaments          список турниров
/klb/personal/tournaments/:id      турнир: личные результаты
/klb/team/teams                    список команд
/klb/team/teams/:id                карточка команды
/klb/team/tournaments              список турниров
/klb/team/tournaments/:id          турнир: командные результаты
/klb/clubs                         клубы (общий для обоих режимов)
/chr                               ЧР 2026 (с переходом на новый роутинг)
/chr/players, /chr/players/:id, /chr/tournament

## Структура папок
bowlrus/
├── backend/
│   ├── init.py
│   └── main.py             # FastAPI, эндпоинты с параметром sport
├── frontend/
│   ├── public/data/
│   │   ├── chr/            # JSON для ЧР
│   │   └── klb/            # JSON для КЛБ
│   ├── src/
│   │   ├── api/client.ts
│   │   ├── pages/
│   │   ├── components/
│   │   └── types/
│   ├── vercel.json         # SPA fallback
│   └── package.json
├── scripts/
│   ├── migrate_chr.py      # MySQL → SQLite (ЧР)
│   ├── migrate_klb.py      # MySQL → SQLite (КЛБ)
│   └── export_to_json.py   # SQLite → JSON для обоих спортов
├── data/
│   ├── chr2026.db          # SQLite ЧР (в .gitignore)
│   └── klb.db              # SQLite КЛБ (в .gitignore)
├── .env                    # пароли MySQL (в .gitignore)
└── CLAUDE.md

## Стек

- **Backend:** Python 3.10, FastAPI, uvicorn, mysql-connector-python, sqlite3.
- **Frontend:** Vite + React 18 + TypeScript + Tailwind CSS v3 + React Router v6 + Recharts.
- **Хостинг:** Vercel (Hobby, Personal).
- **БД для прода:** SQLite-файлы → экспорт в JSON (read-only).
- **Git:** ветка `main`, репо https://github.com/Narizinh0o/bowlrus.

## Структура БД КЛБ (`bowling`)

8 таблиц с FK-связями:

- **`tournaments`** — этапы Лиги: `tournament_id`, `name`, `year`, `season`, `stage`. 25 строк.
- **`players`** — игроки: `player_id`, `full_name`, `gender (М/Ж/U)`, `club_id`, `hand (R/L)`. 319 строк.
- **`clubs`** — клубы: `club_id`, `club_name`. 17 строк.
- **`teams`** — команды: `team_id`, `team_name`, `club_id`. 56 строк.
- **`games`** — отдельные игры: `game_id`, `tournament_id`, `player_id`, `team_id`, `match_id`, `stage_type`, `game_number`, `raw_score`, `hcp`, `event`. 44 613 строк.
- **`matches`** — плей-офф матчи: `match_id`, `tournament_id`, `stage_type`, `player1/2_id`, `team1/2_id`, `score_str`, `rolloff_p1/p2`, `winner_id`, `winner_team_id`. 4 661 строк.
- **`player_club_history`** — за какой клуб играл игрок в конкретном турнире.
- **`player_team_history`** — за какую команду играл в конкретном турнире.

## Структура БД ЧР (`russian_championship_2026`)

3 таблицы — гораздо проще:

- **`players`** — `player_id`, `player_name`. 196 строк.
- **`games`** — `game_id`, `player_name`, `player_id`, `lane`, `game_number`, `play_date`, `time_start`, `time_end`, `total_score`, `event ('doubles' | 'doubles mix')`. 2 094 строк.
- **`frames`** — `game_id`, `frame_number`, `content`. 20 940 строк.

## Зачёты (`event`)

КЛБ: `личный`, `командный`, `ветераны`. Все маленькими буквами. Ветеранов в MVP **не делаем**, но в БД они есть.

ЧР: `doubles`, `doubles mix` (через пробел).

Один игрок не имеет дублей одной игры в разных зачётах. Зачёты проходят последовательно, не параллельно.

## Этапы КЛБ (`stage_type`)

Классификация для агрегатов:

- **Квалификация (personal):** `PTQ`, `Основная квалификация`
- **Квалификация (team):** `PTQ` (в командном зачёте, редко)
- **Round Robin:** `RR`, `RR_A`, `RR_B`, `RR_C`
- **Плей-офф:** `1 этап`, `2 этап`, `Четвертьфинал`, `Полуфинал`, `Финал`, `Матч за 3 место`, `double elimination`, `Степледдер`
- **Игнорируем:** `VPTQ` (ветеранская квала)

Регламент менялся каждый сезон, эта классификация — нормализация для отображения.

## Особенности счёта

- **Гандикап `hcp`:** у женщин +8 в личном/командном зачёте, у ветеранов индивидуально по возрасту (только в ветеранском зачёте). **На сайте все средние и лучшие игры считаются как `raw_score + hcp`** — это «справедливый» итог.
- **Командные RR:** `raw_score` в `games` для `stage_type` IN ('RR', 'RR_A', 'RR_B', 'RR_C') командного зачёта — это **сумма двух игроков** (одна команда = 2 игры за матч, но в БД хранится сумма). Для среднего делим на 2.
- **Командные плей-офф:** в `games` каждая запись — это **один игрок** (как в личном), `raw_score` не делим.

## Ролл-офф (`rolloff_p1`, `rolloff_p2`)

Дополнительные броски при ничейном счёте 1-1 в матче.

Формат: строка из символов:
- `0-9` — цифры (кол-во кеглей).
- `X` или `Х` (латиница/кириллица!) — страйк = 10.
- `/` — **разделитель** «бросок в игре | бросок в матче», **не считается как бросок**.
- `\` — встречается, видимо опечатка вместо `/`. Тоже разделитель, не бросок.
- Мусор: пробелы, `(...)`, `F`, и прочие символы — игнорируются при парсинге.

Пример: `"96/X9"` = броски 9, 6, X, 9 (всего 4 броска: 9+6+10+9).

Победитель ролл-офф матча — `matches.winner_id` (если был ролл-офф и `winner_id` совпадает с игроком).

## Витрины (`migrate_klb.py`)

**Все средние считаются с гандикапом: `AVG(raw_score + hcp)`.**

### `v_player_personal`
Личная статистика игрока (по всем турнирам, всем сезонам). Колонки:
- `player_id`, `player_name`, `gender`, `hand`
- `current_club_name`
- `games_total`, `avg_total`, `best_game`, `worst_game`, `tournaments_played`
- `quals_games`, `quals_avg` (PTQ + Основная квалификация)
- `rr_games`, `rr_avg` (RR_A/B/C)
- `po_games`, `po_avg`, `po_best` (плей-офф)

### `v_team_stats`
Командная статистика по команде (по всем сезонам):
- `team_id`, `team_name`, `club_id`, `club_name`
- `games_total`, `avg_total`, `best_game`
- `rr_games`, `rr_avg` (счёт ÷ 2 в среднем)
- `quals_games`, `quals_avg` (командный PTQ)
- `po_games`, `po_avg`, `po_best`
- `latest_season` — последний сезон в котором команда играла (для сортировки)
- `seasons_list` — список сезонов через запятую (для отображения)

### `v_club_stats`
Агрегаты по клубам:
- `club_id`, `club_name`
- `players_count` — кол-во уникальных игроков (по `player_club_history`)
- `teams_count` — кол-во команд
- `latest_season_with_team` — последний сезон с активной командой

### `v_player_rolloff`
Ролл-офф статистика игрока:
- `player_id`, `player_name`
- `throws_count`, `throws_avg` — кол-во и средний бросок
- `matches_total`, `matches_won`, `winrate` — матчи с ролл-оффом, выигранные, %

### `v_team_rolloff`
Аналогично для команд (через `winner_team_id`).

### `v_tournament_personal`
Результаты турнира × игрок (для страницы турнира):
- `tournament_id`, `player_id`, `player_name`
- `team_name_at_tournament` (из `player_team_history` на этот турнир)
- `games_total`, `avg_total`, `best_game`
- Та же разбивка: квалы / RR / плей-офф.

### `v_tournament_team`
Результаты турнира × команда:
- `tournament_id`, `team_id`, `team_name`, `club_name`
- `games_total`, `avg_total`, `best_game`
- Разбивка по этапам.

## Витрина ЧР (`v_player_stats`)

См. `migrate_chr.py`. Считается из `frames`. Главные поля: `strike_attempts`, `strike_percent`, `spare_conversion_percent`, `single_pin_percent`. Символ `S` в начале `content` нормализуется (удаляется) — это правки оператора.

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
2. Миграция: `python scripts/migrate_klb.py` (или `migrate_chr.py`) — пересоздаёт SQLite + витрины.
3. Поднять backend: `uvicorn backend.main:app --reload`.
4. Экспорт: `python scripts/export_to_json.py` — JSON-файлы.
5. `git add . && git commit -m "Update data" && git push` — Vercel передеплоит за 1-2 минуты.

## Темы и принципы

- **Тёмная тема** (Tailwind slate-900), акцент янтарный (amber).
- Шрифт **Inter**, числа выровнены вправо в таблицах.
- Топ-3 в таблицах — медали 🥇🥈🥉.
- Только десктоп. Mobile responsive не делаем.
- Всё на русском.
- **ID объектов передаём в JSON для роутинга, но НЕ показываем в UI.**

## Безопасность

- `.env` всегда в `.gitignore`, пароли не коммитятся.
- SQLite-файлы (`data/*.db`) в `.gitignore`.
- MySQL слушает localhost.
- Репо public сейчас (можно переключить в private одним кликом без последствий).
- В JSON попадают только данные согласованные в этом файле.

## Что НЕ делать без явного запроса

- Не использовать `create-react-app` (только Vite).
- Не ставить Tailwind v4 (только v3, у v4 проблемы с Windows).
- Не добавлять backend на Vercel как serverless (архитектура статическая).
- Не делать mobile-вёрстку.
- Не использовать яркие/розовые/неоновые цвета.
- Не делать парную статистику (даже на парных турнирах — только индивидуальную).
- Не показывать сплиты в ЧР (`S` в `content` — это правки, не сплиты).
- Не делать ветеранов в MVP КЛБ (архитектурно заложить, но не показывать).
- Не показывать ID объектов на сайте.
- Не показывать гандикаповый счёт отдельной колонкой — везде уже включён в общий итог.

## Стиль общения

- Объяснения на русском, дружелюбный наставник.
- Шаги пронумерованные, с командами для копирования.
- Перед большой работой — короткий план и подтверждение.
- При ошибках — сначала диагностика, потом фикс.
- Длинные технические решения — с обоснованием «почему именно так».

## Полезные ссылки

- Production: https://bowlrus.vercel.app
- Repo: https://github.com/Narizinh0o/bowlrus
- Vercel dashboard: https://vercel.com/narizinhooo/bowlrus
- API docs (когда backend поднят): http://127.0.0.1:8000/docs

## Теги Git (точки возврата)

- `v0.1-local-working` — backend + frontend на axios, локально.
- `v0.2-static-json` — frontend на JSON.
- `v1.0-launched` — публичный запуск.
- (планируется) `v1.1-klb-migrated` — после успешной миграции КЛБ.
- (планируется) `v2.0-multi-sport` — после запуска КЛБ на проде.




1. Think Before Coding
Don't assume. Don't hide confusion. Surface tradeoffs.

Before implementing:

State your assumptions explicitly. If uncertain, ask.
If multiple interpretations exist, present them - don't pick silently.
If a simpler approach exists, say so. Push back when warranted.
If something is unclear, stop. Name what's confusing. Ask.
2. Simplicity First
Minimum code that solves the problem. Nothing speculative.

No features beyond what was asked.
No abstractions for single-use code.
No "flexibility" or "configurability" that wasn't requested.
No error handling for impossible scenarios.
If you write 200 lines and it could be 50, rewrite it.
Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

3. Surgical Changes
Touch only what you must. Clean up only your own mess.

When editing existing code:

Don't "improve" adjacent code, comments, or formatting.
Don't refactor things that aren't broken.
Match existing style, even if you'd do it differently.
If you notice unrelated dead code, mention it - don't delete it.
When your changes create orphans:

Remove imports/variables/functions that YOUR changes made unused.
Don't remove pre-existing dead code unless asked.
The test: Every changed line should trace directly to the user's request.

4. Goal-Driven Execution
Define success criteria. Loop until verified.

Transform tasks into verifiable goals:

"Add validation" → "Write tests for invalid inputs, then make them pass"
"Fix the bug" → "Write a test that reproduces it, then make it pass"
"Refactor X" → "Ensure tests pass before and after"
For multi-step tasks, state a brief plan:

1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

These guidelines are working if: fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.
Но!!! учти, что нужна не просто "заглушка" для проблемы, необходимо НАЙТИ проблему и решить, если проблему решить не удается, то спроси "можно ли использовать костыли для решения" и расскажи какими методами планируешь решать.