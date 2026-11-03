import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

function ForgotPassword() {
    const [email, setEmail] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [sent, setSent] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setError(null)
        setSubmitting(true)

        // This address must be allowed under Authentication > URL Configuration
        // > Redirect URLs in the Supabase dashboard.
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: `${window.location.origin}/reset-password`,
        })

        setSubmitting(false)

        if (error) setError(error.message)
        else setSent(true)
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                <h1 className="text-2xl font-semibold text-gray-900">Reset your password</h1>

                {sent ? (
                    <>
                        <p className="mt-4 text-sm text-gray-600">
                            If an account exists for <span className="font-medium">{email.trim()}</span>,
                            we've sent a link to reset the password. Check your spam folder if it
                            doesn't show up in a minute or two.
                        </p>
                        <Link
                            to="/login"
                            className="mt-6 inline-block text-sm font-medium text-blue-600 hover:underline"
                        >
                            Back to log in
                        </Link>
                    </>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <p className="mt-2 text-sm text-gray-600">
                            Enter your email and we'll send you a link to choose a new one.
                        </p>

                        <label className="mt-6 block text-sm font-medium text-gray-700">
                            Email
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(event) => setEmail(event.target.value)}
                                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                            />
                        </label>

                        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                        >
                            {submitting ? 'Sending...' : 'Send reset link'}
                        </button>

                        <p className="mt-4 text-center text-sm text-gray-600">
                            <Link to="/login" className="text-blue-600 hover:underline">
                                Back to log in
                            </Link>
                        </p>
                    </form>
                )}
            </div>
        </div>
    )
}

export default ForgotPassword