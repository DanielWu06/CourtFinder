export type Option = { value: string; label: string }

export const SPORTS: Option[] = [
    { value: 'badminton', label: 'Badminton' },
    { value: 'pickleball', label: 'Pickleball' },
]

export const PLAYER_SKILLS: Option[] = [
    { value: 'beginner', label: 'Beginner' },
    { value: 'intermediate', label: 'Intermediate' },
    { value: 'advanced', label: 'Advanced' },
]

export const LISTING_SKILLS: Option[] = [
    ...PLAYER_SKILLS,
    { value: 'all', label: 'All Levels' },
]

export const FORMATS: Option[] = [
    { value: 'casual', label: 'Casual' },
    { value: 'competitive', label: 'Competitive' },
]

export const CAPACITIES = [2, 4, 6, 8]

export function labelFor(options: Option[], value: string) {
    return options.find((option) => option.value === value)?.label ?? value
}

// ---------------------------------------------------------------
// Listing data
// ---------------------------------------------------------------

export type Player = {
    user_id: string
    joined_at: string
    profile: { display_name: string | null } | null
}

export type ListingRow = {
    id: string
    host_id: string
    title: string
    sport: string
    venue: string
    starts_at: string
    skill_level: string
    format: string
    capacity: number
    status: 'open' | 'cancelled'
    notes: string | null
    // The database only returns this to players in the game.
    chat: { url: string } | { url: string }[] | null
    listing_players: Player[]
}

export type Notice = { type: 'error' | 'success'; text: string }

export const LISTING_SELECT =
    'id, host_id, title, sport, venue, starts_at, skill_level, format, capacity, status, notes, chat:listing_chat_links(url), listing_players(user_id, joined_at, profile:profiles!listing_players_user_id_fkey(display_name))'

// Sorts each listing's players in the order they joined (host first).
export function normalizeListings(data: unknown): ListingRow[] {
    const rows = (data ?? []) as ListingRow[]

    return rows.map((row) => ({
        ...row,
        listing_players: [...row.listing_players].sort(
            (a, b) =>
                new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
        ),
    }))
}

export function getChatUrl(listing: ListingRow): string | null {
    const chat = listing.chat
    if (!chat) return null
    return Array.isArray(chat) ? chat[0]?.url ?? null : chat.url
}

// Validates a chat link typed by the host. Empty input means "no link".
// Only https links are accepted; a missing protocol is added for them.
export function parseChatLink(input: string): { url: string | null; error?: string } {
    const trimmed = input.trim()
    if (!trimmed) return { url: null }

    const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed)
        ? trimmed
        : `https://${trimmed}`

    try {
        const parsed = new URL(withProtocol)

        if (parsed.protocol !== 'https:') {
            return { url: null, error: 'Chat links must start with https://' }
        }
        if (!parsed.hostname.includes('.')) {
            return { url: null, error: "That doesn't look like a valid link." }
        }
        if (parsed.toString().length > 300) {
            return { url: null, error: 'That link is too long (300 characters max).' }
        }

        return { url: parsed.toString() }
    } catch {
        return { url: null, error: "That doesn't look like a valid link." }
    }
}