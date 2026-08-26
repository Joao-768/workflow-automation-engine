import { useAuth } from '../AuthContext'

export default function Settings() {
    const { user, logout } = useAuth()

    return (
        <>
            <h2>Definições</h2>

            <dl>
                <dt>Nome</dt>
                <dd>{user?.name}</dd>

                <dt>Email</dt>
                <dd>{user?.email}</dd>
            </dl>

            <button onClick={logout}>Terminar sessão</button>
        </>
    )
}
