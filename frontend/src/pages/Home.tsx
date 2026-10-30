import { Link } from 'react-router-dom'
import { CalendarPlus, Search, MapPin } from 'lucide-react'

const actions = [
    {
        title: 'Join',
        description: 'Join an upcoming scheduled game.',
        path: '/find',
        icon: Search,
    },
    {
        title: 'Schedule',
        description: 'Organize a game and invite other players to join.',
        path: '/create',
        icon: CalendarPlus,
    },
    {
        title: 'Local Play',
        description: 'Queue up for courts or find people to play with right now!',
        path: '/local',
        icon: MapPin,
    },
]

function Home() {
    return (
        <div className="min-h-screen bg-gray-50">
            <section className="mx-auto max-w-7xl px-6 py-20 text-center">

                <p className="mx-auto mt-6 max-w-2xl text-lg text-gray-600">
                    Spend less time managing and more time playing with CourtFinder.
                </p>

                <div className="mt-12 grid grid-cols-1 gap-8 text-left md:grid-cols-3">
                    {actions.map((action) => {
                        const Icon = action.icon

                        return (
                            <Link
                                key={action.path}
                                to={action.path}
                                className="group rounded-2xl border border-gray-200 bg-white p-8 shadow-sm transition hover:-translate-y-1 hover:border-blue-300 hover:shadow-md"
                            >
                                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-100 text-blue-600">
                                    <Icon size={24} />
                                </div>
                                <h2 className="mt-6 text-xl font-semibold text-gray-900">
                                    {action.title}
                                </h2>
                                <p className="mt-3 text-sm leading-6 text-gray-600">
                                    {action.description}
                                </p>
                            </Link>
                        )
                    })}
                </div>
            </section>
        </div>
    )
}

export default Home