import { createContext, useContext, useState, type ReactNode } from 'react'

type User = {
    id: number
    name: string
    email: string
}

type AuthContextType = {
    token: string | null
    user: User | null
    login: (token: string, user: User) => void
    logout: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState(localStorage.getItem('token'))

    const stored = localStorage.getItem('user')
    const [user, setUser] = useState<User | null>(stored ? JSON.parse(stored) : null)

    function login(token: string, user: User) {
        localStorage.setItem('token', token)
        localStorage.setItem('user', JSON.stringify(user))
        setToken(token)
        setUser(user)
    }

    function logout() {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setToken(null)
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{ token, user, login, logout }}>
            {children}
        </AuthContext.Provider>
    )
}

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth fora do AuthProvider')
    return ctx
}
