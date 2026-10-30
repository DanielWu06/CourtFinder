import { useState } from 'react'
import { MapPin, Users, Clock } from 'lucide-react'

const venues = [
    {
        id: 1,
        name: 'Irvine Badminton Club',
        location: 'Irvine, CA',
        sport: 'Badminton',
        courts: 8,
        waitingGroups: 3,
    },
    {
        id: 2,
        name: 'Orange County Pickleball',
        location: 'Orange County, CA',
        sport: 'Pickleball',
        courts: 6,
        waitingGroups: 2,
    },
]

function LocalPlay() {
    const [selectedVenue, setSelectedVenue] = useState(venues[0].id)
    const [groupName, setGroupName] = useState('')
    const [playerCount, setPlayerCount] = useState('2')
    const [joined, setJoined] = useState(false)

    const venue = venues.find((item) => item.id === selectedVenue)!

    function handleJoin() {
        if (!groupName.trim()) {
            return
        }

        setJoined(true)
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="mx-auto max-w-5xl px-6 py-12">
                <h1 className="text-3xl font-bold text-gray-900">
                    Local Play
                </h1>

                <p className="mt-2 text-gray-600">
                    Find a venue, form your group, and get ready to play.
                </p>

                <div className="mt-8 grid gap-6 md:grid-cols-2">
                    {venues.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => {
                                setSelectedVenue(item.id)
                                setJoined(false)
                            }}
                            className={`rounded-xl border bg-white p-6 text-left shadow-sm transition ${
                                selectedVenue === item.id
                                    ? 'border-blue-500 ring-2 ring-blue-100'
                                    : 'border-gray-200 hover:border-blue-300'
                            }`}
                        >
                            <div className="flex items-center justify-between">
                                <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                                    {item.sport}
                                </span>

                                {selectedVenue === item.id && (
                                    <span className="text-xs font-semibold text-blue-600">
                                        Selected
                                    </span>
                                )}
                            </div>

                            <h2 className="mt-4 text-xl font-semibold text-gray-900">
                                {item.name}
                            </h2>

                            <p className="mt-2 flex items-center gap-2 text-sm text-gray-500">
                                <MapPin size={16} />
                                {item.location}
                            </p>

                            <div className="mt-5 flex gap-5 text-sm text-gray-600">
                                <span>{item.courts} courts</span>
                                <span>{item.waitingGroups} groups waiting</span>
                            </div>
                        </button>
                    ))}
                </div>

                <div className="mt-8 rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                    <h2 className="text-xl font-semibold text-gray-900">
                        Create Your Group
                    </h2>

                    <p className="mt-2 text-sm text-gray-600">
                        Selected venue: {venue.name}
                    </p>

                    <div className="mt-6 grid gap-6 sm:grid-cols-2">
                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                                Group Name
                            </label>
                            <input
                                value={groupName}
                                onChange={(event) => setGroupName(event.target.value)}
                                placeholder="e.g. The Smashers"
                                className="w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
                            />
                        </div>

                        <div>
                            <label className="mb-2 block text-sm font-medium text-gray-700">
                                Number of Players
                            </label>
                            <select
                                value={playerCount}
                                onChange={(event) => setPlayerCount(event.target.value)}
                                className="w-full rounded-lg border border-gray-300 bg-white px-4 py-3"
                            >
                                <option value="1">1 Player</option>
                                <option value="2">2 Players</option>
                                <option value="3">3 Players</option>
                                <option value="4">4 Players</option>
                            </select>
                        </div>
                    </div>

                    <button
                        onClick={handleJoin}
                        disabled={!groupName.trim()}
                        className="mt-6 w-full rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                        Join Waiting Pool
                    </button>

                    {joined && (
                        <div className="mt-6 rounded-xl border border-green-200 bg-green-50 p-5">
                            <p className="font-semibold text-green-800">
                                Group joined the waiting pool!
                            </p>

                            <div className="mt-3 space-y-2 text-sm text-green-800">
                                <p className="flex items-center gap-2">
                                    <Users size={16} />
                                    {groupName} · {playerCount} players
                                </p>

                                <p className="flex items-center gap-2">
                                    <MapPin size={16} />
                                    {venue.name}
                                </p>

                                <p className="flex items-center gap-2">
                                    <Clock size={16} />
                                    Waiting for an available court
                                </p>
                            </div>

                            <p className="mt-3 text-xs text-green-700">
                                Prototype only: no actual queue entry has been created.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}

export default LocalPlay