const dateTime = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'medium',
})

const shortDateTime = new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
})

export function formatDateTime(iso: string | null | undefined): string {
    return iso ? dateTime.format(new Date(iso)) : 'n/a'
}

export function formatShort(iso: string | null | undefined): string {
    return iso ? shortDateTime.format(new Date(iso)) : 'n/a'
}

export function formatDuration(ms: number | null | undefined): string {
    if (ms === null || ms === undefined) return 'n/a'
    if (ms < 1000) return `${ms} ms`
    if (ms < 60_000) return `${(ms / 1000).toFixed(ms < 10_000 ? 2 : 1)} s`
    const minutes = Math.floor(ms / 60_000)
    const seconds = Math.round((ms % 60_000) / 1000)
    if (minutes < 60) return `${minutes}m ${seconds}s`
    return `${Math.floor(minutes / 60)}h ${minutes % 60}m`
}

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })

export function formatRelative(iso: string | null | undefined): string {
    if (!iso) return 'never'
    const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000)
    const abs = Math.abs(seconds)
    if (abs < 45) return 'just now'
    if (abs < 3600) return relative.format(Math.round(seconds / 60), 'minute')
    if (abs < 86_400) return relative.format(Math.round(seconds / 3600), 'hour')
    return relative.format(Math.round(seconds / 86_400), 'day')
}

export function pretty(value: unknown): string {
    if (value === undefined) return 'undefined'
    return JSON.stringify(value, null, 2)
}
