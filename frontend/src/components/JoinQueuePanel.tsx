import { useState } from 'react'
import { Link } from 'react-router-dom'
import { SPORTS, PLAYER_SKILLS, labelFor, type Notice } from '../lib/listings'
import type { Venue, Court } from '../lib/venues'
import { queueApi, formatName, MAX_GROUP_SIZE } from '../lib/queue'

type MiniProfile = { display_name: string | null; skill_level: string | null }

type Props = {
    venue: Venue
    courts: Court[]
    profile: MiniProfile | null
    initialCode: string
    onChange: () => Promise<void>
    onNotice: (notice: Notice | null) => void
}

const inputClass =
    'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

function parseGuests(text: string) {
    return text
        .split(/[\n,]+/)
        .map((name) => name.trim())
        .filter(Boolean)
}

function JoinQueuePanel({ venue, courts, profile, initialCode, onChange, onNotice }: Props) {
    const [sport, setSport] = useState('')
    const [format, setFormat] = useState('')
    const [skill, setSkill] = useState('')
    const [guestsText, setGuestsText] = useState('')
    const [code, setCode] = useState(initialCode)
    const [busy, setBusy] = useState(false)

    // Only offer combinations the venue actually has an app-managed court for.
    const managed = courts.filter((court) => court.managed)
    const sports = [...new Set(managed.map((court) => court.sport))]
    const effectiveSport = sports.includes(sport) ? sport : sports[0]

    const formats = [
        ...new Set(
            managed.filter((court) => court.sport === effectiveSport).map((court) => court.players_needed)
        ),
    ]
    const effectiveFormat = formats.includes(Number(format)) ? Number(format) : formats[0]

    const effectiveSkill = skill || profile?.skill_level || 'beginner'
    const guests = parseGuests(guestsText)

    const profileIncomplete = !profile?.display_name?.trim() || !profile?.skill_level

    async function run(
        action: () => PromiseLike<{ error: { message: string } | null }>,
        successText: string
    ) {
        setBusy(true)
        onNotice(null)

        const { error } = await action()

        if (error) onNotice({ type: 'error', text: error.message })
        else onNotice({ type: 'success', text: successText })

        await onChange()
        setBusy(false)
    }

    function handleCreate() {
        if (!effectiveSport || !effectiveFormat) return

        if (guests.length + 1 > MAX_GROUP_SIZE) {
            onNotice({ type: 'error', text: `Groups can have at most ${MAX_GROUP_SIZE} players.` })
            return
        }

        run(
            () =>
                queueApi.createGroup({
                    venueId: venue.id,
                    sport: effectiveSport,
                    playersNeeded: effectiveFormat,
                    skill: effectiveSkill,
                    guests,
                }),
            "You're in the queue."
        )
    }

    function handleJoin() {
        if (!code.trim()) return
        run(() => queueApi.joinGroup(venue.id, code), 'You joined the group.')
    }

    if (managed.length === 0) {
        return (
            <section className="rounded-2xl border border-gray-200 bg-white p-6 text-sm text-gray-600 shadow-sm">
                This venue has no courts managed by the app yet, so there's no queue to join.
            </section>
        )
    }

    return (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Join the queue</h2>

            {profileIncomplete && (
                <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                    Add your name and skill level to your{' '}
                    <Link to="/profile" className="font-medium underline">
                        profile
                    </Link>{' '}
                    before joining a queue.
                </p>
            )}

            <div className="mt-4 grid gap-6 md:grid-cols-2">
                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-900">Start a group</h3>

                    <div className="grid grid-cols-2 gap-3">
                        <label className="block text-sm font-medium text-gray-700">
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

                        <label className="block text-sm font-medium text-gray-700">
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
                    </div>

                    <label className="block text-sm font-medium text-gray-700">
                        Your group's skill level
                        <select
                            value={effectiveSkill}
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

                    <label className="block text-sm font-medium text-gray-700">
                        Guests (optional)
                        <textarea
                            rows={2}
                            value={guestsText}
                            onChange={(event) => setGuestsText(event.target.value)}
                            placeholder="Names of friends without accounts, one per line"
                            className={inputClass}
                        />
                    </label>

                    <button
                        onClick={handleCreate}
                        disabled={busy || profileIncomplete || !effectiveSport || !effectiveFormat}
                        className="w-full rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        {busy ? 'Working...' : 'Join the queue'}
                    </button>
                </div>

                <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-900">Join a friend's group</h3>
                    <p className="text-sm text-gray-600">
                        Ask them for their 6-character code, or open their invite link.
                    </p>

                    <label className="block text-sm font-medium text-gray-700">
                        Group code
                        <input
                            value={code}
                            maxLength={6}
                            onChange={(event) => setCode(event.target.value.toUpperCase())}
                            placeholder="e.g. 4F2A9C"
                            className={`${inputClass} font-mono tracking-widest`}
                        />
                    </label>

                    <button
                        onClick={handleJoin}
                        disabled={busy || profileIncomplete || code.trim().length === 0}
                        className="w-full rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                        Join group
                    </button>
                </div>
            </div>
        </section>
    )
}

export default JoinQueuePanel