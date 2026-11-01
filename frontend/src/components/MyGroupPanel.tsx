import { useEffect, useState } from 'react'
import { SPORTS, PLAYER_SKILLS, labelFor, type Notice } from '../lib/listings'
import type { Venue, Court } from '../lib/venues'
import {
    queueApi,
    memberName,
    formatName,
    MAX_GROUP_SIZE,
    type QueueGroup,
} from '../lib/queue'
import { alertsReady, enableAlerts } from '../lib/alerts'
import { Countdown, Elapsed } from './LiveClock'

type Props = {
    group: QueueGroup
    venue: Venue
    courts: Court[]
    userId: string
    position: number | null
    onChange: () => Promise<void>
    onNotice: (notice: Notice | null) => void
}

const secondaryButton =
    'rounded-lg border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50'

function MyGroupPanel({ group, venue, courts, userId, position, onChange, onNotice }: Props) {
    const [busy, setBusy] = useState(false)
    const [guestName, setGuestName] = useState('')
    const [code, setCode] = useState<string | null>(null)
    const [alertsOn, setAlertsOn] = useState(alertsReady())

    useEffect(() => {
        let active = true

        queueApi.groupCode(group.id).then(({ data }) => {
            if (active) setCode((data as string | null) ?? null)
        })

        return () => {
            active = false
        }
    }, [group.id])

    const members = group.group_members
    const isLeader = group.leader_id === userId
    const me = members.find((member) => member.user_id === userId)
    const hasOtherAccounts = members.some((member) => member.user_id && member.user_id !== userId)
    const court = courts.find((c) => c.id === group.court_id)
    const missing = Math.max(0, group.players_needed - members.length)
    const deferredUntil = group.deferred_until ? new Date(group.deferred_until).getTime() : 0
    const skipped = group.status === 'waiting' && deferredUntil > Date.now()

    async function run(
        action: () => PromiseLike<{ error: { message: string } | null }>,
        successText?: string
    ) {
        setBusy(true)
        onNotice(null)

        const { error } = await action()

        if (error) {
            onNotice({ type: 'error', text: error.message })
        } else if (successText) {
            onNotice({ type: 'success', text: successText })
        }

        await onChange()
        setBusy(false)
        return !error
    }

    async function handleAddGuest() {
        const name = guestName.trim()
        if (!name) return

        const ok = await run(() => queueApi.addGuest(group.id, name))
        if (ok) setGuestName('')
    }

    function handleLeaveQueue() {
        if (!window.confirm('Leave the queue? Your whole group will be removed from the line.')) {
            return
        }
        run(() => queueApi.leaveQueue(group.id), 'You left the queue.')
    }

    function handleLeaveGroup() {
        if (!me) return
        if (!window.confirm('Leave this group? The others stay in the queue.')) return
        run(() => queueApi.removeMember(me.id), 'You left the group.')
    }

    function handleFinish() {
        if (!window.confirm('Finished playing? This frees the court for the next group.')) return
        run(() => queueApi.finish(group.id), 'Thanks for playing! The court is free.')
    }

    async function handleEnableAlerts() {
        await enableAlerts()
        setAlertsOn(alertsReady())
    }

    function copyInvite() {
        if (!code) return

        const link = `${window.location.origin}/local/${venue.code}?join=${code}`
        navigator.clipboard
            ?.writeText(link)
            .then(() => onNotice({ type: 'success', text: 'Invite link copied.' }))
            .catch(() => onNotice({ type: 'error', text: `Couldn't copy. The code is ${code}.` }))
    }

    return (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold text-gray-900">Your group</h2>

                <div className="flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full bg-blue-100 px-2.5 py-1 font-semibold text-blue-700">
                        {labelFor(SPORTS, group.sport)}
                    </span>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">
                        {formatName(group.players_needed)}
                    </span>
                    <span className="rounded-full bg-gray-100 px-2.5 py-1 text-gray-700">
                        {labelFor(PLAYER_SKILLS, group.skill_level)}
                    </span>
                </div>
            </div>

            {/* Status */}
            {group.status === 'called' && (
                <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4">
                    <p className="font-semibold text-amber-900">
                        {court?.name ?? 'A court'} is ready for your group!
                    </p>
                    <p className="mt-1 text-sm text-amber-800">
                        Respond within{' '}
                        {group.expires_at && <Countdown until={group.expires_at} />} or it counts as
                        a defer.
                    </p>

                    {missing > 0 && (
                        <p className="mt-2 text-sm text-amber-800">
                            Your group needs {missing} more {missing === 1 ? 'player' : 'players'}{' '}
                            before it can take the court. Add them below, or defer.
                        </p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-2">
                        <button
                            onClick={() => run(() => queueApi.respond(group.id, true), 'Enjoy your game!')}
                            disabled={busy || missing > 0}
                            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            Take the court
                        </button>
                        <button
                            onClick={() => run(() => queueApi.respond(group.id, false), 'You deferred. You are back in line.')}
                            disabled={busy}
                            className={secondaryButton}
                        >
                            Defer
                        </button>
                    </div>
                </div>
            )}

            {group.status === 'playing' && (
                <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <p className="font-semibold text-blue-900">
                        Playing on {court?.name ?? 'a court'}
                    </p>
                    {group.started_at && (
                        <p className="mt-1 text-sm text-blue-800">
                            Time on court:{' '}
                            <Elapsed since={group.started_at} limitMinutes={venue.time_limit_minutes} />
                        </p>
                    )}
                    <button
                        onClick={handleFinish}
                        disabled={busy}
                        className="mt-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        We're done
                    </button>
                </div>
            )}

            {group.status === 'waiting' && (
                <div className="mt-4 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
                    <p className="font-semibold text-gray-900">
                        {position ? `You're #${position} in line` : "You're in line"}
                    </p>

                    {missing > 0 ? (
                        <p className="mt-1">
                            Your group needs {missing} more {missing === 1 ? 'player' : 'players'} to
                            be called. Add a guest or share the join code below. You keep your
                            place while you wait.
                        </p>
                    ) : (
                        <p className="mt-1">You'll be called when a matching court is free.</p>
                    )}

                    {skipped && (
                        <p className="mt-1 text-gray-500">
                            You recently deferred, so you're skipped for a short while.
                        </p>
                    )}
                </div>
            )}

            {!alertsOn && group.status !== 'playing' && (
                <button onClick={handleEnableAlerts} className={`mt-4 ${secondaryButton}`}>
                    Enable alerts (sound and notification when you're called)
                </button>
            )}

            {/* Roster */}
            <h3 className="mt-6 text-sm font-semibold text-gray-900">
                Players ({members.length}/{MAX_GROUP_SIZE})
            </h3>

            <ul className="mt-2 divide-y divide-gray-100">
                {members.map((member) => {
                    const isMe = member.user_id === userId
                    const isGuest = member.user_id === null
                    const canRemove = isGuest || (!isMe && isLeader)

                    return (
                        <li key={member.id} className="flex items-center justify-between py-2 text-sm">
                            <span className="text-gray-800">
                                {memberName(member)}
                                {isMe && ' (you)'}
                                {member.user_id === group.leader_id && (
                                    <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                        Leader
                                    </span>
                                )}
                                {isGuest && (
                                    <span className="ml-2 rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                                        Guest
                                    </span>
                                )}
                            </span>

                            {canRemove && (
                                <button
                                    onClick={() => run(() => queueApi.removeMember(member.id))}
                                    disabled={busy}
                                    className="text-xs font-medium text-red-600 hover:underline disabled:opacity-50"
                                >
                                    Remove
                                </button>
                            )}
                        </li>
                    )
                })}
            </ul>

            <div className="mt-3 flex gap-2">
                <input
                    value={guestName}
                    maxLength={40}
                    onChange={(event) => setGuestName(event.target.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') handleAddGuest()
                    }}
                    placeholder="Add a guest by name"
                    className="min-w-0 flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                />
                <button
                    onClick={handleAddGuest}
                    disabled={busy || !guestName.trim() || members.length >= MAX_GROUP_SIZE}
                    className={secondaryButton}
                >
                    Add
                </button>
            </div>

            {/* Join code */}
            {code && (
                <div className="mt-6 rounded-xl bg-gray-50 p-4 text-sm text-gray-700">
                    <p>
                        Friends with accounts can join your group with this code:{' '}
                        <span className="font-mono text-base font-semibold tracking-widest text-gray-900">
                            {code}
                        </span>
                    </p>
                    <button
                        onClick={copyInvite}
                        className="mt-2 text-sm font-medium text-blue-600 hover:underline"
                    >
                        Copy invite link
                    </button>
                </div>
            )}

            {/* Leaving */}
            <div className="mt-6 flex flex-wrap gap-2 border-t border-gray-100 pt-4">
                {group.status !== 'playing' && (
                    <button
                        onClick={handleLeaveQueue}
                        disabled={busy}
                        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                        Leave the queue (whole group)
                    </button>
                )}

                {hasOtherAccounts && (
                    <button onClick={handleLeaveGroup} disabled={busy} className={secondaryButton}>
                        Leave this group (others stay)
                    </button>
                )}
            </div>
        </section>
    )
}

export default MyGroupPanel