import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './auth/AuthContext'
import { AppLayout, WideLayout } from './components/Layout'
import BuilderPage from './features/builder/BuilderPage'
import ExecutionDetailPage from './features/executions/ExecutionDetailPage'
import ExecutionsPage from './features/executions/ExecutionsPage'
import Dashboard from './pages/Dashboard'
import Landing from './pages/Landing'
import { Login, Register } from './pages/Auth'
import Playground from './pages/Playground'
import Records from './pages/Records'
import Settings from './pages/Settings'
import WorkflowList from './pages/WorkflowList'

export default function App() {
    const { token } = useAuth()
    const guest = (page: React.ReactNode) => (token ? <Navigate to="/dashboard" replace /> : page)

    return (
        <Routes>
            <Route path="/" element={guest(<Landing />)} />
            <Route path="/login" element={guest(<Login />)} />
            <Route path="/register" element={guest(<Register />)} />

            <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/workflows" element={<WorkflowList />} />
                <Route path="/playground" element={<Playground />} />
                <Route path="/executions" element={<ExecutionsPage />} />
                <Route path="/executions/:id" element={<ExecutionDetailPage />} />
                <Route path="/records" element={<Records />} />
                <Route path="/settings" element={<Settings />} />
            </Route>

            <Route element={<WideLayout />}>
                <Route path="/workflows/:id" element={<BuilderPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    )
}
