import type {
  KlbPlayerBase,
  KlbPlayer,
  KlbTeamBase,
  KlbTeam,
  KlbClubSummary,
  KlbClub,
  KlbTournamentInfo,
  KlbPersonalTournament,
  KlbTeamTournament,
  KlbPatterns,
  KlbTournamentsMeta,
  KlbPlayerFact,
  KlbTeamFact,
  KlbPlayersLookup,
  KlbTeamsLookup,
} from '../types/klb'

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status} ${res.statusText}`)
  return res.json() as Promise<T>
}

export const fetchKlbMeta = () =>
  fetchJson<{ counts: Record<string, number> }>('/data/klb/meta.json')

export const fetchKlbPersonalPlayers = () =>
  fetchJson<KlbPlayerBase[]>('/data/klb/personal/players.json')

export const fetchKlbPersonalPlayer = (id: number) =>
  fetchJson<KlbPlayer>(`/data/klb/personal/players/${id}.json`)

export const fetchKlbPersonalTournaments = () =>
  fetchJson<KlbTournamentInfo[]>('/data/klb/personal/tournaments.json')

export const fetchKlbPersonalTournament = (id: number) =>
  fetchJson<KlbPersonalTournament>(`/data/klb/personal/tournaments/${id}.json`)

export const fetchKlbTeams = () =>
  fetchJson<KlbTeamBase[]>('/data/klb/team/teams.json')

export const fetchKlbTeam = (id: number) =>
  fetchJson<KlbTeam>(`/data/klb/team/teams/${id}.json`)

export const fetchKlbTeamTournaments = () =>
  fetchJson<KlbTournamentInfo[]>('/data/klb/team/tournaments.json')

export const fetchKlbTeamTournament = (id: number) =>
  fetchJson<KlbTeamTournament>(`/data/klb/team/tournaments/${id}.json`)

export const fetchKlbClubs = () =>
  fetchJson<KlbClubSummary[]>('/data/klb/clubs.json')

export const fetchKlbClub = (id: number) =>
  fetchJson<KlbClub>(`/data/klb/clubs/${id}.json`)

// ── Программы масла, факты, справочники (фильтруемые таблицы) ──────────

export const fetchKlbPatterns = () =>
  fetchJson<KlbPatterns>('/data/klb/patterns.json')

export const fetchKlbTournamentsMeta = () =>
  fetchJson<KlbTournamentsMeta>('/data/klb/tournaments.json')

export const fetchKlbPlayerFacts = () =>
  fetchJson<KlbPlayerFact[]>('/data/klb/player_facts.json')

export const fetchKlbTeamFacts = () =>
  fetchJson<KlbTeamFact[]>('/data/klb/team_facts.json')

export const fetchKlbPlayersLookup = () =>
  fetchJson<KlbPlayersLookup>('/data/klb/players_lookup.json')

export const fetchKlbTeamsLookup = () =>
  fetchJson<KlbTeamsLookup>('/data/klb/teams_lookup.json')
