import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { SPORTS, labelFor } from '../lib/listings'
import {
    VENUE_SELECT,
    COURT_SELECT,
    SKILL_RESTRICTIONS,
    PLAYERS_NEEDED,
    COURT_STATUS,
    COURT_STATUS_STYLES,
    type Venue,
    type Court,
} from '../lib/venues.ts'

// What players see at a venue. The queue will live on this page.
//TODO: ADD QUEUE FUNCTIONALITY
function VenuePage() {
    const { code } = useParams()
    const { user } = useAuth()
    const userId = user?.id

    const [venue, setVenue] = useState<Venue | null>(null)
    const [courts, setCourts] = useState<Court[]>([])
    const [isOwner, setIsOwner] = useState(false)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function load() {
            setLoading(true)

            const { data: venueData, error: venueError } = await supabase
                .from('venues')
                .select(VENUE_SELECT)
                .eq('code', code ?? '')
                .maybeSingle()

            if (venueError) {
                setError(venueError.message)
                setLoading(false)
                return
            }

            if (!venueData) {
                setVenue(null)
                setLoading(false)
                return
            }

            const found = venueData as unknown as Venue
            setVenue(found)

            const { data: courtData, error: courtError } = await supabase
                .from('courts')
                .select(COURT_SELECT)
                .eq('venue_id', found.id)
                .order('sort_order')
                .order('name')

            if (courtError) setError(courtError.message)
            else setCourts((courtData ?? []) as unknown as Court[])

            if (userId) {
                const { data: membership } = await supabase
                    .from('venue_members')
                    .select('role')
                    .eq('venue_id', found.id)
                    .eq('user_id', userId)
                    .maybeSingle()

                setIsOwner(membership?.role === 'owner')
            }

            setLoading(false)
        }

        load()
    }, [code, userId])

    if (loading) return <div className="p-8 text-gray-500">Loading venue...</div>

    if (!venue) {
        return (
            <div className="mx-auto max-w-xl p-8 text-center">
                <p className="text-gray-600">{error ?? "We couldn't find that venue."}</p>
                <Link to="/local" className="mt-4 inline-block text-blue-600 hover:underline">
                    Back to venues
                </Link>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="mx-auto max-w-5xl px-6 py-12">
                <Link to="/local" className="text-sm text-gray-500 hover:text-blue-600">
                    &larr; All venues
                </Link>

                <div className="mt-4 flex flex-wrap items-start justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{venue.name}</h1>
                        {venue.location && (
                            <p className="mt-2 flex items-center gap-2 text-gray-600">
                                <MapPin size={16} />
                                {venue.location}
                            </p>
                        )}
                    </div>

                    {isOwner && (
                        <Link
                            to={`/local/${venue.code}/manage`}
                            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                            Manage venue
                        </Link>
                    )}
                </div>

                {error && (
                    <p className="mt-6 rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</p>
                )}

                {/* SHORT-TERM: placeholder until the queue is built (step 2). */}
                <div className="mt-8 rounded-xl border-2 border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
                    The queue is coming next. Groups will be able to join the line for a court
                    here.
                </div>

                <h2 className="mt-10 text-lg font-semibold text-gray-900">Courts</h2>

                <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {courts.map((court) => (
                        <div
                            key={court.id}
                            className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm"
                        >
                            <div className="flex items-center justify-between gap-2">
                                <h3 className="text-lg font-semibold text-gray-900">
                                    {court.name}
                                </h3>

                                {court.managed ? (
                                    <span
                                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                            COURT_STATUS_STYLES[court.status] ?? ''
                                        }`}
                                    >
                                        {labelFor(COURT_STATUS, court.status)}
                                    </span>
                                ) : (
                                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                                        Not managed by app
                                    </span>
                                )}
                            </div>

                            <div className="mt-3 flex flex-wrap gap-2 text-xs">
                                <span className="rounded-full bg-blue-100 px-2.5 py-1 font-semibold text-blue-700">
                                    {labelFor(SPORTS, court.sport)}
                                </span>
                                <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">
                                    {labelFor(PLAYERS_NEEDED, String(court.players_needed))}
                                </span>
                                {court.skill_restriction !== 'open' && (
                                    <span className="rounded-full bg-purple-100 px-2.5 py-1 font-semibold text-purple-700">
                                        {labelFor(SKILL_RESTRICTIONS, court.skill_restriction)}
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {courts.length === 0 && (
                    <p className="mt-4 text-sm text-gray-500">
                        No courts have been added to this venue yet.
                    </p>
                )}
            </div>
        </div>
    )
}

export default VenuePage