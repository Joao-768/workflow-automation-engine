import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { api } from '../api'

export default function Register() {
    const navigate = useNavigate()
    const { login } = useAuth()

    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')

        api('/auth/register', {
            method: 'POST',
            body: JSON.stringify({ name, email, password }),
        })
            .then(data => {
                login(data.token, data.user)
                navigate('/dashboard')
            })
            .catch(err => setError(err.message))
    }

    return (
        <>
            <h2>Criar conta</h2>
            {error && <p>{error}</p>}
            <form onSubmit={handleSubmit}>
                <div>
                    <label>Nome</label>
                    <input value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div>
                    <label>Email</label>
                    <input
                        type="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label>Password</label>
                    <input
                        type="password"
                        value={password}
                        onChange={e => setPassword(e.target.value)}
                        required
                    />
                </div>
                <button type="submit">Criar conta</button>
            </form>
            <p>
                Já tens conta? <Link to="/login">Entrar</Link>
            </p>
        </>
    )
}
