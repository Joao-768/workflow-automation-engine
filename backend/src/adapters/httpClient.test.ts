import { describe, expect, it } from 'vitest'
import { isPrivateAddress, sendHttpRequest } from './httpClient'

describe('isPrivateAddress', () => {
    it('blocks loopback, private, link-local and metadata ranges', () => {
        for (const address of ['127.0.0.1', '10.1.2.3', '172.20.0.1', '192.168.1.10', '169.254.169.254', '0.0.0.0', '::1', 'fd00::1', 'fe80::1', '::ffff:127.0.0.1']) {
            expect(isPrivateAddress(address), address).toBe(true)
        }
    })

    it('allows public addresses', () => {
        for (const address of ['8.8.8.8', '1.1.1.1', '2606:4700:4700::1111']) {
            expect(isPrivateAddress(address), address).toBe(false)
        }
    })
})

describe('sendHttpRequest SSRF guard', () => {
    const base = { method: 'GET', headers: {}, timeoutMs: 1000, maxBytes: 1000, allowPrivateNetworks: false }

    it('refuses private IP literals', async () => {
        await expect(sendHttpRequest({ ...base, url: 'http://127.0.0.1:1/' })).rejects.toMatchObject({ kind: 'blocked' })
    })

    it('refuses hostnames that resolve to private addresses', async () => {
        await expect(sendHttpRequest({ ...base, url: 'http://localhost:1/' })).rejects.toMatchObject({ kind: 'blocked' })
    })

    it('refuses non-http protocols', async () => {
        await expect(sendHttpRequest({ ...base, url: 'file:///etc/passwd' })).rejects.toMatchObject({ kind: 'invalid_url' })
    })
})
