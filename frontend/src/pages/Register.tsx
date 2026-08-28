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
            <h2>Create account</h2>
            <p className="sub">Set up your account in seconds.</p>
            {error && <p className="fault">{error}</p>}

            <form onSubmit={handleSubmit}>
                <div className="field">
                    <label>Name</label>
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
                <button type="submit">Create account</button>
            </form>

            <p className="gate-alt">Already have an account? <Link to="/login">Sign in</Link></p>
        </div>
    )
}
