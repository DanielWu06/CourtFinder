import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../auth/AuthContext'

const SKILL_LEVELS = [
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
] as const

export default function Profile() {
  const { user } = useAuth()
  const [displayName, setDisplayName] = useState('')
  const [skillLevel, setSkillLevel] = useState<string>('beginner')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!user) return

    supabase
      .from('profiles')
      .select('display_name, skill_level')
      .eq('id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) setError(error.message)
        if (data) {
          setDisplayName(data.display_name ?? '')
          setSkillLevel(data.skill_level ?? 'beginner')
        }
        setLoading(false)
      })
  }, [user])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setSaving(true)
    setError(null)
    setSaved(false)

    const { error } = await supabase.from('profiles').upsert({
      id: user.id,
      display_name: displayName.trim(),
      skill_level: skillLevel,
      updated_at: new Date().toISOString(),
    })

    setSaving(false)
    if (error) setError(error.message)
    else setSaved(true)
  }

  if (loading) return <div className="p-8">Loading...</div>

  return (
    <div className="mx-auto max-w-md p-8">
      <form
        onSubmit={handleSave}
        className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm"
      >
        <h1 className="text-2xl font-semibold text-gray-900">Your profile</h1>
        <p className="mt-1 text-sm text-gray-500">{user?.email}</p>

        <label className="mt-6 block text-sm font-medium text-gray-700">
          Name
          <input
            type="text"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none"
          />
        </label>

        <label className="mt-4 block text-sm font-medium text-gray-700">
          Skill level
          <select
            value={skillLevel}
            onChange={(e) => setSkillLevel(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 focus:border-blue-500 focus:outline-none"
            >
            {SKILL_LEVELS.map((level) => (
                <option key={level.value} value={level.value}>
                {level.label}
                </option>
            ))}
          </select>
        </label>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}
        {saved && <p className="mt-4 text-sm text-green-600">Profile saved.</p>}

        <button
          type="submit"
          disabled={saving}
          className="mt-6 w-full rounded-lg bg-blue-600 px-4 py-2 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </form>
    </div>
  )
}