import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'
import { queueApi, GROUP_SELECT, type QueueGroup } from './queue'
import { COURT_SELECT, type Court } from './venues'

export function useVenueQueue(venueId: string | undefined, intervalMs = 5000) {
    const [courts, setCourts] = useState<Court[]>([])
    const [groups, setGroups] = useState<QueueGroup[]>([])
    const [loaded, setLoaded] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const inFlight = useRef(false)
    const queued = useRef(false)

    const loadOnce = useCallback(async () => {
        if (!venueId) return

        // Expire overdue calls and fill free courts first; any open page can
        // do this, so no scheduler is needed.
        await queueApi.process(venueId)

        const [courtResult, groupResult] = await Promise.all([
            supabase
                .from('courts')
                .select(COURT_SELECT)
                .eq('venue_id', venueId)
                .order('sort_order')
                .order('name'),
            supabase
                .from('queue_groups')
                .select(GROUP_SELECT)
                .eq('venue_id', venueId)
                .in('status', ['waiting', 'called', 'playing']),
        ])

        if (courtResult.error) {
            setError(courtResult.error.message)
        } else if (groupResult.error) {
            setError(groupResult.error.message)
        } else {
            setError(null)
            setCourts((courtResult.data ?? []) as unknown as Court[])

            const rows = (groupResult.data ?? []) as unknown as QueueGroup[]
            setGroups(
                rows.map((row) => ({
                    ...row,
                    group_members: [...row.group_members].sort(
                        (a, b) =>
                            new Date(a.joined_at).getTime() - new Date(b.joined_at).getTime()
                    ),
                }))
            )
        }

        setLoaded(true)
    }, [venueId])

    // If a refresh is requested while one is running, run exactly one more
    const refresh = useCallback(async () => {
        if (!venueId) return

        if (inFlight.current) {
            queued.current = true
            return
        }

        inFlight.current = true
        try {
            do {
                queued.current = false
                await loadOnce()
            } while (queued.current)
        } finally {
            inFlight.current = false
        }
    }, [venueId, loadOnce])

    useEffect(() => {
        if (!venueId) return

        refresh()

        // Keeps running in background tabs
        const timer = window.setInterval(refresh, intervalMs)

        const onVisible = () => {
            if (document.visibilityState === 'visible') refresh()
        }
        document.addEventListener('visibilitychange', onVisible)

        return () => {
            window.clearInterval(timer)
            document.removeEventListener('visibilitychange', onVisible)
        }
    }, [venueId, refresh, intervalMs])

    return { courts, groups, loaded, error, refresh }
}