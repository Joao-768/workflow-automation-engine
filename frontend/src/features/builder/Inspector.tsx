import { useState } from 'react'
import { CircleAlert } from 'lucide-react'
import {
    ancestorsOf,
    findEventPreset,
    NODE_ID_PATTERN,
    NODE_META,
    type NodeType,
    type ValidationIssue,
    type WorkflowDefinition,
    type WorkflowDetail,
} from '@wae/shared'
import { API_URL, errorText } from '../../api/client'
import { workflows } from '../../api/endpoints'
import { formatDateTime } from '../../lib/format'
import type { FlowNode } from './graphMapping'
import { NODE_FORMS } from './inspector/NodeForms'
import { TextInput, VariableHints } from './inspector/fields'
import { NODE_ICONS } from './nodeCatalog'

type Props = {
    selected: FlowNode | undefined
    definition: WorkflowDefinition
    issues: ValidationIssue[]
    workflow: WorkflowDetail
    description: string
    onDescription: (value: string) => void
    onConfig: (nodeId: string, config: Record<string, unknown>) => void
    onLabel: (nodeId: string, label: string) => void
    onRename: (nodeId: string, nextId: string) => string | null
    onDelete: (nodeId: string) => void
    onSelect: (nodeId: string) => void
    onWorkflowChanged: () => void
}

/** Right-hand panel: the selected node's settings, or the workflow's when nothing is selected. */
export function Inspector(props: Props) {
    return (
        <aside className="inspector" aria-label="Inspector">
            {props.selected ? (
                <NodePanel key={props.selected.id} {...props} node={props.selected} />
            ) : (
                <WorkflowPanel {...props} />
            )}
        </aside>
    )
}

const OUTPUT_HINTS: Partial<Record<NodeType, string[]>> = {
    http_request: ['status', 'body'],
    create_record: ['id', 'data'],
    condition: ['result'],
    email: ['messageId'],
    notification: ['message'],
}

function variablesFor(nodeId: string, definition: WorkflowDefinition): string[] {
    const trigger = definition.nodes.find((n) => n.type === 'trigger')
    const preset =
        trigger?.config.type === 'event'
            ? findEventPreset(String(trigger.config.eventName ?? ''))
            : undefined
    const eventFields = preset
        ? Object.keys(preset.payload).map((key) => `event.${key}`)
        : ['event.<field>']

    const upstream = ancestorsOf(definition, nodeId)
    const steps = definition.nodes
        .filter((n) => upstream.has(n.id) && n.type !== 'trigger')
        .flatMap((n) => (OUTPUT_HINTS[n.type] ?? []).map((field) => `steps.${n.id}.${field}`))

    return [...eventFields, ...steps, 'trigger.receivedAt', 'execution.id']
}

function NodePanel({
    node,
    definition,
    issues,
    onConfig,
    onLabel,
    onRename,
    onDelete,
}: Props & { node: FlowNode }) {
    const [idDraft, setIdDraft] = useState(node.id)
    const [idError, setIdError] = useState('')
    const kind = node.data.kind
    const Icon = NODE_ICONS[kind]
    const Form = NODE_FORMS[kind]
    const nodeIssues = issues.filter((issue) => issue.nodeId === node.id)
    const general = nodeIssues.filter((issue) => !issue.field)

    const fieldError = (field: string) => nodeIssues.find((issue) => issue.field === field)?.message

    const commitId = () => {
        if (idDraft === node.id) return
        if (!NODE_ID_PATTERN.test(idDraft))
            return setIdError('Lowercase letters, digits and underscores; start with a letter.')
        const problem = onRename(node.id, idDraft)
        setIdError(problem ?? '')
    }

    return (
        <>
            <div className="inspector-head">
                <div>
                    <span className="plate">{NODE_META[kind].description}</span>
                    <h3>
                        <Icon size={15} aria-hidden="true" /> {NODE_META[kind].label}
                    </h3>
                </div>
                {kind !== 'trigger' && (
                    <button className="btn-sm btn-halt" onClick={() => onDelete(node.id)}>
                        Delete
                    </button>
                )}
            </div>
            <div className="inspector-body">
                {general.length > 0 && (
                    <ul className="issues" style={{ marginBottom: 14 }}>
                        {general.map((issue, i) => (
                            <li key={i}>
                                <CircleAlert size={13} aria-hidden="true" />
                                {issue.message}
                            </li>
                        ))}
                    </ul>
                )}

                <TextInput
                    label="Name"
                    value={node.data.label ?? ''}
                    onChange={(label) => onLabel(node.id, label)}
                    placeholder={NODE_META[kind].label}
                />

                <Form
                    config={node.data.config}
                    update={(patch) => onConfig(node.id, { ...node.data.config, ...patch })}
                    replace={(config) => onConfig(node.id, config)}
                    fieldError={fieldError}
                />

                {kind !== 'trigger' && <VariableHints tokens={variablesFor(node.id, definition)} />}

                <div className="form-row">
                    <label htmlFor="node-id">Node id</label>
                    <input
                        id="node-id"
                        className={`field field-sm code${idError ? ' invalid' : ''}`}
                        value={idDraft}
                        onChange={(e) => setIdDraft(e.target.value)}
                        onBlur={commitId}
                        onKeyDown={(e) => e.key === 'Enter' && commitId()}
                    />
                    <span className={`hint${idError ? ' bad' : ''}`}>
                        {idError || (
                            <>
                                Later nodes read this node’s output as{' '}
                                <code>{`{{steps.${node.id}...}}`}</code>
                            </>
                        )}
                    </span>
                </div>
            </div>
        </>
    )
}

function WorkflowPanel({
    workflow,
    definition,
    issues,
    description,
    onDescription,
    onSelect,
    onWorkflowChanged,
}: Props) {
    const trigger = definition.nodes.find((node) => node.type === 'trigger')
    const triggerType = trigger?.config.type

    return (
        <>
            <div className="inspector-head">
                <div>
                    <span className="plate">Workflow · v{workflow.version}</span>
                    <h3>Overview</h3>
                </div>
            </div>
            <div className="inspector-body">
                <div className="form-row">
                    <label htmlFor="description">Description</label>
                    <textarea
                        id="description"
                        className="field"
                        rows={3}
                        value={description}
                        onChange={(e) => onDescription(e.target.value)}
                        placeholder="What this workflow is for"
                    />
                </div>

                <div className="form-row">
                    <span className="label">Checks</span>
                    {issues.length === 0 ? (
                        <p className="hint">The graph is valid and can be activated.</p>
                    ) : (
                        <ul className="issues">
                            {issues.map((issue, i) => (
                                <li key={i}>
                                    <CircleAlert size={13} aria-hidden="true" />
                                    <span>
                                        {issue.nodeId && (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => onSelect(issue.nodeId!)}
                                                >
                                                    {issue.nodeId}
                                                </button>{' '}
                                            </>
                                        )}
                                        {issue.field && <code>{issue.field}: </code>}
                                        {issue.message}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {triggerType === 'webhook' && (
                    <WebhookPanel workflow={workflow} onChanged={onWorkflowChanged} />
                )}

                {triggerType === 'schedule' && (
                    <div className="form-row">
                        <span className="label">Schedule</span>
                        <p className="hint">
                            {workflow.nextScheduledRun
                                ? `Next run: ${formatDateTime(workflow.nextScheduledRun)}`
                                : 'Runs only while the workflow is active. Save and activate to schedule it.'}
                        </p>
                    </div>
                )}

                <p className="hint">
                    Drag nodes from the palette, connect handles top to bottom, select a node to
                    configure it. Delete removes the selection.
                </p>
            </div>
        </>
    )
}

function WebhookPanel({
    workflow,
    onChanged,
}: {
    workflow: WorkflowDetail
    onChanged: () => void
}) {
    const [secret, setSecret] = useState('')
    const [error, setError] = useState('')
    const url = `${API_URL}${workflow.webhook.path}`

    const rotate = async () => {
        try {
            setSecret((await workflows.rotateSecret(workflow.id)).secret)
            onChanged()
        } catch (err) {
            setError(errorText(err))
        }
    }
    const remove = async () => {
        try {
            await workflows.removeSecret(workflow.id)
            setSecret('')
            onChanged()
        } catch (err) {
            setError(errorText(err))
        }
    }

    return (
        <div className="form-row">
            <span className="label">Webhook</span>
            <input
                className="field field-sm code"
                readOnly
                value={url}
                onFocus={(e) => e.target.select()}
                aria-label="Webhook URL"
            />
            <span className="hint">
                <code>POST</code> JSON here while the workflow is active. The body becomes{' '}
                <code>event</code>.
            </span>
            <div
                style={{
                    display: 'flex',
                    gap: 6,
                    marginTop: 10,
                    alignItems: 'center',
                    flexWrap: 'wrap',
                }}
            >
                <span className="status" style={{ marginRight: 'auto' }}>
                    secret {workflow.webhook.hasSecret ? 'set' : 'not set'}
                </span>
                <button className="btn-sm" type="button" onClick={rotate}>
                    {workflow.webhook.hasSecret ? 'Rotate secret' : 'Add secret'}
                </button>
                {workflow.webhook.hasSecret && (
                    <button className="btn-sm btn-ghost" type="button" onClick={remove}>
                        Remove
                    </button>
                )}
            </div>
            {secret && (
                <div className="notice" style={{ marginTop: 10, marginBottom: 0 }}>
                    Copy it now, it will not be shown again. Send it as{' '}
                    <code>X-Webhook-Secret</code>.
                    <input
                        className="field field-sm code"
                        readOnly
                        value={secret}
                        onFocus={(e) => e.target.select()}
                        style={{ marginTop: 8 }}
                        aria-label="Webhook secret"
                    />
                </div>
            )}
            {error && <span className="hint bad">{error}</span>}
        </div>
    )
}
