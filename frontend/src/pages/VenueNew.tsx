import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

const inputClass =
    'mt-1 w-full rounded-lg border border-gray-300 bg-white px-4 py-3 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100'

// SHORT-TERM: any logged-in user can create a venue. Add an approval step later
function VenueNew() {
    const navigate = useNavigate()
    const [name, setName] = useState('')
    const [location, setLocation] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setError(null)
        setSubmitting(true)

        const { data, error } = await supabase
            .from('venues')
            .insert({ name: name.trim(), location: location.trim() || null })
            .select('code')
            .single()

        setSubmitting(false)

        if (error || !data) {
            setError(error?.message ?? 'Something went wrong creating the venue.')
            return
        }

        navigate(`/local/${data.code}/manage`)
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="mx-auto max-w-xl px-6 py-12">
                <Link to="/local" className="text-sm text-gray-500 hover:text-blue-600">
                    &larr; Back to venues
                </Link>

                <h1 className="mt-4 text-3xl font-bold text-gray-900">Set up a venue</h1>
                <p className="mt-2 text-gray-600">
                    You'll become the owner and can add courts and settings next.
                </p>

                <form
                    onSubmit={handleSubmit}
                    className="mt-8 space-y-5 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm"
                >
                    <label className="block text-sm font-medium text-gray-700">
                        Venue name
                        <input
                            required
                            maxLength={80}
                            value={name}
                            onChange={(event) => setName(event.target.value)}
                            placeholder="Your Venue Name"
                            className={inputClass}
                        />
                    </label>

                    <label className="block text-sm font-medium text-gray-700">
                        Location (optional)
                        <input
                            maxLength={120}
                            value={location}
                            onChange={(event) => setLocation(event.target.value)}
                            placeholder="Address or neighborhood"
                            className={inputClass}
                        />
                    </label>

                    {error && (
                        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">{error}</div>
                    )}

                    <button
                        type="submit"
                        disabled={submitting}
                        className="w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:opacity-50"
                    >
                        {submitting ? 'Creating...' : 'Create venue'}
                    </button>
                </form>
            </div>
        </div>
    )
}

export default VenueNew