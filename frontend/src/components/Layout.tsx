import type { ReactNode } from 'react'
import { Navigate, NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/AuthContext'
import { Mark } from './ui'

const TABS = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/workflows', label: 'Workflows' },
    { to: '/playground', label: 'Playground' },
    { to: '/executions', label: 'Executions' },
    { to: '/records', label: 'Records' },
    { to: '/settings', label: 'Settings' },
]

function Rail() {
    const { user, logout } = useAuth()
    return (
        <header className="rail">
            <nav className="rail-inner" aria-label="Main">
                <Mark />
                <div className="tabs">
                    {TABS.map((tab) => (
                        <NavLink
                            key={tab.to}
                            to={tab.to}
                            className={({ isActive }) => (isActive ? 'on' : '')}
                        >
                            {tab.label}
                        </NavLink>
                    ))}
                </div>
                <div className="whoami">
                    <span className="who">{user?.name}</span>
                    <button className="btn-sm" onClick={logout}>
                        Log out
                    </button>
                </div>
            </nav>
        </header>
    )
}

/** Signed-in pages with the usual centred column. */
export function AppLayout() {
    return (
        <RequireAuth>
            <Rail />
            <main className="wrap">
                <Outlet />
            </main>
        </RequireAuth>
    )
}

/** Signed-in pages that use the full width (the builder). */
export function WideLayout() {
    return (
        <RequireAuth>
            <Rail />
            <Outlet />
        </RequireAuth>
    )
}

function RequireAuth({ children }: { children: ReactNode }) {
    const { token } = useAuth()
    if (!token) return <Navigate to="/login" replace />
    return <>{children}</>
}
