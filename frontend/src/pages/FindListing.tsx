import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MapPin, Calendar, Users } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import {
    SPORTS,
    PLAYER_SKILLS,
    LISTING_SKILLS,
    FORMATS,
    labelFor,
} from '../lib/listings'

type Player = {
    user_id: string
    joined_at: string
    profile: { display_name: string | null } | null
}

type ListingRow = {
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
    listing_players: Player[]
}

type Notice = { type: 'error' | 'success'; text: string }

function FindListing() {
    const { user } = useAuth()

    const [listings, setListings] = useState<ListingRow[]>([])
    const [loading, setLoading] = useState(true)
    const [sport, setSport] = useState('all')
    const [skill, setSkill] = useState('any')
    const [hideFull, setHideFull] = useState(false)
    const [busyId, setBusyId] = useState<string | null>(null)
    const [notice, setNotice] = useState<Notice | null>(null)
    const [editingId, setEditingId] = useState<string | null>(null)
    const [draft, setDraft] = useState('')

    const loadListings = useCallback(async () => {
        const { data, error } = await supabase
            .from('listings')
            .select(
                'id, host_id, title, sport, venue, starts_at, skill_level, format, capacity, status, notes, listing_players(user_id, joined_at, profile:profiles!listing_players_user_id_fkey(display_name))'
            )
            .gte('starts_at', new Date().toISOString())
            .order('starts_at', { ascending: true })

        if (error) {
            setNotice({ type: 'error', text: error.message })
        } else {
            const rows = (data ?? []) as unknown as ListingRow[]
            // Players in the order they joined (the host is always first).
            setListings(
                rows.map((row) => ({
                    ...row,
                    listing_players: [...row.listing_players].sort(
                        (a, b) =>
                            new Date(a.joined_at).getTime() -
                            new Date(b.joined_at).getTime()
                    ),
                }))
            )
        }
        setLoading(false)
    }, [])

    useEffect(() => {
        loadListings()
    }, [loadListings])

    const filteredListings = useMemo(() => {
        return listings.filter((listing) => {
            // Cancelled games stay visible only to people involved in them.
            if (listing.status === 'cancelled') {
                const involved =
                    listing.host_id === user?.id ||
                    listing.listing_players.some((p) => p.user_id === user?.id)
                if (!involved) return false
            }

            if (sport !== 'all' && listing.sport !== sport) return false

            // A game open to "All Levels" matches every skill filter.
            if (
                skill !== 'any' &&
                listing.skill_level !== skill &&
                listing.skill_level !== 'all'
            ) {
                return false
            }

            if (
                hideFull &&
                listing.status === 'open' &&
                listing.listing_players.length >= listing.capacity
            ) {
                return false
            }

            return true
        })
    }, [listings, sport, skill, hideFull, user?.id])

    async function runAction(
        listingId: string,
        action: () => PromiseLike<{ error: { message: string } | null }>,
        successText?: string
    ): Promise<boolean> {
        setBusyId(listingId)
        setNotice(null)

        const { error } = await action()

        if (error) {
            setNotice({ type: 'error', text: error.message })
        } else if (successText) {
            setNotice({ type: 'success', text: successText })
        }

        await loadListings()
        setBusyId(null)
        return !error
    }

    function handleJoin(listing: ListingRow) {
        // user_id is filled in by the database from the logged-in user.
        runAction(
            listing.id,
            () => supabase.from('listing_players').insert({ listing_id: listing.id }),
            `You joined "${listing.title}".`
        )
    }

    function handleLeave(listing: ListingRow) {
        if (!user) return
        runAction(
            listing.id,
            () =>
                supabase
                    .from('listing_players')
                    .delete()
                    .eq('listing_id', listing.id)
                    .eq('user_id', user.id),
            listing.status === 'cancelled' ? undefined : `You left "${listing.title}".`
        )
    }

    function handleCancel(listing: ListingRow) {
        const ok = window.confirm(
            `Cancel "${listing.title}"? Players who joined will see it marked as cancelled.`
        )
        if (!ok) return

        runAction(
            listing.id,
            () => supabase.from('listings').update({ status: 'cancelled' }).eq('id', listing.id),
            `"${listing.title}" was cancelled.`
        )
    }

    function handleDelete(listing: ListingRow) {
        const ok = window.confirm(`Permanently delete "${listing.title}"?`)
        if (!ok) return

        runAction(
            listing.id,
            () => supabase.from('listings').delete().eq('id', listing.id),
            `"${listing.title}" was deleted.`
        )
    }

    function startEditing(listing: ListingRow) {
        setEditingId(listing.id)
        setDraft(listing.notes ?? '')
    }

    async function saveNotes(listing: ListingRow) {
        const saved = await runAction(
            listing.id,
            () =>
                supabase
                    .from('listings')
                    .update({ notes: draft.trim() || null })
                    .eq('id', listing.id),
            'Notes updated.'
        )
        if (saved) setEditingId(null)
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="mx-auto max-w-7xl px-6 py-12">
                <h1 className="text-3xl font-bold text-gray-900">Find a Game</h1>

                <p className="mt-2 text-gray-600">
                    Discover upcoming games and find players to play with.
                </p>

                {/* Filters */}
                <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <span className="text-sm font-medium text-gray-700">Sport:</span>

                        {[{ value: 'all', label: 'All' }, ...SPORTS].map((option) => (
                            <button
                                key={option.value}
                                onClick={() => setSport(option.value)}
                                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                                    sport === option.value
                                        ? 'bg-blue-600 text-white'
                                        : 'border border-gray-300 bg-white text-gray-700 hover:border-blue-400'
                                }`}
                            >
                                {option.label}
                            </button>
                        ))}
                    </div>

                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        Skill:
                        <select
                            value={skill}
                            onChange={(event) => setSkill(event.target.value)}
                            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-normal"
                        >
                            <option value="any">Any</option>
                            {PLAYER_SKILLS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                    </label>

                    <label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <input
                            type="checkbox"
                            checked={hideFull}
                            onChange={(event) => setHideFull(event.target.checked)}
                            className="h-4 w-4 rounded border-gray-300"
                        />
                        Hide full games
                    </label>
                </div>

                {notice && (
                    <p
                        className={`mt-6 rounded-lg p-4 text-sm ${
                            notice.type === 'error'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-green-50 text-green-700'
                        }`}
                    >
                        {notice.text}
                    </p>
                )}

                {loading && <p className="mt-10 text-center text-gray-500">Loading games...</p>}

                {/* Listings */}
                <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {filteredListings.map((listing) => {
                        const playerCount = listing.listing_players.length
                        const cancelled = listing.status === 'cancelled'
                        const isFull = playerCount >= listing.capacity
                        const isHost = listing.host_id === user?.id
                        const hasJoined = listing.listing_players.some(
                            (player) => player.user_id === user?.id
                        )
                        const busy = busyId === listing.id
                        const editing = editingId === listing.id
                        const start = new Date(listing.starts_at)

                        return (
                            <div
                                key={listing.id}
                                className={`flex flex-col rounded-xl border bg-white p-6 shadow-sm ${
                                    cancelled ? 'border-red-200 opacity-80' : 'border-gray-200'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                                        {labelFor(SPORTS, listing.sport)}
                                    </span>

                                    {cancelled ? (
                                        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                                            Cancelled
                                        </span>
                                    ) : (
                                        <span className="text-xs text-gray-500">
                                            {labelFor(FORMATS, listing.format)}
                                        </span>
                                    )}
                                </div>

                                <h2
                                    className={`mt-4 text-xl font-semibold text-gray-900 ${
                                        cancelled ? 'line-through' : ''
                                    }`}
                                >
                                    {listing.title}
                                </h2>

                                <div className="mt-4 space-y-3 text-sm text-gray-600">
                                    <p className="flex items-center gap-2">
                                        <MapPin size={16} />
                                        {listing.venue}
                                    </p>

                                    <p className="flex items-center gap-2">
                                        <Calendar size={16} />
                                        {start.toLocaleDateString(undefined, {
                                            weekday: 'short',
                                            month: 'short',
                                            day: 'numeric',
                                        })}{' '}
                                        ·{' '}
                                        {start.toLocaleTimeString(undefined, {
                                            hour: 'numeric',
                                            minute: '2-digit',
                                        })}
                                    </p>

                                    <p className="flex items-center gap-2">
                                        <Users size={16} />
                                        {playerCount}/{listing.capacity} players
                                    </p>
                                </div>

                                {/* Who's going */}
                                <div className="mt-3 flex flex-wrap gap-2">
                                    {listing.listing_players.map((player) => (
                                        <span
                                            key={player.user_id}
                                            className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700"
                                        >
                                            {player.profile?.display_name || 'Player'}
                                            {player.user_id === user?.id && ' (you)'}
                                            {player.user_id === listing.host_id && ' · Host'}
                                        </span>
                                    ))}
                                </div>

                                {/* Host notes */}
                                {editing ? (
                                    <div className="mt-4">
                                        <textarea
                                            value={draft}
                                            onChange={(event) => setDraft(event.target.value)}
                                            rows={3}
                                            maxLength={500}
                                            placeholder="e.g. Meet at court 3, bring your own birdies"
                                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                                        />
                                        <div className="mt-2 flex justify-end gap-2">
                                            <button
                                                onClick={() => setEditingId(null)}
                                                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                                            >
                                                Discard
                                            </button>
                                            <button
                                                onClick={() => saveNotes(listing)}
                                                disabled={busy}
                                                className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                                            >
                                                Save notes
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    listing.notes && (
                                        <p className="mt-4 whitespace-pre-line rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                                            {listing.notes}
                                        </p>
                                    )
                                )}

                                <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
                                    <span className="text-sm text-gray-500">
                                        {labelFor(LISTING_SKILLS, listing.skill_level)}
                                    </span>

                                    <div className="flex items-center gap-2">
                                        {isHost && !cancelled && (
                                            <>
                                                {!editing && (
                                                    <button
                                                        onClick={() => startEditing(listing)}
                                                        disabled={busy}
                                                        className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                                    >
                                                        {listing.notes ? 'Edit Notes' : 'Add Notes'}
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleCancel(listing)}
                                                    disabled={busy}
                                                    className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                                                >
                                                    Cancel Game
                                                </button>
                                            </>
                                        )}

                                        {isHost && cancelled && (
                                            <button
                                                onClick={() => handleDelete(listing)}
                                                disabled={busy}
                                                className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                                            >
                                                Delete
                                            </button>
                                        )}

                                        {!isHost && hasJoined && (
                                            <button
                                                onClick={() => handleLeave(listing)}
                                                disabled={busy}
                                                className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                                            >
                                                {cancelled ? 'Dismiss' : 'Leave'}
                                            </button>
                                        )}

                                        {!isHost && !hasJoined && !cancelled && (
                                            <button
                                                onClick={() => handleJoin(listing)}
                                                disabled={busy || isFull}
                                                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                                            >
                                                {isFull ? 'Full' : 'Join Game'}
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {!cancelled && (isHost || hasJoined) && (
                                    <p className="mt-3 text-xs font-medium text-green-600">
                                        {isHost ? "You're hosting this game" : "You're in"}
                                    </p>
                                )}
                            </div>
                        )
                    })}
                </div>

                {!loading && filteredListings.length === 0 && (
                    <p className="mt-10 text-center text-gray-500">
                        No games match these filters.{' '}
                        <Link to="/create" className="font-medium text-blue-600 hover:underline">
                            Schedule one
                        </Link>
                    </p>
                )}
            </div>
        </div>
    )
}

export default FindListing
