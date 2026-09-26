import type { ApiErrorBody } from '@wae/shared'

export const API_URL: string = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

const TOKEN_KEY = 'token'

/** An error answered by the API, with its stable code and optional details. */
export class ApiError extends Error {
    readonly status: number
    readonly code: string
    readonly details?: unknown

    constructor(status: number, code: string, message: string, details?: unknown) {
        super(message)
        this.name = 'ApiError'
        this.status = status
        this.code = code
        this.details = details
    }
}

export function readToken(): string | null {
    try {
        return localStorage.getItem(TOKEN_KEY)
    } catch {
        return null
    }
}

export function storeToken(token: string | null) {
    try {
        if (token) localStorage.setItem(TOKEN_KEY, token)
        else localStorage.removeItem(TOKEN_KEY)
    } catch {
        // Storage can be unavailable (private mode); the session just won't persist.
    }
}

/** Called when the API says the session is no longer valid. */
let onUnauthorized: () => void = () => undefined
export function setUnauthorizedHandler(handler: () => void) {
    onUnauthorized = handler
}

type Options = {
    method?: string
    body?: unknown
    query?: Record<string, string | number | undefined>
}

export async function request<T>(path: string, options: Options = {}): Promise<T> {
    const url = new URL(path, API_URL)
    for (const [key, value] of Object.entries(options.query ?? {})) {
        if (value !== undefined && value !== '') url.searchParams.set(key, String(value))
    }

    const token = readToken()
    let res: Response
    try {
        res = await fetch(url, {
            method: options.method ?? 'GET',
            headers: {
                ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
        })
    } catch {
        throw new ApiError(0, 'network_error', 'Could not reach the API. Is the backend running?')
    }

    if (res.status === 204) return undefined as T

    const data = await res.json().catch(() => null)
    if (!res.ok) {
        const error = (data as ApiErrorBody | null)?.error
        if (res.status === 401 && token) onUnauthorized()
        throw new ApiError(
            res.status,
            error?.code ?? 'http_error',
            error?.message ?? `Request failed (${res.status})`,
            error?.details,
        )
    }
    return data as T
}

export function errorText(err: unknown): string {
    return err instanceof Error ? err.message : 'Something went wrong'
}
