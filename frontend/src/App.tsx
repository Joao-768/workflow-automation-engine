import { Routes, Route, Link, Navigate, NavLink } from 'react-router-dom'
import { useAuth } from './AuthContext'
import ProtectedRoute from './ProtectedRoute'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import WorkflowList from './pages/WorkflowList'
import WorkflowForm from './pages/WorkflowForm'
import Simulator from './pages/Simulator'
import Executions from './pages/Executions'
import ExecutionDetail from './pages/ExecutionDetail'
import Login from './pages/Login'
import Register from './pages/Register'

const TABS = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/workflows', label: 'Workflows' },
    { to: '/simulator', label: 'Simulador' },
    { to: '/executions', label: 'Histórico' },
]

function Layout({ children }: { children: React.ReactNode }) {
    const { user, logout } = useAuth()

    return (
        <>
            <header className="rail">
                <div className="wrap">
                    <Link to="/dashboard" className="mark">Workflow Engine</Link>

                    <div className="tabs">
                        {TABS.map(t => (
                            <NavLink key={t.to} to={t.to} className={({ isActive }) => isActive ? 'on' : ''}>
                                {t.label}
                            </NavLink>
                        ))}
                    </div>

                    <div className="whoami">
                        <span>{user?.name}</span>
                        <button className="btn-sm" onClick={logout}>Sair</button>
                    </div>
                </div>
            </header>

            <main className="wrap">{children}</main>
        </>
    )
}

export default function App() {
    const { token } = useAuth()

    const guard = (el: React.ReactNode) => (
        <ProtectedRoute><Layout>{el}</Layout></ProtectedRoute>
    )

    return (
        <Routes>
            <Route path="/" element={token ? <Navigate to="/dashboard" replace /> : <Landing />} />
            <Route path="/login" element={token ? <Navigate to="/dashboard" replace /> : <Login />} />
            <Route path="/register" element={token ? <Navigate to="/dashboard" replace /> : <Register />} />

            <Route path="/dashboard" element={guard(<Dashboard />)} />
            <Route path="/workflows" element={guard(<WorkflowList />)} />
            <Route path="/workflows/new" element={guard(<WorkflowForm />)} />
            <Route path="/workflows/:id/edit" element={guard(<WorkflowForm />)} />
            <Route path="/simulator" element={guard(<Simulator />)} />
            <Route path="/executions" element={guard(<Executions />)} />
            <Route path="/executions/:id" element={guard(<ExecutionDetail />)} />
        </Routes>
    )
}
