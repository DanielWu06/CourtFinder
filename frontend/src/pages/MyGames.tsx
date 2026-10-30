import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import ListingCard from '../components/ListingCard'
import {
    LISTING_SELECT,
    normalizeListings,
    type ListingRow,
    type Notice,
} from '../lib/listings'

function MyGames() {
    const { user } = useAuth()
    const userId = user?.id

    const [listings, setListings] = useState<ListingRow[]>([])
    const [loading, setLoading] = useState(true)
    const [showPast, setShowPast] = useState(false)
    const [notice, setNotice] = useState<Notice | null>(null)

    const loadGames = useCallback(async () => {
        if (!userId) return

        // Step 1: which games am I in? (Hosts are always players in their own game.)
        const { data: mine, error: mineError } = await supabase
            .from('listing_players')
            .select('listing_id')
            .eq('user_id', userId)

        if (mineError) {
            setNotice({ type: 'error', text: mineError.message })
            setLoading(false)
            return
        }

        const ids = (mine ?? []).map((row) => row.listing_id as string)

        if (ids.length === 0) {
            setListings([])
            setLoading(false)
            return
        }

        // Step 2: load those games with all their players.
        const { data, error } = await supabase
            .from('listings')
            .select(LISTING_SELECT)
            .in('id', ids)

        if (error) {
            setNotice({ type: 'error', text: error.message })
        } else {
            setListings(normalizeListings(data))
        }
        setLoading(false)
    }, [userId])

    useEffect(() => {
        loadGames()
    }, [loadGames])

    const now = Date.now()
    const time = (listing: ListingRow) => new Date(listing.starts_at).getTime()

    const upcoming = listings
        .filter((listing) => time(listing) > now)
        .sort((a, b) => time(a) - time(b))

    const past = listings
        .filter((listing) => time(listing) <= now)
        .sort((a, b) => time(b) - time(a))

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="mx-auto max-w-7xl px-6 py-12">
                <h1 className="text-3xl font-bold text-gray-900">My Games</h1>

                <p className="mt-2 text-gray-600">
                    Games you're hosting or playing in.
                </p>

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

                {loading && <p className="mt-10 text-center text-gray-500">Loading your games...</p>}

                {!loading && listings.length === 0 && (
                    <p className="mt-10 text-center text-gray-500">
                        You haven't joined any games yet.{' '}
                        <Link to="/find" className="font-medium text-blue-600 hover:underline">
                            Find a game
                        </Link>{' '}
                        or{' '}
                        <Link to="/create" className="font-medium text-blue-600 hover:underline">
                            schedule one
                        </Link>
                        .
                    </p>
                )}

                {upcoming.length > 0 && (
                    <>
                        <h2 className="mt-10 text-lg font-semibold text-gray-900">Upcoming</h2>
                        <div className="mt-4 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                            {upcoming.map((listing) => (
                                <ListingCard
                                    key={listing.id}
                                    listing={listing}
                                    userId={userId}
                                    onChange={loadGames}
                                    onNotice={setNotice}
                                />
                            ))}
                        </div>
                    </>
                )}

                {!loading && listings.length > 0 && upcoming.length === 0 && (
                    <p className="mt-10 text-gray-500">
                        Nothing coming up.{' '}
                        <Link to="/find" className="font-medium text-blue-600 hover:underline">
                            Find a game
                        </Link>
                    </p>
                )}

                {past.length > 0 && (
                    <>
                        <button
                            onClick={() => setShowPast((current) => !current)}
                            className="mt-10 text-sm font-medium text-gray-600 hover:text-blue-600"
                        >
                            {showPast ? 'Hide' : 'Show'} past games ({past.length})
                        </button>

                        {showPast && (
                            <div className="mt-4 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                                {past.map((listing) => (
                                    <ListingCard
                                        key={listing.id}
                                        listing={listing}
                                        userId={userId}
                                        onChange={loadGames}
                                        onNotice={setNotice}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}

export default MyGames