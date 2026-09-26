import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { errorText } from '../api/client'

export type Resource<T> = {
    data: T | undefined
    error: string
    loading: boolean
    reload: () => Promise<void>
    setData: (data: T) => void
}

/**
 * Loads data for a page and keeps loading / error / data together.
 *
 * `key` identifies what is being loaded (an id, a query string): when it
 * changes, `load` runs again, and an answer for an old key that arrives late
 * is ignored. With `pollMs`, the data also refreshes on an interval while
 * `shouldPoll(data)` is true (used for executions still in progress).
 */
export function useResource<T>(
    load: () => Promise<T>,
    key: string,
    options: { pollMs?: number; shouldPoll?: (data: T) => boolean } = {},
): Resource<T> {
    const [data, setData] = useState<T>()
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)

    // Always call the latest `load` without re-running effects when it changes.
    const loadRef = useRef(load)
    useLayoutEffect(() => {
        loadRef.current = load
    })

    const fetchInto = useCallback((isCurrent: () => boolean) => {
        return loadRef.current().then(
            (result) => {
                if (!isCurrent()) return
                setData(result)
                setError('')
                setLoading(false)
            },
            (err: unknown) => {
                if (!isCurrent()) return
                setError(errorText(err))
                setLoading(false)
            },
        )
    }, [])

    useEffect(() => {
        let current = true
        void fetchInto(() => current)
        return () => {
            current = false
        }
    }, [key, fetchInto])

    const reload = useCallback(() => fetchInto(() => true), [fetchInto])

    const { pollMs, shouldPoll } = options
    const polling =
        pollMs !== undefined && data !== undefined && (shouldPoll ? shouldPoll(data) : true)

    useEffect(() => {
        if (!polling) return
        const timer = setInterval(() => void reload(), pollMs)
        return () => clearInterval(timer)
    }, [polling, pollMs, reload])

    return { data, error, loading, reload, setData }
}
