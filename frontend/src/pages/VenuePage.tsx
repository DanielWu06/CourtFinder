import { useEffect, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { MapPin } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { SPORTS, PLAYER_SKILLS, labelFor, type Notice } from '../lib/listings'
import {
    VENUE_SELECT,
    SKILL_RESTRICTIONS,
    COURT_STATUS,
    COURT_STATUS_STYLES,
    type Venue,
    type Court,
} from '../lib/venues'
import { memberName, groupTitle, formatName, type QueueGroup } from '../lib/queue'
import { useVenueQueue } from '../lib/useVenueQueue'
import { useCallAlert } from '../lib/alerts'
import { Countdown, Elapsed } from '../components/LiveClock'
import MyGroupPanel from '../components/MyGroupPanel'
import JoinQueuePanel from '../components/JoinQueuePanel'

type MiniProfile = { display_name: string | null; skill_level: string | null }

function Roster({ group }: { group: QueueGroup }) {
    return (
        <div className="mt-2 flex flex-wrap gap-1.5">
            {group.group_members.map((member) => (
                <span
                    key={member.id}
                    className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700"
                >
                    {memberName(member)}
                </span>
            ))}
        </div>
    )
}

function QueueList({ groups, userId }: { groups: QueueGroup[]; userId: string | undefined }) {
    if (groups.length === 0) {
        return <p className="text-sm text-gray-500">Nobody is waiting right now.</p>
    }

    // Place counts waiting groups only; a called group is already on its way.
    const positions = new Map<string, number>()
    groups
        .filter((group) => group.status === 'waiting')
        .forEach((group, index) => positions.set(group.id, index + 1))

    return (
        <ol className="space-y-3">
            {groups.map((group) => {
                const mine = group.group_members.some((member) => member.user_id === userId)
                const called = group.status === 'called'
                const missing = Math.max(0, group.players_needed - group.group_members.length)

                return (
                    <li
                        key={group.id}
                        className={`flex gap-3 rounded-xl border p-4 ${
                            mine ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
                        }`}
                    >
                        <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                                called ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'
                            }`}
                        >
                            {called ? '!' : positions.get(group.id)}
                        </div>

                        <div className="min-w-0 flex-1">
                            <p className="font-medium text-gray-900">
                                {groupTitle(group)}
                                {mine && ' (you)'}
                            </p>

                            <Roster group={group} />

                            <div className="mt-2 flex flex-wrap gap-2 text-xs">
                                <span className="rounded-full bg-blue-100 px-2 py-0.5 font-semibold text-blue-700">
                                    {labelFor(SPORTS, group.sport)}
                                </span>
                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">
                                    {formatName(group.players_needed)}
                                </span>
                                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-700">
                                    {labelFor(PLAYER_SKILLS, group.skill_level)}
                                </span>
                                {called && (
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 font-semibold text-amber-700">
                                        Called
                                    </span>
                                )}
                                {missing > 0 && (
                                    <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-700">
                                        Needs {missing} more
                                    </span>
                                )}
                            </div>
                        </div>
                    </li>
                )
            })}
        </ol>
    )
}

function CourtCard({
    court,
    occupant,
    venue,
}: {
    court: Court
    occupant: QueueGroup | undefined
    venue: Venue
}) {
    return (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-semibold text-gray-900">{court.name}</h3>

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
                    {formatName(court.players_needed)}
                </span>
                {court.skill_restriction !== 'open' && (
                    <span className="rounded-full bg-purple-100 px-2.5 py-1 font-semibold text-purple-700">
                        {labelFor(SKILL_RESTRICTIONS, court.skill_restriction)}
                    </span>
                )}
            </div>

            {court.managed && occupant && (
                <div className="mt-3 border-t border-gray-100 pt-3 text-sm text-gray-600">
                    <p className="font-medium text-gray-800">
                        {occupant.status === 'called' ? 'Called' : 'Playing'}: {groupTitle(occupant)}
                    </p>
                    <Roster group={occupant} />

                    {occupant.status === 'called' && occupant.expires_at && (
                        <p className="mt-2">
                            Waiting for a response: <Countdown until={occupant.expires_at} />
                        </p>
                    )}
                    {occupant.status === 'playing' && occupant.started_at && (
                        <p className="mt-2">
                            Time on court:{' '}
                            <Elapsed since={occupant.started_at} limitMinutes={venue.time_limit_minutes} />
                        </p>
                    )}
                </div>
            )}
        </div>
    )
}

function VenuePage() {
    const { code } = useParams()
    const [searchParams] = useSearchParams()
    const { user } = useAuth()
    const userId = user?.id

    const [venue, setVenue] = useState<Venue | null>(null)
    const [isOwner, setIsOwner] = useState(false)
    const [profile, setProfile] = useState<MiniProfile | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [notice, setNotice] = useState<Notice | null>(null)

    const { courts, groups, loaded, error: queueError, refresh } = useVenueQueue(venue?.id)

    // The queue sorted by place, and the signed-in player's own group.
    const queueGroups = groups
        .filter((group) => group.status === 'waiting' || group.status === 'called')
        .sort((a, b) => a.sort_key - b.sort_key)

    const myGroup =
        groups.find((group) => group.group_members.some((member) => member.user_id === userId)) ??
        null

    const waitingGroups = queueGroups.filter((group) => group.status === 'waiting')
    const position =
        myGroup && myGroup.status === 'waiting'
            ? waitingGroups.findIndex((group) => group.id === myGroup.id) + 1
            : null

    const myCourtName = courts.find((court) => court.id === myGroup?.court_id)?.name ?? 'A court'
    useCallAlert(myGroup, `${myCourtName} is ready for your group!`)

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

            if (userId) {
                const [membershipResult, profileResult] = await Promise.all([
                    supabase
                        .from('venue_members')
                        .select('role')
                        .eq('venue_id', found.id)
                        .eq('user_id', userId)
                        .maybeSingle(),
                    supabase
                        .from('profiles')
                        .select('display_name, skill_level')
                        .eq('id', userId)
                        .maybeSingle(),
                ])

                setIsOwner(membershipResult.data?.role === 'owner')
                setProfile((profileResult.data as MiniProfile | null) ?? null)
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
            <div className="mx-auto max-w-6xl px-6 py-12">
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

                {!venue.auto_calling && (
                    <p className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-800">
                        Automatic calling is off at this venue right now. Staff are calling groups
                        manually.
                    </p>
                )}

                {(notice || error || queueError) && (
                    <p
                        className={`mt-6 rounded-lg p-4 text-sm ${
                            notice?.type === 'success' && !error && !queueError
                                ? 'bg-green-50 text-green-700'
                                : 'bg-red-50 text-red-700'
                        }`}
                    >
                        {notice?.text ?? error ?? queueError}
                    </p>
                )}

                <div className="mt-8">
                    {!loaded ? (
                        <p className="text-sm text-gray-500">Loading the queue...</p>
                    ) : myGroup && userId ? (
                        <MyGroupPanel
                            group={myGroup}
                            venue={venue}
                            courts={courts}
                            userId={userId}
                            position={position}
                            onChange={refresh}
                            onNotice={setNotice}
                        />
                    ) : (
                        <JoinQueuePanel
                            venue={venue}
                            courts={courts}
                            profile={profile}
                            initialCode={searchParams.get('join') ?? ''}
                            onChange={refresh}
                            onNotice={setNotice}
                        />
                    )}
                </div>

                <div className="mt-10 grid gap-10 lg:grid-cols-2">
                    <section>
                        <h2 className="text-lg font-semibold text-gray-900">
                            Queue ({queueGroups.length})
                        </h2>
                        <div className="mt-4">
                            <QueueList groups={queueGroups} userId={userId} />
                        </div>
                    </section>

                    <section>
                        <h2 className="text-lg font-semibold text-gray-900">Courts</h2>

                        <div className="mt-4 space-y-4">
                            {courts.map((court) => (
                                <CourtCard
                                    key={court.id}
                                    court={court}
                                    venue={venue}
                                    occupant={groups.find(
                                        (group) =>
                                            group.court_id === court.id &&
                                            (group.status === 'called' || group.status === 'playing')
                                    )}
                                />
                            ))}
                        </div>

                        {loaded && courts.length === 0 && (
                            <p className="mt-4 text-sm text-gray-500">
                                No courts have been added to this venue yet.
                            </p>
                        )}
                    </section>
                </div>
            </div>
        </div>
    )
}

export default VenuePage