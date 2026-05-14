import type { Tournament, PlayerStats, PlayerDetail, EventInfo } from '../types'

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) {
    throw new Error(`Failed to load ${path}: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

export const fetchTournament = (): Promise<Tournament> =>
  fetchJson<Tournament>('/data/tournament.json')

export const fetchEvents = (): Promise<EventInfo[]> =>
  fetchJson<EventInfo[]>('/data/events.json')

export const fetchPlayers = (event?: string): Promise<PlayerStats[]> => {
  if (event === 'doubles') return fetchJson<PlayerStats[]>('/data/players_doubles.json')
  if (event === 'doubles mix') return fetchJson<PlayerStats[]>('/data/players_doubles_mix.json')
  return fetchJson<PlayerStats[]>('/data/players.json')
}

export const fetchPlayer = (id: number): Promise<PlayerDetail> =>
  fetchJson<PlayerDetail>(`/data/players/${id}.json`)
