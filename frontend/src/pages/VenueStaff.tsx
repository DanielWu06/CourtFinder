import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import {
    DndContext,
    KeyboardSensor,
    PointerSensor,
    closestCenter,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core'
import {
    SortableContext,
    arrayMove,
    sortableKeyboardCoordinates,
    useSortable,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { SPORTS, PLAYER_SKILLS, labelFor, type Notice } from '../lib/listings'
import {
    VENUE_SELECT,
    COURT_STATUS,
    COURT_STATUS_STYLES,
    type Venue,
    type Court,
} from '../lib/venues'
import {
    staffApi,
    groupTitle,
    memberName,
    formatName,
    MAX_GROUP_SIZE,
    type QueueGroup,
} from '../lib/queue'
import { useVenueQueue } from '../lib/useVenueQueue'
import { Countdown, Elapsed } from '../components/LiveClock'

type Run = (
    action: () => PromiseLike<{ error: { message: string } | null }>,
    successText?: string
) => Promise<boolean>

const baseButton =
    'rounded-lg border px-3 py-1.5 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-50'
const neutralButton = `${baseButton} border-gray-300 text-gray-700 hover:bg-gray-50`
const dangerButton = `${baseButton} border-red-200 text-red-600 hover:bg-red-50`
const primaryButton = `${baseButton} border-blue-600 bg-blue-600 text-white hover:bg-blue-700`
const successButton = `${baseButton} border-green-600 bg-green-600 text-white hover:bg-green-700`

const inputClass =
    'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

function Chips({ group }: { group: QueueGroup }) {
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

// ---------------------------------------------------------------
// Courts
// ---------------------------------------------------------------
function CourtPanel({
    court,
    occupant,
    venue,
    run,
    busy,
}: {
    court: Court
    occupant: QueueGroup | undefined
    venue: Venue
    run: Run
    busy: boolean
}) {
    function endGame() {
        if (!occupant) return
        if (!window.confirm(`End the game on ${court.name}? The court will be freed.`)) return
        run(() => staffApi.endGame(occupant.id), `${court.name} is free.`)
    }

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-gray-900">{court.name}</h3>

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

            <p className="mt-1 text-xs text-gray-500">
                {labelFor(SPORTS, court.sport)} · {formatName(court.players_needed)}
            </p>

            {court.managed && occupant && (
                <div className="mt-3 text-sm text-gray-600">
                    <p className="font-medium text-gray-800">
                        {occupant.status === 'called' ? 'Called' : 'Playing'}: {groupTitle(occupant)}
                    </p>
                    <Chips group={occupant} />

                    {occupant.status === 'called' && occupant.expires_at && (
                        <p className="mt-2">
                            Time left to respond: <Countdown until={occupant.expires_at} />
                        </p>
                    )}
                    {occupant.status === 'playing' && occupant.started_at && (
                        <p className="mt-2">
                            Time on court:{' '}
                            <Elapsed
                                since={occupant.started_at}
                                limitMinutes={venue.time_limit_minutes}
                                extraMinutes={occupant.extra_minutes}
                                strict={venue.strict_time_limit}
                            />
                            {occupant.extra_minutes > 0 && (
                                <span className="ml-2 text-xs text-gray-500">
                                    (+{occupant.extra_minutes} min granted)
                                </span>
                            )}
                        </p>
                    )}
                </div>
            )}

            {court.managed && (
                <div className="mt-3 flex flex-wrap gap-2">
                    {court.status === 'held' && occupant && (
                        <>
                            <button
                                disabled={busy}
                                onClick={() =>
                                    run(() => staffApi.respond(occupant.id, true), 'Game started.')
                                }
                                className={successButton}
                            >
                                They're here: start
                            </button>
                            <button
                                disabled={busy}
                                onClick={() =>
                                    run(() => staffApi.respond(occupant.id, false), 'Deferred.')
                                }
                                className={neutralButton}
                            >
                                Defer
                            </button>
                            <button
                                disabled={busy}
                                onClick={() =>
                                    run(
                                        () => staffApi.cancelCall(occupant.id),
                                        'Call cancelled. The group keeps its place.'
                                    )
                                }
                                className={neutralButton}
                            >
                                Cancel call (keep place)
                            </button>
                        </>
                    )}

                    {court.status === 'occupied' && occupant && (
                        <>
                            {venue.time_limit_minutes && (
                                <button
                                    disabled={busy}
                                    onClick={() =>
                                        run(
                                            () => staffApi.extendGame(occupant.id, 5),
                                            `Gave ${groupTitle(occupant)} 5 more minutes.`
                                        )
                                    }
                                    className={neutralButton}
                                >
                                    +5 min
                                </button>
                            )}
                            <button disabled={busy} onClick={endGame} className={dangerButton}>
                                End game
                            </button>
                        </>
                    )}

                    {court.status === 'available' && (
                        <button
                            disabled={busy}
                            onClick={() =>
                                run(
                                    () => staffApi.setCourtStatus(court.id, 'unavailable'),
                                    `${court.name} is out of service.`
                                )
                            }
                            className={neutralButton}
                        >
                            Mark out of service
                        </button>
                    )}

                    {court.status === 'unavailable' && (
                        <button
                            disabled={busy}
                            onClick={() =>
                                run(
                                    () => staffApi.setCourtStatus(court.id, 'available'),
                                    `${court.name} is back in service.`
                                )
                            }
                            className={neutralButton}
                        >
                            Return to service
                        </button>
                    )}
                </div>
            )}
        </div>
    )
}

// ---------------------------------------------------------------
// One waiting group in the queue (draggable by its handle)
// ---------------------------------------------------------------
function GroupRow({
    group,
    index,
    orderedIds,
    freeCourts,
    run,
    busy,
}: {
    group: QueueGroup
    index: number
    // Waiting groups in queue order, so moves can be expressed as "after X".
    orderedIds: string[]
    freeCourts: Court[]
    run: Run
    busy: boolean
}) {
    const [courtId, setCourtId] = useState('')
    const [guestName, setGuestName] = useState('')

    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: group.id,
        disabled: busy,
    })

    const style = { transform: CSS.Transform.toString(transform), transition }

    const title = groupTitle(group)
    const missing = Math.max(0, group.players_needed - group.group_members.length)
    const skippedUntil =
        group.deferred_until && new Date(group.deferred_until).getTime() > Date.now()
            ? group.deferred_until
            : null

    const isFirst = index === 0
    const isLast = index === orderedIds.length - 1
    // Up = after the group two places above (or the front); Down = after the next one.
    const upTarget = index >= 2 ? orderedIds[index - 2] : null
    const downTarget = orderedIds[index + 1]

    const chosenCourt = freeCourts.some((court) => court.id === courtId) ? courtId : ''

    function handleRemove() {
        if (!window.confirm(`Remove ${title} from the queue?`)) return
        run(() => staffApi.removeGroup(group.id), `${title} was removed.`)
    }

    async function handleAddGuest() {
        const name = guestName.trim()
        if (!name) return

        const ok = await run(() => staffApi.addGuest(group.id, name))
        if (ok) setGuestName('')
    }

    return (
        <li
            ref={setNodeRef}
            style={style}
            className={`rounded-xl border bg-white p-4 ${
                isDragging ? 'relative z-10 border-blue-300 shadow-lg' : 'border-gray-200'
            }`}
        >
            <div className="flex gap-3">
                <div className="flex flex-col items-center gap-2">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gray-100 text-sm font-semibold text-gray-700">
                        {index + 1}
                    </div>

                    <button
                        type="button"
                        aria-label={`Drag ${title} to reorder`}
                        title="Drag to reorder"
                        disabled={busy}
                        {...attributes}
                        {...listeners}
                        className="cursor-grab touch-none rounded px-1 text-lg leading-none text-gray-400 hover:text-gray-700 active:cursor-grabbing disabled:cursor-not-allowed disabled:opacity-40"
                    >
                        ⋮⋮
                    </button>
                </div>

                <div className="min-w-0 flex-1">
                    <p className="font-medium text-gray-900">{title}</p>
                    <Chips group={group} />

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
                        {missing > 0 && (
                            <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-700">
                                Needs {missing} more
                            </span>
                        )}
                        {group.defer_count > 0 && (
                            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-gray-600">
                                Deferred {group.defer_count}×
                            </span>
                        )}
                        {skippedUntil && (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-amber-700">
                                Skipped for <Countdown until={skippedUntil} />
                            </span>
                        )}
                    </div>

                    {/* Reordering buttons (same action as dragging) */}
                    <div className="mt-3 flex flex-wrap gap-2">
                        <button
                            disabled={busy || isFirst}
                            onClick={() => run(() => staffApi.moveGroup(group.id, null))}
                            className={neutralButton}
                        >
                            Top
                        </button>
                        <button
                            disabled={busy || isFirst}
                            onClick={() => run(() => staffApi.moveGroup(group.id, upTarget))}
                            className={neutralButton}
                        >
                            Up
                        </button>
                        <button
                            disabled={busy || isLast}
                            onClick={() => run(() => staffApi.moveGroup(group.id, downTarget))}
                            className={neutralButton}
                        >
                            Down
                        </button>
                        <button disabled={busy} onClick={handleRemove} className={dangerButton}>
                            Remove
                        </button>
                    </div>

                    {/* Give a free court, ignoring eligibility */}
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                        <select
                            value={chosenCourt}
                            onChange={(event) => setCourtId(event.target.value)}
                            className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs"
                        >
                            <option value="">
                                {freeCourts.length === 0 ? 'No free courts' : 'Choose a free court'}
                            </option>
                            {freeCourts.map((court) => (
                                <option key={court.id} value={court.id}>
                                    {court.name} ({labelFor(SPORTS, court.sport)},{' '}
                                    {formatName(court.players_needed)})
                                </option>
                            ))}
                        </select>

                        <button
                            disabled={busy || !chosenCourt}
                            onClick={() =>
                                run(
                                    () => staffApi.assignCourt(group.id, chosenCourt, false),
                                    `${title} was called.`
                                )
                            }
                            className={neutralButton}
                        >
                            Call
                        </button>
                        <button
                            disabled={busy || !chosenCourt}
                            onClick={() =>
                                run(
                                    () => staffApi.assignCourt(group.id, chosenCourt, true),
                                    `${title} is on the court.`
                                )
                            }
                            className={primaryButton}
                        >
                            Start now
                        </button>
                    </div>

                    {/* Roster edits */}
                    <details className="mt-3 text-sm">
                        <summary className="cursor-pointer text-xs font-medium text-gray-600">
                            Edit players
                        </summary>

                        <ul className="mt-2 divide-y divide-gray-100">
                            {group.group_members.map((member) => (
                                <li
                                    key={member.id}
                                    className="flex items-center justify-between py-1.5"
                                >
                                    <span className="text-gray-800">
                                        {memberName(member)}
                                        {member.user_id === null && (
                                            <span className="ml-2 text-xs text-gray-500">Guest</span>
                                        )}
                                    </span>
                                    <button
                                        disabled={busy}
                                        onClick={() => run(() => staffApi.removeMember(member.id))}
                                        className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                                    >
                                        Remove
                                    </button>
                                </li>
                            ))}
                        </ul>

                        <div className="mt-2 flex gap-2">
                            <input
                                value={guestName}
                                maxLength={40}
                                onChange={(event) => setGuestName(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') handleAddGuest()
                                }}
                                placeholder="Add a name"
                                className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-1.5 text-sm outline-none focus:border-blue-500"
                            />
                            <button
                                disabled={
                                    busy ||
                                    !guestName.trim() ||
                                    group.group_members.length >= MAX_GROUP_SIZE
                                }
                                onClick={handleAddGuest}
                                className={neutralButton}
                            >
                                Add
                            </button>
                        </div>
                    </details>
                </div>
            </div>
        </li>
    )
}

// ---------------------------------------------------------------
// Add a walk-up group
// ---------------------------------------------------------------
function WalkupForm({
    venue,
    courts,
    run,
    busy,
}: {
    venue: Venue
    courts: Court[]
    run: Run
    busy: boolean
}) {
    const [sport, setSport] = useState('')
    const [format, setFormat] = useState('')
    const [skill, setSkill] = useState('beginner')
    const [namesText, setNamesText] = useState('')

    // Same idea as the player form: only offer what the venue has courts for.
    const managed = courts.filter((court) => court.managed)
    const sports = [...new Set(managed.map((court) => court.sport))]
    const effectiveSport = sports.includes(sport) ? sport : sports[0]
    const formats = [
        ...new Set(
            managed.filter((court) => court.sport === effectiveSport).map((court) => court.players_needed)
        ),
    ]
    const effectiveFormat = formats.includes(Number(format)) ? Number(format) : formats[0]

    const names = namesText
        .split(/[\n,]+/)
        .map((name) => name.trim())
        .filter(Boolean)

    async function handleAdd() {
        if (!effectiveSport || !effectiveFormat || names.length === 0) return

        const ok = await run(
            () =>
                staffApi.addWalkup({
                    venueId: venue.id,
                    sport: effectiveSport,
                    playersNeeded: effectiveFormat,
                    skill,
                    names,
                }),
            'Walk-up group added to the queue.'
        )
        if (ok) setNamesText('')
    }

    if (managed.length === 0) {
        return (
            <p className="text-sm text-gray-500">
                Add at least one app-managed court before adding groups.
            </p>
        )
    }

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900">Add a walk-up group</h3>
            <p className="mt-1 text-xs text-gray-500">
                For people without the app. You answer calls for them.
            </p>

            <div className="mt-3 grid grid-cols-3 gap-3">
                <label className="block text-xs font-medium text-gray-700">
                    Sport
                    <select
                        value={effectiveSport}
                        onChange={(event) => setSport(event.target.value)}
                        className={inputClass}
                    >
                        {sports.map((value) => (
                            <option key={value} value={value}>
                                {labelFor(SPORTS, value)}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="block text-xs font-medium text-gray-700">
                    Format
                    <select
                        value={effectiveFormat}
                        onChange={(event) => setFormat(event.target.value)}
                        className={inputClass}
                    >
                        {formats.map((value) => (
                            <option key={value} value={value}>
                                {formatName(value)}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="block text-xs font-medium text-gray-700">
                    Skill
                    <select
                        value={skill}
                        onChange={(event) => setSkill(event.target.value)}
                        className={inputClass}
                    >
                        {PLAYER_SKILLS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            <label className="mt-3 block text-xs font-medium text-gray-700">
                Names (one per line)
                <textarea
                    rows={3}
                    value={namesText}
                    onChange={(event) => setNamesText(event.target.value)}
                    placeholder={'Sam\nJordan\nLee\nTaylor'}
                    className={inputClass}
                />
            </label>

            <button
                onClick={handleAdd}
                disabled={busy || names.length === 0}
                className={`mt-3 w-full ${primaryButton}`}
            >
                Add to queue
            </button>
        </div>
    )
}

// ---------------------------------------------------------------
// Venue tools: clear the queue, close for the night, delete old history
// ---------------------------------------------------------------
function VenueTools({
    venue,
    isOwner,
    queueCount,
    run,
    busy,
}: {
    venue: Venue
    isOwner: boolean
    // Waiting plus called groups.
    queueCount: number
    run: Run
    busy: boolean
}) {
    const [days, setDays] = useState('30')

    function clearQueue() {
        const ok = window.confirm(
            `Remove all ${queueCount} waiting or called ${queueCount === 1 ? 'group' : 'groups'}? Games in progress keep going.`
        )
        if (!ok) return

        run(() => staffApi.clearVenue(venue.id, false), 'The queue was cleared.')
    }

    function closeForNight() {
        const ok = window.confirm(
            'Close for the night? This removes every group and ends every game in progress. Courts marked out of service stay that way.'
        )
        if (!ok) return

        run(() => staffApi.clearVenue(venue.id, true), 'Everything was cleared for the night.')
    }

    function purgeHistory() {
        const scope =
            days === '0'
                ? 'ALL finished games, groups and log entries'
                : `finished games, groups and log entries older than ${days} days`

        if (!window.confirm(`Permanently delete ${scope}? This can't be undone.`)) return

        run(() => staffApi.purgeHistory(venue.id, Number(days)), 'Old history was deleted.')
    }

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <h3 className="font-semibold text-gray-900">Venue tools</h3>
            <p className="mt-1 text-xs text-gray-500">For the end of a session. Every action is logged.</p>

            <div className="mt-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800">Clear the queue</p>
                        <p className="text-xs text-gray-500">
                            Removes every waiting or called group. Games in progress keep going.
                        </p>
                    </div>
                    <button
                        disabled={busy || queueCount === 0}
                        onClick={clearQueue}
                        className={dangerButton}
                    >
                        Clear queue ({queueCount})
                    </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-gray-800">Close for the night</p>
                        <p className="text-xs text-gray-500">
                            Clears the queue and ends every game in progress.
                        </p>
                    </div>
                    <button disabled={busy} onClick={closeForNight} className={dangerButton}>
                        Close for the night
                    </button>
                </div>

                {isOwner && (
                    <div className="border-t border-gray-100 pt-4">
                        <p className="text-sm font-medium text-gray-800">Delete old history</p>
                        <p className="text-xs text-gray-500">
                            Permanently deletes finished games, groups and log entries. Groups still
                            in the queue or on a court are never touched. Owner only.
                        </p>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            <select
                                value={days}
                                onChange={(event) => setDays(event.target.value)}
                                className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs"
                            >
                                <option value="7">Older than 7 days</option>
                                <option value="30">Older than 30 days</option>
                                <option value="90">Older than 90 days</option>
                                <option value="0">Everything finished</option>
                            </select>
                            <button disabled={busy} onClick={purgeHistory} className={dangerButton}>
                                Delete history
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}

// ---------------------------------------------------------------
// Recent activity (from the action log)
// ---------------------------------------------------------------
type EventRow = {
    id: number
    kind: string
    group_id: string | null
    created_at: string
    actor: { display_name: string | null } | null
}

const EVENT_LABELS: Record<string, string> = {
    group_created: 'joined the queue',
    member_joined: 'gained a player',
    member_removed: 'lost a player',
    guest_added: 'added a guest',
    leader_changed: 'changed leader',
    called: 'was called for a court',
    accepted: 'took the court',
    deferred: 'deferred',
    call_expired: 'missed the call',
    group_done: 'finished playing',
    group_left: 'left the queue',
    group_removed: 'was removed by staff',
    walkup_added: 'was added as a walk-up',
    staff_moved: 'was moved in line',
    staff_called: 'was called by staff',
    staff_started: 'was put on a court',
    staff_accepted: 'was started by staff',
    staff_deferred: 'was deferred by staff',
    staff_cancelled_call: 'had the call cancelled',
    staff_guest_added: 'had a name added by staff',
    staff_member_removed: 'had a player removed by staff',
    staff_extended: 'was given more time',
    court_status: 'court status changed',
    queue_cleared: 'queue cleared by staff',
    venue_closed: 'venue closed for the night',
    history_purged: 'old history deleted',
    auto_calling_on: 'automatic calling turned on',
    auto_calling_off: 'automatic calling turned off',
}

function ActivityFeed({ venueId, groups }: { venueId: string; groups: QueueGroup[] }) {
    const [events, setEvents] = useState<EventRow[]>([])

    useEffect(() => {
        let active = true

        async function load() {
            const { data } = await supabase
                .from('queue_events')
                .select(
                    'id, kind, group_id, created_at, actor:profiles!queue_events_actor_id_fkey(display_name)'
                )
                .eq('venue_id', venueId)
                .order('created_at', { ascending: false })
                .limit(15)

            if (active) setEvents((data ?? []) as unknown as EventRow[])
        }

        load()
        const timer = window.setInterval(load, 8000)

        return () => {
            active = false
            window.clearInterval(timer)
        }
    }, [venueId])

    const titles = new Map(
        groups.map((group): [string, string] => [group.id, groupTitle(group)])
    )

    return (
        <div>
            <h2 className="text-lg font-semibold text-gray-900">Recent activity</h2>

            {events.length === 0 ? (
                <p className="mt-3 text-sm text-gray-500">Nothing has happened yet.</p>
            ) : (
                <ul className="mt-3 divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white">
                    {events.map((event) => {
                        const groupTitleText = event.group_id ? titles.get(event.group_id) : undefined

                        return (
                            <li key={event.id} className="px-4 py-2 text-sm text-gray-700">
                                <span className="tabular-nums text-xs text-gray-400">
                                    {new Date(event.created_at).toLocaleTimeString([], {
                                        hour: 'numeric',
                                        minute: '2-digit',
                                    })}
                                </span>{' '}
                                {groupTitleText && (
                                    <span className="font-medium text-gray-900">{groupTitleText} </span>
                                )}
                                {EVENT_LABELS[event.kind] ?? event.kind}
                                <span className="text-xs text-gray-400">
                                    {' '}
                                    · {event.actor?.display_name ?? 'automatic'}
                                </span>
                            </li>
                        )
                    })}
                </ul>
            )}
        </div>
    )
}

// ---------------------------------------------------------------
// Page
// ---------------------------------------------------------------
function VenueStaff() {
    const { code } = useParams()
    const { user } = useAuth()
    const userId = user?.id

    const [venue, setVenue] = useState<Venue | null>(null)
    const [isStaff, setIsStaff] = useState(false)
    const [role, setRole] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [busy, setBusy] = useState(false)
    const [notice, setNotice] = useState<Notice | null>(null)
    // Shows a dropped group in its new place immediately, until the server
    // confirms the move and the real order comes back.
    const [localOrder, setLocalOrder] = useState<string[] | null>(null)

    const { courts, groups, loaded, error: queueError, refresh } = useVenueQueue(venue?.id)

    // A small drag distance keeps ordinary clicks from starting a drag, and the
    // keyboard sensor makes reordering possible without a mouse.
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    )

    const reloadVenue = useCallback(async () => {
        const { data } = await supabase
            .from('venues')
            .select(VENUE_SELECT)
            .eq('code', code ?? '')
            .maybeSingle()

        if (data) setVenue(data as unknown as Venue)
    }, [code])

    useEffect(() => {
        async function load() {
            setLoading(true)

            const { data, error } = await supabase
                .from('venues')
                .select(VENUE_SELECT)
                .eq('code', code ?? '')
                .maybeSingle()

            if (error || !data) {
                setVenue(null)
                setLoading(false)
                return
            }

            const found = data as unknown as Venue
            setVenue(found)

            if (userId) {
                const { data: membership } = await supabase
                    .from('venue_members')
                    .select('role')
                    .eq('venue_id', found.id)
                    .eq('user_id', userId)
                    .maybeSingle()

                setIsStaff(Boolean(membership))
                setRole((membership?.role as string | undefined) ?? null)
            }

            setLoading(false)
        }

        load()
    }, [code, userId])

    const run: Run = async (action, successText) => {
        setBusy(true)
        setNotice(null)

        const { error } = await action()

        if (error) setNotice({ type: 'error', text: error.message })
        else if (successText) setNotice({ type: 'success', text: successText })

        await refresh()
        setBusy(false)
        return !error
    }

    async function toggleAutoCalling() {
        if (!venue) return

        const turningOn = !venue.auto_calling
        const ok = await run(
            () => staffApi.setAutoCalling(venue.id, turningOn),
            turningOn ? 'Automatic calling is on.' : 'Manual mode: nothing will be called automatically.'
        )
        if (ok) await reloadVenue()
    }

    if (loading) return <div className="p-8 text-gray-500">Loading...</div>

    if (!venue) {
        return (
            <div className="mx-auto max-w-xl p-8 text-center">
                <p className="text-gray-600">We couldn't find that venue.</p>
                <Link to="/local" className="mt-4 inline-block text-blue-600 hover:underline">
                    Back to venues
                </Link>
            </div>
        )
    }

    if (!isStaff) {
        return (
            <div className="mx-auto max-w-xl p-8 text-center">
                <p className="text-gray-600">Only venue staff can see this page.</p>
                <Link
                    to={`/local/${venue.code}`}
                    className="mt-4 inline-block text-blue-600 hover:underline"
                >
                    Back to {venue.name}
                </Link>
            </div>
        )
    }

    const serverWaiting = groups
        .filter((group) => group.status === 'waiting')
        .sort((a, b) => a.sort_key - b.sort_key)

    const waiting = localOrder
        ? [...serverWaiting].sort((a, b) => {
              const first = localOrder.indexOf(a.id)
              const second = localOrder.indexOf(b.id)
              return (first === -1 ? 1e9 : first) - (second === -1 ? 1e9 : second)
          })
        : serverWaiting

    const orderedIds = waiting.map((group) => group.id)

    const queueCount = groups.filter(
        (group) => group.status === 'waiting' || group.status === 'called'
    ).length

    const freeCourts = courts.filter((court) => court.managed && court.status === 'available')

    // Dropping a group sends one move: "place it after the group now above it",
    // or to the front if it landed first. Same action as the Top/Up/Down buttons.
    async function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event
        if (!over || active.id === over.id) return

        const movedId = String(active.id)
        const from = orderedIds.indexOf(movedId)
        const to = orderedIds.indexOf(String(over.id))
        if (from === -1 || to === -1) return

        const next = arrayMove(orderedIds, from, to)
        const newIndex = next.indexOf(movedId)
        const afterId = newIndex === 0 ? null : next[newIndex - 1]

        setLocalOrder(next)
        await run(() => staffApi.moveGroup(movedId, afterId))
        setLocalOrder(null)
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="mx-auto max-w-6xl px-6 py-12">
                <Link
                    to={`/local/${venue.code}`}
                    className="text-sm text-gray-500 hover:text-blue-600"
                >
                    &larr; Back to {venue.name}
                </Link>
                <h1 className="mt-4 text-3xl font-bold text-gray-900">Staff queue</h1>

                {/* Manual mode switch */}
                <div
                    className={`mt-6 flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 ${
                        venue.auto_calling
                            ? 'border-green-200 bg-green-50'
                            : 'border-amber-300 bg-amber-50'
                    }`}
                >
                    <div>
                        <p className="font-semibold text-gray-900">
                            {venue.auto_calling
                                ? 'Automatic calling is on'
                                : 'Manual mode: nothing is called automatically'}
                        </p>
                        <p className="mt-1 text-sm text-gray-600">
                            {venue.auto_calling
                                ? 'Free courts call the next matching group on their own. Your actions below still work.'
                                : 'Use Call or Start now to put groups on courts. Calls already out still expire normally, and the strict time limit is paused.'}
                        </p>
                    </div>
                    <button disabled={busy} onClick={toggleAutoCalling} className={neutralButton}>
                        {venue.auto_calling ? 'Switch to manual' : 'Turn automatic calling on'}
                    </button>
                </div>

                {(notice || queueError) && (
                    <p
                        className={`mt-6 rounded-lg p-4 text-sm ${
                            notice?.type === 'success' && !queueError
                                ? 'bg-green-50 text-green-700'
                                : 'bg-red-50 text-red-700'
                        }`}
                    >
                        {notice?.text ?? queueError}
                    </p>
                )}

                <div className="mt-8 grid gap-10 lg:grid-cols-2">
                    <div className="space-y-8">
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900">
                                Waiting ({waiting.length})
                            </h2>
                            {waiting.length > 1 && (
                                <p className="mt-1 text-xs text-gray-500">
                                    Drag a group by its handle to reorder, or use the buttons.
                                </p>
                            )}

                            {!loaded ? (
                                <p className="mt-3 text-sm text-gray-500">Loading the queue...</p>
                            ) : waiting.length === 0 ? (
                                <p className="mt-3 text-sm text-gray-500">Nobody is waiting.</p>
                            ) : (
                                <DndContext
                                    sensors={sensors}
                                    collisionDetection={closestCenter}
                                    onDragEnd={handleDragEnd}
                                >
                                    <SortableContext
                                        items={orderedIds}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        <ol className="mt-3 space-y-3">
                                            {waiting.map((group, index) => (
                                                <GroupRow
                                                    key={group.id}
                                                    group={group}
                                                    index={index}
                                                    orderedIds={orderedIds}
                                                    freeCourts={freeCourts}
                                                    run={run}
                                                    busy={busy}
                                                />
                                            ))}
                                        </ol>
                                    </SortableContext>
                                </DndContext>
                            )}
                        </section>

                        <WalkupForm venue={venue} courts={courts} run={run} busy={busy} />

                        <VenueTools
                            venue={venue}
                            isOwner={role === 'owner'}
                            queueCount={queueCount}
                            run={run}
                            busy={busy}
                        />
                    </div>

                    <div className="space-y-8">
                        <section>
                            <h2 className="text-lg font-semibold text-gray-900">Courts</h2>

                            <div className="mt-3 space-y-3">
                                {courts.map((court) => (
                                    <CourtPanel
                                        key={court.id}
                                        court={court}
                                        venue={venue}
                                        run={run}
                                        busy={busy}
                                        occupant={groups.find(
                                            (group) =>
                                                group.court_id === court.id &&
                                                (group.status === 'called' ||
                                                    group.status === 'playing')
                                        )}
                                    />
                                ))}
                            </div>
                        </section>

                        <ActivityFeed venueId={venue.id} groups={groups} />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default VenueStaff