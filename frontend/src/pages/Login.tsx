import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../AuthContext'
import { api } from '../api'

export default function Login() {
    const navigate = useNavigate()
    const { login } = useAuth()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')

    function handleSubmit(e: React.FormEvent) {
        e.preventDefault()
        setError('')
        api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
            .then(data => { login(data.token, data.user); navigate('/dashboard') })
            .catch(err => setError(err.message))
    }

    return (
        <div className="gate">
            <span className="mark">Workflow Engine</span>
            <h2>Entrar na tua conta</h2>
            <p className="sub">Acede aos teus workflows.</p>
            {error && <p className="fault">{error}</p>}

            <form onSubmit={handleSubmit}>
                <div className="field">
                    <label>Email</label>
                    <input type="email" value={email} onChange={e => setEmail(e.target.value)} required />
                </div>
                <div className="field">
                    <label>Password</label>
                    <input type="password" value={password} onChange={e => setPassword(e.target.value)} required />
                </div>
                <button type="submit">Entrar</button>
            </form>

            <p className="gate-alt">Não tens conta? <Link to="/register">Criar conta</Link></p>
        </div>
    )
}
