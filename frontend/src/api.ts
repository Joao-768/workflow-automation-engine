const BASE_URL = 'http://localhost:3000'

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
        throw new Error('Sessão expirada')
    }

    const data = await res.json()
    if (!res.ok) throw new Error(data.error ?? 'Erro no pedido')

    return data
}
