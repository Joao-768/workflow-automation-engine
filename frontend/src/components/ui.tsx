import { useEffect, useRef, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { pretty } from '../lib/format'

/** The "W" workflow mark from the favicon, drawn inline so it follows the text colour. */
export function Mark({ to = '/dashboard' }: { to?: string }) {
    return (
        <Link to={to} className="mark">
            <svg width="20" height="20" viewBox="0 0 64 64" aria-hidden="true">
                <rect width="64" height="64" rx="14" fill="#161616" />
                <path
                    d="M13 19 L22 45 L32 27 L42 45 L51 19"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
            <span className="mark-text">Workflow Engine</span>
        </Link>
    )
}

export function Status({ value, label }: { value: string; label?: string }) {
    return <span className={`status status-${value}`}>{label ?? value}</span>
}

export function PageHead({
    title,
    sub,
    plate,
    children,
}: {
    title: ReactNode
    sub?: ReactNode
    plate?: ReactNode
    children?: ReactNode
}) {
    return (
        <div className="head">
            <div>
                {plate && <span className="plate">{plate}</span>}
                <h2>{title}</h2>
                {sub && <p>{sub}</p>}
            </div>
            {children && <div className="head-actions">{children}</div>}
        </div>
    )
}

export function Fault({ message }: { message: string }) {
    return message ? (
        <p className="fault" role="alert">
            {message}
        </p>
    ) : null
}

export function Loading({ what = 'Loading' }: { what?: string }) {
    return <p className="standby">{what}...</p>
}

export function Json({ value, label }: { value: unknown; label?: string }) {
    return (
        <div>
            {label && (
                <span className="plate" style={{ marginBottom: 6 }}>
                    {label}
                </span>
            )}
            <pre className="json">{pretty(value)}</pre>
        </div>
    )
}

/** A modal built on the native <dialog>: focus trapping and Escape come for free. */
export function Dialog({
    open,
    onClose,
    children,
}: {
    open: boolean
    onClose: () => void
    children: ReactNode
}) {
    const ref = useRef<HTMLDialogElement>(null)

    useEffect(() => {
        const dialog = ref.current
        if (!dialog) return
        if (open && !dialog.open) dialog.showModal()
        if (!open && dialog.open) dialog.close()
    }, [open])

    return (
        <dialog ref={ref} onClose={onClose} onCancel={onClose}>
            {open && children}
        </dialog>
    )
}

export function ConfirmDialog(props: {
    open: boolean
    title: string
    message: ReactNode
    confirmLabel: string
    danger?: boolean
    onConfirm: () => void
    onClose: () => void
}) {
    return (
        <Dialog open={props.open} onClose={props.onClose}>
            <div className="dialog-body">
                <h3>{props.title}</h3>
                <p>{props.message}</p>
            </div>
            <div className="dialog-actions">
                <button type="button" onClick={props.onClose}>
                    Cancel
                </button>
                <button
                    type="button"
                    className={props.danger ? 'btn-halt' : 'btn-primary'}
                    onClick={() => {
                        props.onConfirm()
                        props.onClose()
                    }}
                >
                    {props.confirmLabel}
                </button>
            </div>
        </Dialog>
    )
}

export function Pager({
    page,
    pageSize,
    total,
    onPage,
}: {
    page: number
    pageSize: number
    total: number
    onPage: (page: number) => void
}) {
    const pages = Math.max(1, Math.ceil(total / pageSize))
    const first = total === 0 ? 0 : (page - 1) * pageSize + 1
    const last = Math.min(total, page * pageSize)
    return (
        <div className="pager">
            <span>
                {first}–{last} of {total}
            </span>
            <div>
                <button className="btn-sm" disabled={page <= 1} onClick={() => onPage(page - 1)}>
                    Previous
                </button>
                <button
                    className="btn-sm"
                    disabled={page >= pages}
                    onClick={() => onPage(page + 1)}
                >
                    Next
                </button>
            </div>
        </div>
    )
}
