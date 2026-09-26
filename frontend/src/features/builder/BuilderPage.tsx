import { useCallback, useEffect, useState, type DragEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
    Background,
    Controls,
    MiniMap,
    ReactFlow,
    ReactFlowProvider,
    useReactFlow,
} from '@xyflow/react'
import { ArrowLeft, Play } from 'lucide-react'
import { findEventPreset, type NodeType, type TriggerType, type WorkflowDetail } from '@wae/shared'
import { ApiError, errorText } from '../../api/client'
import { workflows } from '../../api/endpoints'
import { Fault, Loading } from '../../components/ui'
import { useResource } from '../../hooks/useResource'
import { nodeTypes } from './FlowNodeCard'
import { Inspector } from './Inspector'
import { DRAG_MIME, Palette } from './Palette'
import { RunDialog } from './RunDialog'
import { useBuilder } from './useBuilder'

export default function BuilderPage() {
    const id = Number(useParams().id)
    const detail = useResource(() => workflows.get(id), String(id))

    if (detail.loading && !detail.data)
        return (
            <div className="wrap" style={{ paddingTop: 32 }}>
                <Loading />
            </div>
        )
    if (!detail.data) {
        return (
            <div className="wrap" style={{ paddingTop: 32 }}>
                <Fault message={detail.error || 'Workflow not found'} />
                <Link to="/workflows">Back to workflows</Link>
            </div>
        )
    }

    return (
        <ReactFlowProvider>
            <Builder key={detail.data.id} initial={detail.data} />
        </ReactFlowProvider>
    )
}

function Builder({ initial }: { initial: WorkflowDetail }) {
    const navigate = useNavigate()
    const flow = useReactFlow()
    const builder = useBuilder(initial)
    const [workflow, setWorkflow] = useState(initial)
    const [error, setError] = useState('')
    const [saving, setSaving] = useState(false)
    const [runOpen, setRunOpen] = useState(false)

    const { name, description, definition, dirty, issues } = builder

    /** Saves if needed and returns the up-to-date workflow. */
    const save = useCallback(async (): Promise<WorkflowDetail> => {
        if (!dirty) return workflow
        setSaving(true)
        setError('')
        try {
            const saved = await workflows.update(workflow.id, {
                name: name.trim() || 'Untitled workflow',
                description: description.trim() || null,
                definition,
            })
            setWorkflow(saved)
            builder.markSaved(saved)
            return saved
        } catch (err) {
            setError(explain(err))
            throw err
        } finally {
            setSaving(false)
        }
    }, [dirty, workflow, name, description, definition, builder])

    const toggleActive = async () => {
        try {
            await save()
            const next = workflow.isActive
                ? await workflows.deactivate(workflow.id)
                : await workflows.activate(workflow.id)
            setWorkflow(next)
            setError('')
        } catch (err) {
            setError(explain(err))
        }
    }

    const run = async (payload: Record<string, unknown>) => {
        await save()
        const { executionId } = await workflows.run(workflow.id, payload)
        navigate(`/executions/${executionId}`)
    }

    const refreshWorkflow = async () => {
        const fresh = await workflows.get(workflow.id)
        setWorkflow((current) => ({
            ...current,
            webhook: fresh.webhook,
            nextScheduledRun: fresh.nextScheduledRun,
        }))
    }

    // Cmd/Ctrl+S saves; closing the tab with unsaved changes asks first.
    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 's') {
                event.preventDefault()
                void save().catch(() => undefined)
            }
        }
        const onUnload = (event: BeforeUnloadEvent) => {
            if (dirty) event.preventDefault()
        }
        window.addEventListener('keydown', onKey)
        window.addEventListener('beforeunload', onUnload)
        return () => {
            window.removeEventListener('keydown', onKey)
            window.removeEventListener('beforeunload', onUnload)
        }
    }, [save, dirty])

    const onDrop = (event: DragEvent) => {
        event.preventDefault()
        const type = event.dataTransfer.getData(DRAG_MIME) as NodeType
        if (!type) return
        builder.addNode(
            type,
            flow.screenToFlowPosition({ x: event.clientX - 110, y: event.clientY - 20 }),
        )
    }

    const triggerConfig = builder.trigger?.data.config ?? {}
    const runPayload =
        triggerConfig.type === 'event'
            ? (findEventPreset(String(triggerConfig.eventName ?? ''))?.payload ?? {})
            : { example: 'value' }

    return (
        <div className="builder">
            <div className="builder-bar">
                <div className="builder-name">
                    <Link
                        to="/workflows"
                        className="btn btn-sm btn-ghost btn-icon"
                        aria-label="Back to workflows"
                    >
                        <ArrowLeft size={16} />
                    </Link>
                    <input
                        className="field"
                        aria-label="Workflow name"
                        value={name}
                        onChange={(e) => builder.setName(e.target.value)}
                        maxLength={120}
                    />
                    <span className={`save-state${dirty ? ' dirty' : ''}`}>
                        {saving
                            ? 'saving...'
                            : dirty
                              ? 'unsaved changes'
                              : `saved · v${workflow.version}`}
                    </span>
                </div>

                <span
                    className="status"
                    style={{ color: issues.length ? 'var(--halt)' : undefined }}
                >
                    {issues.length
                        ? `${issues.length} issue${issues.length > 1 ? 's' : ''}`
                        : 'valid'}
                </span>
                <Link to={`/executions?workflowId=${workflow.id}`} className="btn btn-sm btn-ghost">
                    Executions
                </Link>
                <button
                    className="btn-sm"
                    onClick={() => setRunOpen(true)}
                    disabled={issues.length > 0}
                    title={issues.length ? 'Fix the issues first' : 'Run with a JSON payload'}
                >
                    <Play size={13} /> Run
                </button>
                <label
                    className="check"
                    title={workflow.isActive ? 'Triggers start executions' : 'Triggers are ignored'}
                >
                    <input type="checkbox" checked={workflow.isActive} onChange={toggleActive} />
                    Active
                </label>
                <button
                    className="btn-sm btn-primary"
                    onClick={() => void save().catch(() => undefined)}
                    disabled={!dirty || saving}
                >
                    Save
                </button>
            </div>

            <div className="builder-body">
                <Palette
                    triggerType={triggerConfig.type as TriggerType | undefined}
                    onTrigger={builder.setTriggerType}
                    onAdd={(type) => builder.addNode(type)}
                />

                <div className="canvas" onDragOver={(e) => e.preventDefault()} onDrop={onDrop}>
                    {error && (
                        <div
                            style={{
                                position: 'absolute',
                                top: 12,
                                left: 12,
                                right: 12,
                                zIndex: 10,
                            }}
                        >
                            <Fault message={error} />
                        </div>
                    )}
                    <ReactFlow
                        nodes={builder.displayNodes}
                        edges={builder.edges}
                        nodeTypes={nodeTypes}
                        onNodesChange={builder.onNodesChange}
                        onEdgesChange={builder.onEdgesChange}
                        onConnect={builder.connect}
                        isValidConnection={builder.isValidConnection}
                        onPaneClick={() => builder.select(null)}
                        deleteKeyCode={['Backspace', 'Delete']}
                        colorMode="dark"
                        fitView
                        fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
                        minZoom={0.3}
                        maxZoom={1.6}
                        proOptions={{ hideAttribution: true }}
                    >
                        <Background gap={20} size={1} />
                        <Controls showInteractive={false} />
                        <MiniMap
                            pannable
                            zoomable
                            nodeStrokeWidth={2}
                            style={{ width: 150, height: 100 }}
                        />
                    </ReactFlow>
                </div>

                <Inspector
                    selected={builder.selected}
                    definition={definition}
                    issues={issues}
                    workflow={workflow}
                    description={description}
                    onDescription={builder.setDescription}
                    onConfig={(nodeId, config) => builder.updateNode(nodeId, { config })}
                    onLabel={(nodeId, label) =>
                        builder.updateNode(nodeId, { label: label || undefined })
                    }
                    onRename={builder.renameNode}
                    onDelete={builder.removeNode}
                    onSelect={builder.select}
                    onWorkflowChanged={() => void refreshWorkflow()}
                />
            </div>

            {runOpen && (
                <RunDialog
                    open
                    initialPayload={runPayload}
                    dirty={dirty}
                    onRun={run}
                    onClose={() => setRunOpen(false)}
                />
            )}
        </div>
    )
}

function explain(err: unknown): string {
    if (err instanceof ApiError && err.code === 'invalid_workflow') {
        const issues =
            (err.details as { issues?: { message: string; nodeId?: string }[] } | undefined)
                ?.issues ?? []
        const first = issues[0]
        return `${err.message}${first ? ` First issue: ${first.nodeId ? `${first.nodeId}: ` : ''}${first.message}` : ''}`
    }
    return errorText(err)
}
