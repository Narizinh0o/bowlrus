export interface KlbRolloff {
  throws_count: number
  throws_avg: number
  matches_total: number
  matches_won: number
  winrate: number
}

export interface KlbPlayerBase {
  player_id: number
  player_name: string
  gender: string
  hand: string
  current_club_name: string
  games_total: number
  avg_total: number | null
  best_game: number | null
  worst_game: number | null
  tournaments_played: number
  quals_games: number
  quals_avg: number | null
  rr_games: number
  rr_avg: number | null
  po_games: number
  po_avg: number | null
  po_best: number | null
}

export interface KlbPlayer extends KlbPlayerBase {
  rolloff: KlbRolloff | null
}

export interface KlbTeamBase {
  team_id: number
  team_name: string
  club_id: number
  club_name: string
  games_total: number
  avg_total: number | null
  best_game: number | null
  rr_games: number
  rr_avg: number | null
  quals_games: number
  quals_avg: number | null
  po_games: number
  po_avg: number | null
  po_best: number | null
  seasons_list: string
  latest_season: number
}

export interface KlbTeam extends KlbTeamBase {
  rolloff: KlbRolloff | null
}

export interface KlbClubSummary {
  club_id: number
  club_name: string
  players_count: number
  teams_count: number
  latest_season_with_team: number | null
}

export interface KlbClub extends KlbClubSummary {
  players: KlbPlayerBase[]
  teams: KlbTeamBase[]
}

export interface KlbTournamentInfo {
  tournament_id: number
  name: string
  year: number
  season: number
  stage: number
}

export interface KlbPersonalResult {
  tournament_id: number
  player_id: number
  player_name: string
  team_name_at_tournament: string | null
  games_total: number
  avg_total: number | null
  best_game: number | null
  quals_games: number
  quals_avg: number | null
  rr_games: number
  rr_avg: number | null
  po_games: number
  po_avg: number | null
}

export interface KlbPersonalTournament {
  tournament: KlbTournamentInfo
  results: KlbPersonalResult[]
}

export interface KlbTeamResult {
  tournament_id: number
  team_id: number
  team_name: string
  club_name: string
  games_total: number
  avg_total: number | null
  best_game: number | null
  rr_games: number
  rr_avg: number | null
  po_games: number
  po_avg: number | null
}

export interface KlbTeamTournament {
  tournament: KlbTournamentInfo
  results: KlbTeamResult[]
}

// ── Программы масла и справочники для фильтруемых таблиц ──────────────

export interface KlbPattern {
  name: string
  length: number
  volume: number
  ratio: number | null
  photo: string | null
}
export type KlbPatterns = Record<string, KlbPattern>

export interface KlbTournamentMeta {
  name: string
  year: number
  season: number
  main: number | null
  ptq: number | null
}
export type KlbTournamentsMeta = Record<string, KlbTournamentMeta>

export interface KlbPlayerFact {
  pid: number
  tid: number
  season: number
  st: string
  club: string | null
  g: number
  ss: number
  bg: number | null
  wg: number | null
  patt: number | null
}

export interface KlbTeamFact {
  teamid: number
  tid: number
  season: number
  st: string
  g: number
  ss: number
  bg: number | null
  wg: number | null
  patt: number | null
}

export interface KlbPlayerLookup {
  name: string
  gender: string
  hand: string
}
export type KlbPlayersLookup = Record<string, KlbPlayerLookup>

export interface KlbTeamLookup {
  name: string
  club: string | null
}
export type KlbTeamsLookup = Record<string, KlbTeamLookup>
