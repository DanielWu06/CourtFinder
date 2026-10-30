import { useState, type FormEvent, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { SPORTS, LISTING_SKILLS, FORMATS, CAPACITIES } from '../lib/listings'

const inputClass =
    'w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

function Field({
    label,
    htmlFor,
    children,
}: {
    label: string
    htmlFor: string
    children: ReactNode
}) {
    return (
        <div>
            <label
                htmlFor={htmlFor}
                className="mb-2 block text-sm font-medium text-gray-700"
            >
                {label}
            </label>
            {children}
        </div>
    )
}

function CreateListing() {
    const navigate = useNavigate()

    const [title, setTitle] = useState('')
    const [sport, setSport] = useState('badminton')
    const [venue, setVenue] = useState('')
    const [date, setDate] = useState('')
    const [time, setTime] = useState('')
    const [skill, setSkill] = useState('intermediate')
    const [format, setFormat] = useState('casual')
    const [capacity, setCapacity] = useState('4')
    const [notes, setNotes] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Local date (YYYY-MM-DD). toISOString() would use UTC and show
    // tomorrow's date in the evening for US time zones.
    const today = new Date().toLocaleDateString('en-CA')

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setError(null)

        // Built from local date + time, stored as a UTC timestamp.
        const startsAt = new Date(`${date}T${time}`)

        if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) {
            setError('Please pick a start time in the future.')
            return
        }

        setSubmitting(true)

        // host_id is filled in by the database from the logged-in user.
        const { error } = await supabase.from('listings').insert({
            title: title.trim(),
            sport,
            venue: venue.trim(),
            starts_at: startsAt.toISOString(),
            skill_level: skill,
            format,
            capacity: Number(capacity),
            notes: notes.trim() || null,
        })

        setSubmitting(false)

        if (error) {
            setError(error.message)
            return
        }

        navigate('/find')
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="mx-auto max-w-3xl px-6 py-12">
                <h1 className="text-3xl font-bold text-gray-900">
                    Schedule a Game
                </h1>

                <p className="mt-2 text-gray-600">
                    Create a listing and find other players to join you. You'll
                    take the first spot automatically.
                </p>

                <form
                    onSubmit={handleSubmit}
                    className="mt-8 space-y-6 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm"
                >
                    <Field label="Game Title" htmlFor="title">
                        <input
                            id="title"
                            required
                            maxLength={80}
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            placeholder="e.g. Saturday Badminton"
                            className={inputClass}
                        />
                    </Field>

                    <div className="grid gap-6 sm:grid-cols-2">
                        <Field label="Sport" htmlFor="sport">
                            <select
                                id="sport"
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
                        </Field>

                        <Field label="Venue" htmlFor="venue">
                            <input
                                id="venue"
                                required
                                maxLength={120}
                                value={venue}
                                onChange={(event) => setVenue(event.target.value)}
                                placeholder="Enter a venue"
                                className={inputClass}
                            />
                        </Field>

                        <Field label="Date" htmlFor="date">
                            <input
                                id="date"
                                required
                                type="date"
                                min={today}
                                value={date}
                                onChange={(event) => setDate(event.target.value)}
                                className={inputClass}
                            />
                        </Field>

                        <Field label="Start Time" htmlFor="time">
                            <input
                                id="time"
                                required
                                type="time"
                                value={time}
                                onChange={(event) => setTime(event.target.value)}
                                className={inputClass}
                            />
                        </Field>

                        <Field label="Skill Level" htmlFor="skill">
                            <select
                                id="skill"
                                value={skill}
                                onChange={(event) => setSkill(event.target.value)}
                                className={inputClass}
                            >
                                {LISTING_SKILLS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        <Field label="Game Format" htmlFor="format">
                            <select
                                id="format"
                                value={format}
                                onChange={(event) => setFormat(event.target.value)}
                                className={inputClass}
                            >
                                {FORMATS.map((option) => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </Field>

                        <Field label="Player Capacity" htmlFor="capacity">
                            <select
                                id="capacity"
                                value={capacity}
                                onChange={(event) => setCapacity(event.target.value)}
                                className={inputClass}
                            >
                                {CAPACITIES.map((count) => (
                                    <option key={count} value={count}>
                                        {count} Players
                                    </option>
                                ))}
                            </select>
                        </Field>
                    </div>

                    <Field label="Notes (optional)" htmlFor="notes">
                        <textarea
                            id="notes"
                            rows={3}
                            maxLength={500}
                            value={notes}
                            onChange={(event) => setNotes(event.target.value)}
                            placeholder="e.g. Meet at court 3, bring your own birdies"
                            className={inputClass}
                        />
                        <p className="mt-1 text-right text-xs text-gray-400">
                            {notes.length}/500
                        </p>
                    </Field>

                    {error && (
                        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                    >
                        {submitting ? 'Creating...' : 'Create Listing'}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default CreateListing
