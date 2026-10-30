
import type { Option } from './listings'

export type Venue = {
    id: string
    code: string
    name: string
    location: string | null
    auto_calling: boolean
    grace_seconds: number
    defer_drop_places: number
    max_defers: number
    time_limit_minutes: number | null
    strict_time_limit: boolean
}

export type Court = {
    id: string
    venue_id: string
    name: string
    sport: string
    skill_restriction: 'open' | 'beginner' | 'challenge'
    players_needed: number
    managed: boolean
    status: 'available' | 'held' | 'occupied' | 'unavailable'
    sort_order: number
}

export const VENUE_SELECT =
    'id, code, name, location, auto_calling, grace_seconds, defer_drop_places, max_defers, time_limit_minutes, strict_time_limit'

export const COURT_SELECT =
    'id, venue_id, name, sport, skill_restriction, players_needed, managed, status, sort_order'

export const SKILL_RESTRICTIONS: Option[] = [
    { value: 'open', label: 'Open to everyone' },
    { value: 'beginner', label: 'Beginner court' },
    { value: 'challenge', label: 'Challenge court' },
]

// SHORT-TERM: singles or doubles only, matching the database check.
export const PLAYERS_NEEDED: Option[] = [
    { value: '2', label: 'Singles (2 players)' },
    { value: '4', label: 'Doubles (4 players)' },
]

export const COURT_STATUS: Option[] = [
    { value: 'available', label: 'Available' },
    { value: 'held', label: 'Called' },
    { value: 'occupied', label: 'In play' },
    { value: 'unavailable', label: 'Out of service' },
]

export const COURT_STATUS_STYLES: Record<string, string> = {
    available: 'bg-green-100 text-green-700',
    held: 'bg-amber-100 text-amber-700',
    occupied: 'bg-blue-100 text-blue-700',
    unavailable: 'bg-gray-100 text-gray-600',
}