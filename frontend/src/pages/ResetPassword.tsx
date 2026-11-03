import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'

function ResetPassword() {
    const { user, loading } = useAuth()
    const [password, setPassword] = useState('')
    const [confirm, setConfirm] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [done, setDone] = useState(false)
    const [error, setError] = useState<string | null>(null)

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault()
        setError(null)

        // Matches the minimum used at signup.
        if (password.length < 6) {
            setError('Use at least 6 characters.')
            return
        }
        if (password !== confirm) {
            setError("The two passwords don't match.")
            return
        }

        setSubmitting(true)

        const { error } = await supabase.auth.updateUser({ password })

        setSubmitting(false)

        if (error) setError(error.message)
        else setDone(true)
    }

    if (loading) {
        return <div className="p-8 text-gray-500">Checking your link...</div>
    }

    // No session means the link was opened without valid tokens, or it expired.
    if (!user) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
                <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm">
                    <h1 className="text-xl font-semibold text-gray-900">This link isn't valid</h1>
                    <p className="mt-2 text-sm text-gray-600">
                        Reset links expire after a while and only work once. You can ask for a new
                        one.
                    </p>
                    <Link
                        to="/forgot-password"
                        className="mt-6 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                        Send a new link
                    </Link>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
            <div className="w-full max-w-sm rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                <h1 className="text-2xl font-semibold text-gray-900">Choose a new password</h1>

                {done ? (
                    <>
                        <p className="mt-4 text-sm text-green-700">Your password has been updated.</p>
                        <Link
                            to="/"
                            className="mt-6 inline-block rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                        >
                            Continue
                        </Link>
                    </>
                ) : (
                    <form onSubmit={handleSubmit}>
                        <p className="mt-2 text-sm text-gray-600">{user.email}</p>

                        <label className="mt-6 block text-sm font-medium text-gray-700">
                            New password
                            <input
                                type="password"
                                required
                                minLength={6}
                                autoComplete="new-password"
                                value={password}
                                onChange={(event) => setPassword(event.target.value)}
                                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                            />
                        </label>

                        <label className="mt-4 block text-sm font-medium text-gray-700">
                            Confirm new password
                            <input
                                type="password"
                                required
                                minLength={6}
                                autoComplete="new-password"
                                value={confirm}
                                onChange={(event) => setConfirm(event.target.value)}
                                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
                            />
                        </label>

                        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

                        <button
                            type="submit"
                            disabled={submitting}
                            className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
                        >
                            {submitting ? 'Saving...' : 'Update password'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}

export default ResetPassword