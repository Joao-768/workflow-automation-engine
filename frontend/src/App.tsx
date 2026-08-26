import { Routes, Route, Link, Navigate } from 'react-router-dom'
import { useAuth } from './AuthContext'
import ProtectedRoute from './ProtectedRoute'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import WorkflowList from './pages/WorkflowList'
import WorkflowForm from './pages/WorkflowForm'
import Simulator from './pages/Simulator'
import Executions from './pages/Executions'
import ExecutionDetail from './pages/ExecutionDetail'
import Settings from './pages/Settings'
import Login from './pages/Login'
import Register from './pages/Register'

export default function App() {
    const { token, user, logout } = useAuth()

    return (
        <>
            <h1>Workflow Automation Engine</h1>

            {token && (
                <nav>
                    <Link to="/dashboard">Dashboard</Link>
                    <Link to="/workflows">Workflows</Link>
                    <Link to="/simulator">Simulador</Link>
                    <Link to="/executions">Histórico</Link>
                    <Link to="/settings">Definições</Link>
                    <span>{user?.name}</span>
                    <button onClick={logout}>Sair</button>
                </nav>
            )}

            <Routes>
                <Route path="/" element={token ? <Navigate to="/dashboard" replace /> : <Landing />} />
                <Route path="/login" element={token ? <Navigate to="/dashboard" replace /> : <Login />} />
                <Route path="/register" element={token ? <Navigate to="/dashboard" replace /> : <Register />} />

                <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
                <Route path="/workflows" element={<ProtectedRoute><WorkflowList /></ProtectedRoute>} />
                <Route path="/workflows/new" element={<ProtectedRoute><WorkflowForm /></ProtectedRoute>} />
                <Route path="/workflows/:id/edit" element={<ProtectedRoute><WorkflowForm /></ProtectedRoute>} />
                <Route path="/simulator" element={<ProtectedRoute><Simulator /></ProtectedRoute>} />
                <Route path="/executions" element={<ProtectedRoute><Executions /></ProtectedRoute>} />
                <Route path="/executions/:id" element={<ProtectedRoute><ExecutionDetail /></ProtectedRoute>} />
                <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
            </Routes>
        </>
    )
}
