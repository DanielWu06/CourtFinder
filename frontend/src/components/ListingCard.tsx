// src/components/ListingCard.tsx
import { useState } from 'react'
import { MapPin, Calendar, Users, MessageCircle } from 'lucide-react'
import { supabase } from '../lib/supabase'
import {
    SPORTS,
    LISTING_SKILLS,
    FORMATS,
    labelFor,
    getChatUrl,
    parseChatLink,
    type ListingRow,
    type Notice,
} from '../lib/listings'

type Props = {
    listing: ListingRow
    userId: string | undefined
    // Called after any change so the page can reload its data.
    onChange: () => Promise<void>
    onNotice: (notice: Notice | null) => void
}

const smallButton =
    'rounded-lg border px-3 py-2 text-sm font-medium transition disabled:opacity-50'

function ListingCard({ listing, userId, onChange, onNotice }: Props) {
    const [busy, setBusy] = useState(false)
    const [editing, setEditing] = useState(false)
    const [notesDraft, setNotesDraft] = useState('')
    const [chatDraft, setChatDraft] = useState('')

    const playerCount = listing.listing_players.length
    const cancelled = listing.status === 'cancelled'
    const isFull = playerCount >= listing.capacity
    const isHost = listing.host_id === userId
    const hasJoined = listing.listing_players.some((player) => player.user_id === userId)
    const start = new Date(listing.starts_at)
    const isPast = start.getTime() <= Date.now()
    const chatUrl = getChatUrl(listing)

    async function run(
        action: () => PromiseLike<{ error: { message: string } | null }>,
        successText?: string
    ): Promise<boolean> {
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

    function handleJoin() {
        // user_id is filled in by the database from the logged-in user.
        run(
            () => supabase.from('listing_players').insert({ listing_id: listing.id }),
            `You joined "${listing.title}".`
        )
    }

    function handleLeave() {
        if (!userId) return
        run(
            () =>
                supabase
                    .from('listing_players')
                    .delete()
                    .eq('listing_id', listing.id)
                    .eq('user_id', userId),
            cancelled ? undefined : `You left "${listing.title}".`
        )
    }

    function handleCancel() {
        const ok = window.confirm(
            `Cancel "${listing.title}"? Players who joined will see it marked as cancelled.`
        )
        if (!ok) return

        run(
            () => supabase.from('listings').update({ status: 'cancelled' }).eq('id', listing.id),
            `"${listing.title}" was cancelled.`
        )
    }

    function handleDelete() {
        const ok = window.confirm(`Permanently delete "${listing.title}"?`)
        if (!ok) return

        run(
            () => supabase.from('listings').delete().eq('id', listing.id),
            `"${listing.title}" was deleted.`
        )
    }

    function startEditing() {
        setNotesDraft(listing.notes ?? '')
        setChatDraft(chatUrl ?? '')
        setEditing(true)
    }

    async function saveDetails() {
        const parsed = parseChatLink(chatDraft)
        if (parsed.error) {
            onNotice({ type: 'error', text: parsed.error })
            return
        }

        const saved = await run(async () => {
            const notesResult = await supabase
                .from('listings')
                .update({ notes: notesDraft.trim() || null })
                .eq('id', listing.id)

            if (notesResult.error) return notesResult

            if (parsed.url) {
                return supabase
                    .from('listing_chat_links')
                    .upsert({ listing_id: listing.id, url: parsed.url })
            }

            return supabase.from('listing_chat_links').delete().eq('listing_id', listing.id)
        }, 'Game details updated.')

        if (saved) setEditing(false)
    }

    return (
        <div
            className={`flex flex-col rounded-xl border bg-white p-6 shadow-sm ${
                cancelled ? 'border-red-200 opacity-80' : 'border-gray-200'
            } ${isPast && !cancelled ? 'opacity-75' : ''}`}
        >
            <div className="flex items-center justify-between">
                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                    {labelFor(SPORTS, listing.sport)}
                </span>

                {cancelled ? (
                    <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                        Cancelled
                    </span>
                ) : isPast ? (
                    <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">
                        Past
                    </span>
                ) : (
                    <span className="text-xs text-gray-500">
                        {labelFor(FORMATS, listing.format)}
                    </span>
                )}
            </div>

            <h2
                className={`mt-4 text-xl font-semibold text-gray-900 ${
                    cancelled ? 'line-through' : ''
                }`}
            >
                {listing.title}
            </h2>

            <div className="mt-4 space-y-3 text-sm text-gray-600">
                <p className="flex items-center gap-2">
                    <MapPin size={16} />
                    {listing.venue}
                </p>

                <p className="flex items-center gap-2">
                    <Calendar size={16} />
                    {start.toLocaleDateString(undefined, {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                    })}{' '}
                    ·{' '}
                    {start.toLocaleTimeString(undefined, {
                        hour: 'numeric',
                        minute: '2-digit',
                    })}
                </p>

                <p className="flex items-center gap-2">
                    <Users size={16} />
                    {playerCount}/{listing.capacity} players
                </p>
            </div>

            {/* Who's going */}
            <div className="mt-3 flex flex-wrap gap-2">
                {listing.listing_players.map((player) => (
                    <span
                        key={player.user_id}
                        className="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-700"
                    >
                        {player.profile?.display_name || 'Player'}
                        {player.user_id === userId && ' (you)'}
                        {player.user_id === listing.host_id && ' · Host'}
                    </span>
                ))}
            </div>

            {/* Host notes + chat link: edit panel, or read-only view */}
            {editing ? (
                <div className="mt-4 space-y-3">
                    <label className="block text-sm font-medium text-gray-700">
                        Notes
                        <textarea
                            value={notesDraft}
                            onChange={(event) => setNotesDraft(event.target.value)}
                            rows={3}
                            maxLength={500}
                            placeholder="e.g. Meet at court 3, bring your own birdies"
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                    </label>

                    <label className="block text-sm font-medium text-gray-700">
                        Group chat link
                        <input
                            type="text"
                            value={chatDraft}
                            onChange={(event) => setChatDraft(event.target.value)}
                            placeholder="WhatsApp, Discord, GroupMe... (optional)"
                            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-normal outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                        />
                        <span className="mt-1 block text-xs font-normal text-gray-500">
                            Only players in this game can see the link. Clear the box to remove it.
                        </span>
                    </label>

                    <div className="flex justify-end gap-2">
                        <button
                            onClick={() => setEditing(false)}
                            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
                        >
                            Discard
                        </button>
                        <button
                            onClick={saveDetails}
                            disabled={busy}
                            className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                        >
                            Save
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    {listing.notes && (
                        <p className="mt-4 whitespace-pre-line rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                            {listing.notes}
                        </p>
                    )}

                    {chatUrl && hasJoined && (
                        <a
                            href={chatUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-4 inline-flex w-fit items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100"
                        >
                            <MessageCircle size={16} />
                            Open group chat
                        </a>
                    )}
                </>
            )}

            {/* Actions */}
            <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-5">
                <span className="text-sm text-gray-500">
                    {labelFor(LISTING_SKILLS, listing.skill_level)}
                </span>

                <div className="flex items-center gap-2">
                    {isHost && !cancelled && !isPast && (
                        <>
                            {!editing && (
                                <button
                                    onClick={startEditing}
                                    disabled={busy}
                                    className={`${smallButton} border-gray-300 text-gray-700 hover:bg-gray-50`}
                                >
                                    Edit Details
                                </button>
                            )}
                            <button
                                onClick={handleCancel}
                                disabled={busy}
                                className={`${smallButton} border-red-200 text-red-600 hover:bg-red-50`}
                            >
                                Cancel Game
                            </button>
                        </>
                    )}

                    {isHost && (cancelled || isPast) && (
                        <button
                            onClick={handleDelete}
                            disabled={busy}
                            className={`${smallButton} border-red-200 text-red-600 hover:bg-red-50`}
                        >
                            Delete
                        </button>
                    )}

                    {!isHost && hasJoined && (cancelled || !isPast) && (
                        <button
                            onClick={handleLeave}
                            disabled={busy}
                            className={`${smallButton} border-gray-300 text-gray-700 hover:bg-gray-50`}
                        >
                            {cancelled ? 'Dismiss' : 'Leave'}
                        </button>
                    )}

                    {!isHost && !hasJoined && !cancelled && !isPast && (
                        <button
                            onClick={handleJoin}
                            disabled={busy || isFull}
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-gray-300"
                        >
                            {isFull ? 'Full' : 'Join Game'}
                        </button>
                    )}
                </div>
            </div>

            {!cancelled && !isPast && (isHost || hasJoined) && (
                <p className="mt-3 text-xs font-medium text-green-600">
                    {isHost ? "You're hosting this game" : "You're in"}
                </p>
            )}
        </div>
    )
}

export default ListingCard