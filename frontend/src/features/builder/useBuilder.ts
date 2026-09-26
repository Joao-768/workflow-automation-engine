import { useCallback, useMemo, useState } from 'react'
import {
    useEdgesState,
    useNodesState,
    type Connection,
    type Edge,
    type XYPosition,
} from '@xyflow/react'
import {
    validateDefinition,
    type BranchHandle,
    type NodeType,
    type TriggerType,
    type WorkflowDetail,
} from '@wae/shared'
import { edgeStyle, fromFlow, toFlow, type FlowNode } from './graphMapping'
import { defaultConfig, defaultTriggerConfig, nextNodeId } from './nodeCatalog'

/** JSON with sorted keys: Postgres JSONB does not keep key order, so plain JSON.stringify would disagree. */
function stable(value: unknown): string {
    if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
    if (value && typeof value === 'object') {
        const entries = Object.entries(value).filter(([, v]) => v !== undefined)
        entries.sort(([a], [b]) => a.localeCompare(b))
        return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`).join(',')}}`
    }
    return JSON.stringify(value)
}

/** What "saved" means: name, description and the graph as the canvas would save it. */
function snapshot(
    name: string,
    description: string,
    definition: WorkflowDetail['definition'],
): string {
    const { nodes, edges } = toFlow(definition)
    return stable([name.trim(), description.trim(), fromFlow(nodes, edges)])
}

/**
 * All builder state in one hook: the React Flow nodes and edges, the
 * workflow's name and description, live validation and the dirty flag.
 *
 * The canvas is the source of truth while editing; `definition` is derived
 * from it with fromFlow(), and that is exactly what gets saved and run.
 */
export function useBuilder(detail: WorkflowDetail) {
    const initial = useMemo(() => toFlow(detail.definition), [detail.definition])
    const [nodes, setNodes, onNodesChange] = useNodesState<FlowNode>(initial.nodes)
    const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(initial.edges)
    const [name, setName] = useState(detail.name)
    const [description, setDescription] = useState(detail.description ?? '')
    const [savedSnapshot, setSavedSnapshot] = useState(() =>
        snapshot(detail.name, detail.description ?? '', detail.definition),
    )

    const definition = useMemo(() => fromFlow(nodes, edges), [nodes, edges])
    const dirty = snapshot(name, description, definition) !== savedSnapshot

    const validation = useMemo(() => validateDefinition(definition), [definition])
    const issues = useMemo(() => (validation.valid ? [] : validation.issues), [validation])

    /** Nodes as displayed: the same nodes, annotated with their issues. */
    const displayNodes = useMemo(() => {
        const byNode = new Map<string, string[]>()
        for (const issue of issues) {
            if (issue.nodeId)
                byNode.set(issue.nodeId, [...(byNode.get(issue.nodeId) ?? []), issue.message])
        }
        return nodes.map((node) =>
            byNode.has(node.id)
                ? { ...node, data: { ...node.data, issues: byNode.get(node.id) } }
                : node,
        )
    }, [nodes, issues])

    const selected = nodes.find((node) => node.selected)
    const trigger = nodes.find((node) => node.data.kind === 'trigger')

    const markSaved = useCallback((saved: WorkflowDetail) => {
        setSavedSnapshot(snapshot(saved.name, saved.description ?? '', saved.definition))
    }, [])

    const select = useCallback(
        (id: string | null) =>
            setNodes((all) => all.map((node) => ({ ...node, selected: node.id === id }))),
        [setNodes],
    )

    const updateNode = useCallback(
        (id: string, patch: Partial<FlowNode['data']>) =>
            setNodes((all) =>
                all.map((node) =>
                    node.id === id ? { ...node, data: { ...node.data, ...patch } } : node,
                ),
            ),
        [setNodes],
    )

    /** Adds a connection, replacing whatever already left from the same exit. */
    const connect = useCallback(
        (connection: Connection) => {
            const handle = (connection.sourceHandle ?? null) as BranchHandle | null
            setEdges((all) => [
                ...all.filter(
                    (edge) =>
                        !(
                            edge.source === connection.source &&
                            (edge.sourceHandle ?? null) === handle
                        ),
                ),
                {
                    id: `e_${connection.source}_${handle ?? 'out'}_${connection.target}`,
                    source: connection.source,
                    target: connection.target,
                    sourceHandle: handle,
                    ...edgeStyle(),
                },
            ])
        },
        [setEdges],
    )

    const isValidConnection = useCallback(
        (connection: Connection | Edge) => {
            if (connection.source === connection.target) return false
            const target = nodes.find((node) => node.id === connection.target)
            return target?.data.kind !== 'trigger'
        },
        [nodes],
    )

    /**
     * Adds a node. Without a position it goes under the selected node and is
     * connected to it, which makes click-to-build quick.
     */
    const addNode = useCallback(
        (kind: NodeType, position?: XYPosition) => {
            const id = nextNodeId(kind, new Set(nodes.map((node) => node.id)))
            const anchor = selected ?? nodes[nodes.length - 1]

            // Which exit of the anchor is still free: "true" then "false" for a condition.
            const used = new Set(
                edges
                    .filter((edge) => edge.source === anchor?.id)
                    .map((edge) => edge.sourceHandle ?? 'out'),
            )
            const exits = anchor?.data.kind === 'condition' ? ['true', 'false'] : ['out']
            const free = exits.find((exit) => !used.has(exit))

            let at = position
            if (!at) {
                // Under the anchor; true branch to the left, false to the right.
                const shift = free === 'true' ? -140 : free === 'false' ? 140 : 0
                at = { x: (anchor?.position.x ?? 0) + shift, y: (anchor?.position.y ?? 0) + 150 }
                // Never drop a node on top of another one.
                while (
                    nodes.some(
                        (node) =>
                            Math.abs(node.position.x - at!.x) < 200 &&
                            Math.abs(node.position.y - at!.y) < 70,
                    )
                ) {
                    at = { x: at.x + 240, y: at.y }
                }
            }

            setNodes((all) => [
                ...all.map((node) => ({ ...node, selected: false })),
                {
                    id,
                    type: 'workflow',
                    position: at,
                    selected: true,
                    data: { kind, config: defaultConfig(kind) },
                },
            ])

            if (!position && anchor && free) {
                connect({
                    source: anchor.id,
                    target: id,
                    sourceHandle: free === 'out' ? null : free,
                    targetHandle: null,
                })
            }
        },
        [nodes, edges, selected, setNodes, connect],
    )

    const setTriggerType = useCallback(
        (type: TriggerType) => {
            if (!trigger) return
            if (trigger.data.config.type !== type)
                updateNode(trigger.id, { config: defaultTriggerConfig(type) })
            select(trigger.id)
        },
        [trigger, updateNode, select],
    )

    const removeNode = useCallback(
        (id: string) => {
            setNodes((all) => all.filter((node) => node.id !== id))
            setEdges((all) => all.filter((edge) => edge.source !== id && edge.target !== id))
        },
        [setNodes, setEdges],
    )

    /** Renames a node id and its edges. Returns an error message, or null. */
    const renameNode = useCallback(
        (id: string, nextId: string): string | null => {
            if (nodes.some((node) => node.id === nextId)) return `"${nextId}" is already used`
            setNodes((all) => all.map((node) => (node.id === id ? { ...node, id: nextId } : node)))
            setEdges((all) =>
                all.map((edge) => ({
                    ...edge,
                    source: edge.source === id ? nextId : edge.source,
                    target: edge.target === id ? nextId : edge.target,
                })),
            )
            return null
        },
        [nodes, setNodes, setEdges],
    )

    return {
        nodes,
        displayNodes,
        edges,
        onNodesChange,
        onEdgesChange,
        name,
        setName,
        description,
        setDescription,
        definition,
        issues,
        dirty,
        selected,
        trigger,
        markSaved,
        select,
        updateNode,
        connect,
        isValidConnection,
        addNode,
        setTriggerType,
        removeNode,
        renameNode,
    }
}
