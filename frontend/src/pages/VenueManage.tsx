import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'
import { SPORTS, type Notice } from '../lib/listings'
import {
    VENUE_SELECT,
    COURT_SELECT,
    SKILL_RESTRICTIONS,
    PLAYERS_NEEDED,
    type Venue,
    type Court,
} from '../lib/venues.ts'

const inputClass =
    'mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

const hintClass = 'mt-1 block text-xs font-normal text-gray-500'

function inRange(value: string, min: number, max: number) {
    const n = Number(value)
    return value.trim() !== '' && Number.isInteger(n) && n >= min && n <= max
}

// ---------------------------------------------------------------
// Venue details + queue settings
// ---------------------------------------------------------------
// SHORT-TERM: these settings are saved but nothing reads them until the
// queue exists (step 2).
function SettingsForm({
    venue,
    onSaved,
    onNotice,
}: {
    venue: Venue
    onSaved: () => Promise<void>
    onNotice: (notice: Notice | null) => void
}) {
    const [name, setName] = useState(venue.name)
    const [location, setLocation] = useState(venue.location ?? '')
    const [autoCalling, setAutoCalling] = useState(venue.auto_calling)
    const [grace, setGrace] = useState(String(venue.grace_seconds))
    const [dropPlaces, setDropPlaces] = useState(String(venue.defer_drop_places))
    const [maxDefers, setMaxDefers] = useState(String(venue.max_defers))
    const [limit, setLimit] = useState(
        venue.time_limit_minutes ? String(venue.time_limit_minutes) : ''
    )
    const [strict, setStrict] = useState(venue.strict_time_limit)
    const [saving, setSaving] = useState(false)

    const hasLimit = limit.trim() !== ''

    async function handleSave() {
        onNotice(null)

        if (!name.trim()) return onNotice({ type: 'error', text: 'Venue name is required.' })
        if (!inRange(grace, 30, 900))
            return onNotice({ type: 'error', text: 'Response window must be 30 to 900 seconds.' })
        if (!inRange(dropPlaces, 1, 10))
            return onNotice({ type: 'error', text: 'Places dropped per defer must be 1 to 10.' })
        if (!inRange(maxDefers, 0, 5))
            return onNotice({ type: 'error', text: 'Defers before the back must be 0 to 5.' })
        if (hasLimit && !inRange(limit, 5, 180))
            return onNotice({ type: 'error', text: 'Time limit must be 5 to 180 minutes, or blank.' })

        setSaving(true)

        const { error } = await supabase
            .from('venues')
            .update({
                name: name.trim(),
                location: location.trim() || null,
                auto_calling: autoCalling,
                grace_seconds: Number(grace),
                defer_drop_places: Number(dropPlaces),
                max_defers: Number(maxDefers),
                time_limit_minutes: hasLimit ? Number(limit) : null,
                strict_time_limit: hasLimit ? strict : false,
            })
            .eq('id', venue.id)

        setSaving(false)

        if (error) {
            onNotice({ type: 'error', text: error.message })
        } else {
            onNotice({ type: 'success', text: 'Venue settings saved.' })
            await onSaved()
        }
    }

    return (
        <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900">Venue details and settings</h2>

            <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block text-sm font-medium text-gray-700">
                    Name
                    <input
                        value={name}
                        maxLength={80}
                        onChange={(event) => setName(event.target.value)}
                        className={inputClass}
                    />
                </label>

                <label className="block text-sm font-medium text-gray-700">
                    Location
                    <input
                        value={location}
                        maxLength={120}
                        onChange={(event) => setLocation(event.target.value)}
                        className={inputClass}
                    />
                </label>

                <label className="block text-sm font-medium text-gray-700">
                    Response window (seconds)
                    <input
                        type="number"
                        min={30}
                        max={900}
                        value={grace}
                        onChange={(event) => setGrace(event.target.value)}
                        className={inputClass}
                    />
                    <span className={hintClass}>
                        How long a called group has to respond before it counts as a defer.
                    </span>
                </label>

                <label className="block text-sm font-medium text-gray-700">
                    Places dropped per defer
                    <input
                        type="number"
                        min={1}
                        max={10}
                        value={dropPlaces}
                        onChange={(event) => setDropPlaces(event.target.value)}
                        className={inputClass}
                    />
                    <span className={hintClass}>How far a deferring group falls back in line.</span>
                </label>

                <label className="block text-sm font-medium text-gray-700">
                    Defers before going to the back
                    <input
                        type="number"
                        min={0}
                        max={5}
                        value={maxDefers}
                        onChange={(event) => setMaxDefers(event.target.value)}
                        className={inputClass}
                    />
                    <span className={hintClass}>After this many defers, the next one sends the group to the back.</span>
                </label>

                <label className="block text-sm font-medium text-gray-700">
                    Time limit per game (minutes)
                    <input
                        type="number"
                        min={5}
                        max={180}
                        value={limit}
                        onChange={(event) => setLimit(event.target.value)}
                        placeholder="No limit"
                        className={inputClass}
                    />
                    <span className={hintClass}>Leave blank for no time limit.</span>
                </label>
            </div>

            <div className="mt-4 space-y-3">
                <label className="flex items-start gap-3 text-sm text-gray-700">
                    <input
                        type="checkbox"
                        checked={autoCalling}
                        onChange={(event) => setAutoCalling(event.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-gray-300"
                    />
                    <span>
                        <span className="font-medium">Automatic calling</span>
                        <span className={hintClass}>
                            When off, nothing is called automatically and staff call groups
                            themselves.
                        </span>
                    </span>
                </label>

                <label className="flex items-start gap-3 text-sm text-gray-700">
                    <input
                        type="checkbox"
                        checked={hasLimit && strict}
                        disabled={!hasLimit}
                        onChange={(event) => setStrict(event.target.checked)}
                        className="mt-1 h-4 w-4 rounded border-gray-300 disabled:opacity-50"
                    />
                    <span>
                        <span className="font-medium">Strict time limit</span>
                        <span className={hintClass}>
                            When on, the court is freed and the next group called at the limit.
                            When off, an overtime timer is shown. Needs a time limit.
                        </span>
                    </span>
                </label>
            </div>

            <div className="mt-6 flex justify-end">
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="rounded-lg bg-blue-600 px-5 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                    {saving ? 'Saving...' : 'Save settings'}
                </button>
            </div>
        </section>
    )
}

// ---------------------------------------------------------------
// One court's editor
// ---------------------------------------------------------------
function CourtEditor({
    court,
    onChanged,
    onNotice,
}: {
    court: Court
    onChanged: () => Promise<void>
    onNotice: (notice: Notice | null) => void
}) {
    const [name, setName] = useState(court.name)
    const [sport, setSport] = useState(court.sport)
    const [restriction, setRestriction] = useState<string>(court.skill_restriction)
    const [needed, setNeeded] = useState(String(court.players_needed))
    const [managed, setManaged] = useState(court.managed)
    const [busy, setBusy] = useState(false)

    async function handleSave() {
        if (!name.trim()) return onNotice({ type: 'error', text: 'Court name is required.' })

        setBusy(true)
        onNotice(null)

        const { error } = await supabase
            .from('courts')
            .update({
                name: name.trim(),
                sport,
                skill_restriction: restriction,
                players_needed: Number(needed),
                managed,
            })
            .eq('id', court.id)

        setBusy(false)

        if (error) onNotice({ type: 'error', text: error.message })
        else {
            onNotice({ type: 'success', text: `Saved ${name.trim()}.` })
            await onChanged()
        }
    }

    async function handleRemove() {
        if (!window.confirm(`Remove ${court.name}?`)) return

        setBusy(true)
        onNotice(null)

        const { error } = await supabase.from('courts').delete().eq('id', court.id)

        setBusy(false)

        if (error) onNotice({ type: 'error', text: error.message })
        else await onChanged()
    }

    return (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <label className="block text-sm font-medium text-gray-700">
                    Name
                    <input
                        value={name}
                        maxLength={40}
                        onChange={(event) => setName(event.target.value)}
                        className={inputClass}
                    />
                </label>

                <label className="block text-sm font-medium text-gray-700">
                    Sport
                    <select
                        value={sport}
                        onChange={(event) => setSport(event.target.value)}
                        className={inputClass}
                    >
                        {SPORTS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="block text-sm font-medium text-gray-700">
                    Format
                    <select
                        value={needed}
                        onChange={(event) => setNeeded(event.target.value)}
                        className={inputClass}
                    >
                        {PLAYERS_NEEDED.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </label>

                <label className="block text-sm font-medium text-gray-700">
                    Who can use it
                    <select
                        value={restriction}
                        onChange={(event) => setRestriction(event.target.value)}
                        className={inputClass}
                    >
                        {SKILL_RESTRICTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                </label>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input
                        type="checkbox"
                        checked={managed}
                        onChange={(event) => setManaged(event.target.checked)}
                        className="h-4 w-4 rounded border-gray-300"
                    />
                    Managed by the app
                    <span className="text-xs text-gray-500">
                        (uncheck for courts the queue shouldn't use)
                    </span>
                </label>

                <div className="flex gap-2">
                    <button
                        onClick={handleRemove}
                        disabled={busy}
                        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
                    >
                        Remove
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={busy}
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                        Save
                    </button>
                </div>
            </div>
        </div>
    )
}

// ---------------------------------------------------------------
// Page
// ---------------------------------------------------------------
// SHORT-TERM: owner only. The staff role exists in the database but has no
// screens yet.
function VenueManage() {
    const { code } = useParams()
    const navigate = useNavigate()
    const { user } = useAuth()
    const userId = user?.id

    const [venue, setVenue] = useState<Venue | null>(null)
    const [courts, setCourts] = useState<Court[]>([])
    const [isOwner, setIsOwner] = useState(false)
    const [loading, setLoading] = useState(true)
    const [notice, setNotice] = useState<Notice | null>(null)

    const load = useCallback(async () => {
        const { data: venueData, error: venueError } = await supabase
            .from('venues')
            .select(VENUE_SELECT)
            .eq('code', code ?? '')
            .maybeSingle()

        if (venueError) {
            setNotice({ type: 'error', text: venueError.message })
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

        if (courtError) setNotice({ type: 'error', text: courtError.message })
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
    }, [code, userId])

    useEffect(() => {
        load()
    }, [load])

    async function addCourt() {
        if (!venue) return
        setNotice(null)

        const nextOrder = courts.length ? Math.max(...courts.map((c) => c.sort_order)) + 1 : 1

        const { error } = await supabase.from('courts').insert({
            venue_id: venue.id,
            name: `Court ${courts.length + 1}`,
            sport: 'badminton',
            skill_restriction: 'open',
            players_needed: 4,
            managed: true,
            sort_order: nextOrder,
        })

        if (error) setNotice({ type: 'error', text: error.message })
        else await load()
    }

    async function deleteVenue() {
        if (!venue) return

        const ok = window.confirm(
            `Delete "${venue.name}" and all its courts? This can't be undone.`
        )
        if (!ok) return

        const { error } = await supabase.from('venues').delete().eq('id', venue.id)

        if (error) setNotice({ type: 'error', text: error.message })
        else navigate('/local')
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

    if (!isOwner) {
        return (
            <div className="mx-auto max-w-xl p-8 text-center">
                <p className="text-gray-600">Only the venue owner can manage this venue.</p>
                <Link
                    to={`/local/${venue.code}`}
                    className="mt-4 inline-block text-blue-600 hover:underline"
                >
                    Back to {venue.name}
                </Link>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="mx-auto max-w-5xl space-y-8 px-6 py-12">
                <div>
                    <Link
                        to={`/local/${venue.code}`}
                        className="text-sm text-gray-500 hover:text-blue-600"
                    >
                        &larr; Back to {venue.name}
                    </Link>
                    <h1 className="mt-4 text-3xl font-bold text-gray-900">Manage venue</h1>
                </div>

                {notice && (
                    <p
                        className={`rounded-lg p-4 text-sm ${
                            notice.type === 'error'
                                ? 'bg-red-50 text-red-700'
                                : 'bg-green-50 text-green-700'
                        }`}
                    >
                        {notice.text}
                    </p>
                )}

                <SettingsForm key={venue.id} venue={venue} onSaved={load} onNotice={setNotice} />

                <section>
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">Courts</h2>
                        <button
                            onClick={addCourt}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            Add court
                        </button>
                    </div>

                    <div className="mt-4 space-y-4">
                        {courts.map((court) => (
                            <CourtEditor
                                key={court.id}
                                court={court}
                                onChanged={load}
                                onNotice={setNotice}
                            />
                        ))}
                    </div>

                    {courts.length === 0 && (
                        <p className="mt-4 text-sm text-gray-500">
                            No courts yet. Add your first court to get started.
                        </p>
                    )}
                </section>

                <section className="rounded-2xl border border-red-200 bg-white p-6">
                    <h2 className="text-lg font-semibold text-red-700">Delete venue</h2>
                    <p className="mt-1 text-sm text-gray-600">
                        Removes the venue and all of its courts. This can't be undone.
                    </p>
                    <button
                        onClick={deleteVenue}
                        className="mt-4 rounded-lg border border-red-200 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                    >
                        Delete this venue
                    </button>
                </section>
            </div>
        </div>
    )
}

export default VenueManage