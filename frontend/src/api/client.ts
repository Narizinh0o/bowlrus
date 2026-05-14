import axios from 'axios'
import type { Tournament, PlayerStats, PlayerDetail, EventInfo } from '../types'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

const api = axios.create({ baseURL: BASE_URL })

export const fetchTournament = (): Promise<Tournament> =>
  api.get<Tournament>('/api/tournament').then(r => r.data)

export const fetchPlayers = (event?: string): Promise<PlayerStats[]> =>
  api.get<PlayerStats[]>('/api/players', { params: event ? { event } : {} }).then(r => r.data)

export const fetchPlayer = (id: number): Promise<PlayerDetail> =>
  api.get<PlayerDetail>(`/api/players/${id}`).then(r => r.data)

export const fetchEvents = (): Promise<EventInfo[]> =>
  api.get<EventInfo[]>('/api/events').then(r => r.data)
