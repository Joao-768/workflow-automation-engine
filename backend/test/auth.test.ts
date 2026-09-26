import { describe, expect, it } from 'vitest'
import { api, registerUser } from './helpers'

describe('authentication', () => {
    it('registers, logs in and returns the account without secrets', async () => {
        const email = `ana${Date.now()}@example.com`
        const registered = await api()
            .post('/auth/register')
            .send({ name: 'Ana', email: email.toUpperCase(), password: 'password123' })
            .expect(201)

        expect(registered.body.token).toEqual(expect.any(String))
        expect(registered.body.user).toMatchObject({ name: 'Ana', email })
        expect(JSON.stringify(registered.body)).not.toMatch(/password/i)

        const login = await api().post('/auth/login').send({ email, password: 'password123' }).expect(200)
        const me = await api().get('/auth/me').set('Authorization', `Bearer ${login.body.token}`).expect(200)
        expect(me.body).toMatchObject({ email, name: 'Ana' })
        expect(me.body).not.toHaveProperty('password_hash')
    })

    it('validates registration input', async () => {
        const bad = await api().post('/auth/register').send({ name: '', email: 'nope', password: 'short' }).expect(400)
        expect(bad.body.error.code).toBe('validation_error')
        expect(bad.body.error.details.map((d: { path: string }) => d.path)).toEqual(
            expect.arrayContaining(['name', 'email', 'password']),
        )

        const noDigit = await api()
            .post('/auth/register')
            .send({ name: 'A', email: 'a@example.com', password: 'onlyletters' })
            .expect(400)
        expect(noDigit.body.error.message).toMatch(/digit/)
    })

    it('rejects duplicate emails and wrong passwords', async () => {
        const { user } = await registerUser()
        await api().post('/auth/register').send({ name: 'Again', email: user.email, password: 'password123' }).expect(409)

        const wrong = await api().post('/auth/login').send({ email: user.email, password: 'password999' }).expect(401)
        const unknown = await api().post('/auth/login').send({ email: 'ghost@example.com', password: 'password123' }).expect(401)
        // Same answer whether or not the account exists.
        expect(wrong.body).toEqual(unknown.body)
    })

    it('rejects missing, malformed and forged tokens', async () => {
        await api().get('/workflows').expect(401)
        await api().get('/workflows').set('Authorization', 'Token abc').expect(401)
        await api().get('/workflows').set('Authorization', 'Bearer not.a.jwt').expect(401)
        const res = await api()
            .get('/workflows')
            .set('Authorization', 'Bearer eyJhbGciOiJub25lIn0.eyJzdWIiOiIxIn0.')
            .expect(401)
        expect(res.body.error.code).toBe('unauthorized')
    })

    it('changes the password only with the current one', async () => {
        const { auth, user } = await registerUser()
        await api()
            .post('/auth/me/password')
            .set(auth)
            .send({ currentPassword: 'wrong-one1', newPassword: 'newpassword1' })
            .expect(400)
        await api()
            .post('/auth/me/password')
            .set(auth)
            .send({ currentPassword: 'password123', newPassword: 'newpassword1' })
            .expect(204)
        await api().post('/auth/login').send({ email: user.email, password: 'newpassword1' }).expect(200)
    })
})
