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

export function Elapsed({
    since,
    limitMinutes,
    extraMinutes = 0,
    strict = false,
}: {
    since: string
    limitMinutes?: number | null
    extraMinutes?: number
    strict?: boolean
}) {
    const now = useNow()
    const elapsed = Math.max(0, now - new Date(since).getTime())
    const limitMs = limitMinutes ? (limitMinutes + extraMinutes) * 60000 : null

    if (!limitMs) {
        return <span className="tabular-nums">{formatClock(elapsed)}</span>
    }

    if (elapsed > limitMs) {
        return (
            <span className="tabular-nums">
                {formatClock(elapsed)} ·{' '}
                <span className="font-semibold text-red-600">
                    {strict ? "Time's up" : `Overtime +${formatClock(elapsed - limitMs)}`}
                </span>
            </span>
        )
    }

    const left = limitMs - elapsed

    return (
        <span className="tabular-nums">
            {formatClock(elapsed)} ·{' '}
            <span className={left < 120000 ? 'font-semibold text-amber-600' : ''}>
                {formatClock(left)} left
            </span>
        </span>
    )
}