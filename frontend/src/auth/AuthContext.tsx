import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from 'react'
import type { User } from '@wae/shared'
import { readToken, setUnauthorizedHandler, storeToken } from '../api/client'
import { auth as authApi } from '../api/endpoints'

type AuthState = {
    token: string | null
    user: User | null
    login: (token: string, user: User) => void
    logout: () => void
    setUser: (user: User) => void
}

const AuthContext = createContext<AuthState | null>(null)

/**
 * Holds the session. The token lives in localStorage; the user is fetched
 * from /auth/me on load, so a stale copy of the profile is never trusted.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState(readToken)
    const [user, setUser] = useState<User | null>(null)

    const logout = useCallback(() => {
        storeToken(null)
        setToken(null)
        setUser(null)
    }, [])

    const login = useCallback((nextToken: string, nextUser: User) => {
        storeToken(nextToken)
        setToken(nextToken)
        setUser(nextUser)
    }, [])

    useEffect(() => {
        setUnauthorizedHandler(logout)
    }, [logout])

    useEffect(() => {
        if (!token || user) return
        authApi.me().then(setUser, () => undefined)
    }, [token, user])

    const value = useMemo(
        () => ({ token, user, login, logout, setUser }),
        [token, user, login, logout],
    )
    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthState {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
    return ctx
}
