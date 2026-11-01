import { useEffect } from 'react'
import type { QueueGroup } from './queue'

let audioContext: AudioContext | null = null

export function alertsReady() {
    const sound = audioContext !== null && audioContext.state === 'running'
    const notify = typeof Notification !== 'undefined' && Notification.permission === 'granted'
    return sound || notify
}

export async function enableAlerts() {
    try {
        audioContext = audioContext ?? new AudioContext()
        await audioContext.resume()
    } catch {
    }

    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        try {
            await Notification.requestPermission()
        } catch {
        }
    }
}

function beep() {
    if (!audioContext || audioContext.state !== 'running') return

    const start = audioContext.currentTime

    for (const offset of [0, 0.3]) {
        const oscillator = audioContext.createOscillator()
        const gain = audioContext.createGain()

        oscillator.frequency.value = 880
        gain.gain.setValueAtTime(0.2, start + offset)
        gain.gain.exponentialRampToValueAtTime(0.001, start + offset + 0.2)

        oscillator.connect(gain)
        gain.connect(audioContext.destination)
        oscillator.start(start + offset)
        oscillator.stop(start + offset + 0.25)
    }
}

// Fires when the person's group is called
export function useCallAlert(group: QueueGroup | null, message: string) {
    const callKey = group && group.status === 'called' ? `${group.id}:${group.called_at}` : null

    useEffect(() => {
        if (!callKey) return

        beep()

        try {
            if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
                new Notification('CourtFinder', { body: message })
            }
        } catch {
            // Some mobile browsers only allow notifications from a service worker.
        }

        const originalTitle = document.title
        let ticks = 0

        const timer = window.setInterval(() => {
            ticks += 1
            document.title = ticks % 2 === 1 ? `🔔 ${message}` : originalTitle
            if (ticks % 10 === 0) beep()
        }, 1000)

        return () => {
            window.clearInterval(timer)
            document.title = originalTitle
        }
    }, [callKey])
}