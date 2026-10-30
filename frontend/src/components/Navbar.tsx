import { NavLink, Link } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'

const navItems = [
    { name: 'Join', path: '/find' },
    { name: 'Schedule', path: '/create' },
    { name: 'Local Play', path: '/local' },
]

function Navbar() {
    const { user, loading, signOut } = useAuth()

    return (
        <nav className="w-full border-b border-gray-200 bg-white">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
            {/* Home */}
            <Link
                to="/"
                className="text-xl font-bold text-blue-600 hover:text-blue-700"
            >
                CourtFinder
            </Link>

            {/* Navigation */}
            <div className="flex items-center gap-8">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `text-sm font-medium transition-colors ${
                                isActive
                                    ? 'text-blue-600'
                                    : 'text-gray-600 hover:text-blue-600'
                            }`
                        }
                    >
                        {item.name}
                    </NavLink>
                ))}
            </div>

            {/* Account */}
            <div className="flex min-w-[8rem] items-center justify-end gap-4">
                {!loading &&
                    (user ? (
                        <>
                            <NavLink
                                to="/profile"
                                className={({ isActive }) =>
                                    `text-sm font-medium transition-colors ${
                                        isActive
                                            ? 'text-blue-600'
                                            : 'text-gray-600 hover:text-blue-600'
                                    }`
                                }
                            >
                                Profile
                            </NavLink>
                            <button
                                onClick={signOut}
                                className="text-sm font-medium text-gray-500 transition-colors hover:text-gray-900"
                            >
                                Log Out
                            </button>
                        </>
                    ) : (
                        <Link
                            to="/login"
                            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
                        >
                            Log In
                        </Link>
                    ))}
            </div>
        </div>
        </nav>
    )
}

export default Navbar