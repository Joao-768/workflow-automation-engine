import { Routes, Route, Link, Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import ProtectedRoute from './ProtectedRoute'
import WorkflowList from './pages/WorkflowList'
import WorkflowForm from './pages/WorkflowForm'
import Simulator from './pages/Simulator'
import Executions from './pages/Executions'
import Login from './pages/Login'
import Register from './pages/Register'

export default function App() {
    const { token, user, logout } = useAuth()

    return (
        <>
            <h1>Workflow Automation Engine</h1>

            {token && (
                <nav>
                    <Link to="/">Workflows</Link>
                    <Link to="/workflows/new">Novo</Link>
                    <Link to="/simulator">Simulador</Link>
                    <Link to="/executions">Histórico</Link>
                    <span>{user?.name}</span>
                    <button onClick={logout}>Sair</button>
                </nav>
            )}

            <Routes>
                <Route path="/login" element={token ? <Navigate to="/" replace /> : <Login />} />
                <Route path="/register" element={token ? <Navigate to="/" replace /> : <Register />} />

                <Route path="/" element={<ProtectedRoute><WorkflowList /></ProtectedRoute>} />
                <Route path="/workflows/new" element={<ProtectedRoute><WorkflowForm /></ProtectedRoute>} />
                <Route path="/workflows/:id/edit" element={<ProtectedRoute><WorkflowForm /></ProtectedRoute>} />
                <Route path="/simulator" element={<ProtectedRoute><Simulator /></ProtectedRoute>} />
                <Route path="/executions" element={<ProtectedRoute><Executions /></ProtectedRoute>} />
            </Routes>
        </>
    )
}
