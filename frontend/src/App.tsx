import { Routes, Route, Link } from 'react-router-dom'
import WorkflowList from './pages/WorkflowList'
import WorkflowForm from './pages/WorkflowForm'
import Simulator from './pages/Simulator'
import Executions from './pages/Executions'

export default function App() {

    return (
        <>
            <h1>Workflow Automation Engine</h1>

            <nav>
                <Link to="/">Workflows</Link>{' '}
                <Link to="/workflows/new">Novo</Link>{' '}
                <Link to="/simulator">Simulador</Link>{' '}
                <Link to="/executions">Histórico</Link>
            </nav>

            <Routes>
                <Route path="/" element={<WorkflowList />} />
                <Route path="/workflows/new" element={<WorkflowForm />} />
                <Route path="/workflows/:id/edit" element={<WorkflowForm />} />
                <Route path="/simulator" element={<Simulator />} />
                <Route path="/executions" element={<Executions />} />
            </Routes>
        </>
    )
}
