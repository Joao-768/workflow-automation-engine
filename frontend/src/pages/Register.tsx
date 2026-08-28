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
        api('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) })
            .then(data => { login(data.token, data.user); navigate('/dashboard') })
            .catch(err => setError(err.message))
    }

    return (
        <div className="gate">
            <span className="mark">Workflow Engine</span>
            <h2>Criar conta</h2>
            <p className="sub">Cria a tua conta em segundos.</p>
            {error && <p className="fault">{error}</p>}

            <form onSubmit={handleSubmit}>
                <div className="field">
                    <label>Nome</label>
                    <input value={name} onChange={e => setName(e.target.value)} required />
                </div>
                <div className="field">
                    <label>Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="field">
                    <label>Password</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                <button type="submit">Criar conta</button>
            </form>

            <p className="gate-alt">Já tens conta? <Link to="/login">Entrar</Link></p>
        </div>
    )
}
