import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import ListingCard from '../components/ListingCard'
import {
    SPORTS,
    PLAYER_SKILLS,
    LISTING_SELECT,
    normalizeListings,
    type ListingRow,
    type Notice,
} from '../lib/listings'

function FindListing() {
    const { user } = useAuth()
    const userId = user?.id

    const [listings, setListings] = useState<ListingRow[]>([])
    const [loading, setLoading] = useState(true)
    const [sport, setSport] = useState('all')
    const [skill, setSkill] = useState('any')
    const [hideFull, setHideFull] = useState(false)
    const [notice, setNotice] = useState<Notice | null>(null)

    const loadListings = useCallback(async () => {
        const { data, error } = await supabase
            .from('listings')
            .select(LISTING_SELECT)
            .gte('starts_at', new Date().toISOString())
            .order('starts_at', { ascending: true })

        if (error) {
            setNotice({ type: 'error', text: error.message })
        } else {
            setListings(normalizeListings(data))
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
                    listing.host_id === userId ||
                    listing.listing_players.some((p) => p.user_id === userId)
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
    }, [listings, sport, skill, hideFull, userId])

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

                <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {filteredListings.map((listing) => (
                        <ListingCard
                            key={listing.id}
                            listing={listing}
                            userId={userId}
                            onChange={loadListings}
                            onNotice={setNotice}
                        />
                    ))}
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