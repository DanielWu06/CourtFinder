import { Link } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { useState, useEffect } from 'react'

type VenueListItem = {
    id: string
    code: string
    name: string
    location: string | null
    courts: { count: number }[]
}

// SHORT-TERM: lists every venue. Add search or a location filter when there are actual venues
function LocalPlay() {
    const { user } = useAuth()
    const userId = user?.id

    const [venues, setVenues] = useState<VenueListItem[]>([])
    const [roles, setRoles] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function load() {
            const { data, error } = await supabase
                .from('venues')
                .select('id, code, name, location, courts(count)')
                .order('name')

            if (error) {
                setError(error.message)
                setLoading(false)
                return
            }

            setVenues((data ?? []) as unknown as VenueListItem[])

            if (userId) {
                const { data: mine } = await supabase
                    .from('venue_members')
                    .select('venue_id, role')
                    .eq('user_id', userId)

                setRoles(
                    Object.fromEntries(
                        (mine ?? []).map((m): [string, string] => [
                            m.venue_id as string,
                            m.role as string,
                        ])
                    )
                )
            }

            setLoading(false)
        }

        load()
    }, [userId])

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="mx-auto max-w-7xl px-6 py-12">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">Local Play</h1>
                        <p className="mt-2 text-gray-600">
                            Pick a venue to see its courts and join the queue.
                        </p>
                    </div>

                    <Link
                        to="/local/new"
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        Set up a venue
                    </Link>
                </div>

                {error && (
                    <p className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>
                )}

                {loading && <p className="mt-10 text-center text-gray-500">Loading venues...</p>}

                <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {venues.map((venue) => {
                        const courtCount = venue.courts?.[0]?.count ?? 0

                        return (
                            <Link
                                key={venue.id}
                                to={`/local/${venue.code}`}
                                className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-md"
                            >
                                <div className="flex items-start justify-between gap-3">
                                    <h2 className="text-xl font-semibold text-gray-900">
                                        {venue.name}
                                    </h2>
                                    {roles[venue.id] === 'owner' && (
                                        <span className="shrink-0 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-700">
                                            You manage this
                                        </span>
                                    )}
                                </div>

                                {venue.location && (
                                    <p className="mt-3 flex items-center gap-2 text-sm text-gray-600">
                                        <MapPin size={16} />
                                        {venue.location}
                                    </p>
                                )}

                                <p className="mt-3 text-sm text-gray-500">
                                    {courtCount} {courtCount === 1 ? 'court' : 'courts'}
                                </p>
                            </Link>
                        )
                    })}
                </div>

                {!loading && venues.length === 0 && !error && (
                    <p className="mt-10 text-center text-gray-500">
                        No venues yet.{' '}
                        <Link to="/local/new" className="font-medium text-blue-600 hover:underline">
                            Set up the first one
                        </Link>
                    </p>
                )}
            </div>
        </div>
    )
}

export default LocalPlay