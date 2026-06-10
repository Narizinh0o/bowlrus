export interface TournamentSummary {
  players_count: number
  games_count: number
  total_pins: number
  avg_score: number
}

export interface Tournament {
  name: string
  date_start: string
  date_end: string
  slug: string
  summary: TournamentSummary
}

export interface PlayerStats {
  player_id: number
  player_name: string
  events_played: number
  games_played: number
  total_pins: number
  average_score: number
  best_game: number
  worst_game: number
  score_diff: number
  strike_attempts: number
  strikes: number
  strike_percent: number | null
  spares: number
  opens: number
  spare_conversion_percent: number | null
  singles_left: number
  singles_converted: number
  singles_missed: number
  single_pin_percent: number | null
  // Сколько блоков (зачётов) реально имеют раскадровку по фреймам. Игровые
  // метрики (средний/игры) считаются по всем блокам, а проценты ниже — только
  // по этим. Для большинства = 2 (парный + микс), у Сазонова = 3 (+ личный).
  blocks_with_frames: number
  gender: string | null
  // Только для карточки игрока (в общую таблицу не выносим).
  sport_rank: string | null
  region: string | null
}

export interface PlayerGame {
  game_id: number
  game_number: number
  play_date: string
  time_start: string | null
  time_end: string | null
  lane: number | null
  event: string
  total_score: number
}

export interface PlayerDetail extends PlayerStats {
  games: PlayerGame[]
}

export interface EventInfo {
  event: string
  games_count: number
}

export interface Frame {
  frame_number: number
  throws: string[]
  splits: boolean[]
}

export interface Game {
  game_id: number
  player_id: number
  player_name: string
  event: string
  game_number: number
  play_date: string
  time_start: string | null
  time_end: string | null
  lane: number | null
  total_score: number
  frames: Frame[]
}

export type SortDirection = 'asc' | 'desc'
