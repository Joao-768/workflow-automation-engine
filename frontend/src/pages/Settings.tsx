import { useState, type FormEvent } from 'react'
import { API_URL, errorText } from '../api/client'
import { auth } from '../api/endpoints'
import { useAuth } from '../auth/AuthContext'
import { Fault, PageHead } from '../components/ui'
import { formatDateTime } from '../lib/format'

export default function Settings() {
    const { user, setUser } = useAuth()

    return (
        <div className="narrow">
            <PageHead
                title="Settings"
                sub="Your account and the details you need to call the engine from outside."
            />
            {user && <ProfileForm key={user.id} name={user.name} onSaved={setUser} />}
            <PasswordForm />
            <section className="panel">
                <h3>Engine</h3>
                <p>What external services need to reach your workflows.</p>
                <dl className="kv">
                    <div>
                        <dt>API base URL</dt>
                        <dd className="mono">{API_URL}</dd>
                    </div>
                    <div>
                        <dt>Webhooks</dt>
                        <dd>
                            <code>POST {API_URL}/webhooks/&lt;id&gt;</code>
                            <span className="hint">
                                Each webhook workflow shows its own URL in the builder.
                            </span>
                        </dd>
                    </div>
                    <div>
                        <dt>Secret header</dt>
                        <dd>
                            <code>X-Webhook-Secret</code>
                        </dd>
                    </div>
                    <div>
                        <dt>Account created</dt>
                        <dd>{formatDateTime(user?.createdAt)}</dd>
                    </div>
                </dl>
            </section>
        </div>
    )
}

function ProfileForm({
    name: initial,
    onSaved,
}: {
    name: string
    onSaved: (user: NonNullable<ReturnType<typeof useAuth>['user']>) => void
}) {
    const { user } = useAuth()
    const [name, setName] = useState(initial)
    const [error, setError] = useState('')
    const [saved, setSaved] = useState(false)

    const submit = async (event: FormEvent) => {
        event.preventDefault()
        setError('')
        setSaved(false)
        try {
            onSaved(await auth.updateMe({ name }))
            setSaved(true)
        } catch (err) {
            setError(errorText(err))
        }
    }

    return (
        <form className="panel" onSubmit={submit}>
            <h3>Profile</h3>
            <p>{user?.email}</p>
            <Fault message={error} />
            <div className="form-row">
                <label htmlFor="name">Name</label>
                <input
                    id="name"
                    className="field"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    maxLength={100}
                />
            </div>
            <div className="form-actions">
                <button type="submit" className="btn-primary" disabled={name.trim() === initial}>
                    Save
                </button>
                {saved && <span className="standby">Saved.</span>}
            </div>
        </form>
    )
}

function PasswordForm() {
    const [currentPassword, setCurrent] = useState('')
    const [newPassword, setNew] = useState('')
    const [error, setError] = useState('')
    const [done, setDone] = useState(false)

    const submit = async (event: FormEvent) => {
        event.preventDefault()
        setError('')
        setDone(false)
        try {
            await auth.changePassword({ currentPassword, newPassword })
            setCurrent('')
            setNew('')
            setDone(true)
        } catch (err) {
            setError(errorText(err))
        }
    }

    return (
        <form className="panel" onSubmit={submit}>
            <h3>Password</h3>
            <p>At least 8 characters, with a letter and a digit.</p>
            <Fault message={error} />
            <div className="row-2">
                <div className="form-row">
                    <label htmlFor="current">Current password</label>
                    <input
                        id="current"
                        className="field"
                        type="password"
                        autoComplete="current-password"
                        value={currentPassword}
                        onChange={(e) => setCurrent(e.target.value)}
                        required
                    />
                </div>
                <div className="form-row">
                    <label htmlFor="new">New password</label>
                    <input
                        id="new"
                        className="field"
                        type="password"
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={(e) => setNew(e.target.value)}
                        required
                        minLength={8}
                    />
                </div>
            </div>
            <div className="form-actions">
                <button type="submit" className="btn-primary">
                    Change password
                </button>
                {done && <span className="standby">Password changed.</span>}
            </div>
        </form>
    )
}
