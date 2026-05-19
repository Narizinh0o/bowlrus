import type { Tournament, PlayerStats, PlayerDetail, EventInfo, Game } from '../types'

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) {
    throw new Error(`Failed to load ${path}: ${res.status} ${res.statusText}`)
  }
  return res.json() as Promise<T>
}

export const fetchTournament = (): Promise<Tournament> =>
  fetchJson<Tournament>('/data/chr/tournament.json')

export const fetchEvents = (): Promise<EventInfo[]> =>
  fetchJson<EventInfo[]>('/data/chr/events.json')

// Без event → агрегат по всем зачётам.
// С event → отдельный файл: имя зачёта переводится в slug (пробел → подчёркивание).
// Пример: 'doubles mix' → /data/chr/players_doubles_mix.json
export const fetchPlayers = (event?: string): Promise<PlayerStats[]> => {
  if (!event) return fetchJson<PlayerStats[]>('/data/chr/players.json')
  const slug = event.replace(/\s+/g, '_')
  return fetchJson<PlayerStats[]>(`/data/chr/players_${slug}.json`)
}

export const fetchPlayer = (id: number): Promise<PlayerDetail> =>
  fetchJson<PlayerDetail>(`/data/chr/players/${id}.json`)

export const fetchGame = (id: number): Promise<Game> =>
  fetchJson<Game>(`/data/chr/games/${id}.json`)
