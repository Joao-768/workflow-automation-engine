const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3000'

export async function api(path: string, options: RequestInit = {}) {
    const token = localStorage.getItem('token')

    const res = await fetch(`${BASE_URL}${path}`, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
            ...options.headers,
        },
    })

    if (res.status === 401) {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        window.location.href = '/login'
        throw new Error('Session expired')
    }

    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Request failed')

    return data
}
