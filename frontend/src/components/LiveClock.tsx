import { useEffect, useState } from 'react'

function useNow(intervalMs = 1000) {
    const [now, setNow] = useState(() => Date.now())

    useEffect(() => {
        const timer = window.setInterval(() => setNow(Date.now()), intervalMs)
        return () => window.clearInterval(timer)
    }, [intervalMs])

    return now
}

function formatClock(ms: number) {
    const totalSeconds = Math.floor(ms / 1000)
    const minutes = Math.floor(totalSeconds / 60)
    const seconds = totalSeconds % 60
    return `${minutes}:${String(seconds).padStart(2, '0')}`
}

// Counts down to a time, e.g. how long a called group has left to respond.
export function Countdown({ until }: { until: string }) {
    const now = useNow()
    const remaining = Math.max(0, new Date(until).getTime() - now)

    return <span className="tabular-nums">{formatClock(remaining)}</span>
}

// Counts up from a time. With a limit, shows overtime in red once passed.
export function Elapsed({
    since,
    limitMinutes,
}: {
    since: string
    limitMinutes?: number | null
}) {
    const now = useNow()
    const elapsed = Math.max(0, now - new Date(since).getTime())
    const limitMs = limitMinutes ? limitMinutes * 60000 : null

    if (limitMs && elapsed > limitMs) {
        return (
            <span className="font-semibold tabular-nums text-red-600">
                Overtime +{formatClock(elapsed - limitMs)}
            </span>
        )
    }

    return <span className="tabular-nums">{formatClock(elapsed)}</span>
}