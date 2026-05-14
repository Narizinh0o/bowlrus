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
  strike_percent: number
  spares: number
  opens: number
  spare_conversion_percent: number
  singles_left: number
  singles_converted: number
  singles_missed: number
  single_pin_percent: number
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

export interface PlayerDetail {
  stats: PlayerStats
  games: PlayerGame[]
}

export interface EventInfo {
  event: string
  games_count: number
}

export type SortDirection = 'asc' | 'desc'
