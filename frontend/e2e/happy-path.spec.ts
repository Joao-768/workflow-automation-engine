import { expect, test } from '@playwright/test'

/**
 * The core loop of the product, through the browser:
 * sign up -> create a workflow in the builder -> add a step -> save ->
 * run it -> open the execution the backend produced.
 *
 * Requires a worker to be running (npm run worker) to process the run.
 */
test('build, run and inspect a workflow', async ({ page }) => {
    const email = `e2e-${Date.now()}@example.com`

    await page.goto('/register')
    await page.getByLabel('Name').fill('E2E')
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Password').fill('password123')
    await page.getByRole('button', { name: 'Create account' }).click()
    await expect(page).toHaveURL(/\/dashboard/)

    await page.getByRole('button', { name: 'New workflow' }).click()
    await expect(page).toHaveURL(/\/workflows\/\d+/)
    await expect(page.getByText('saved · v1')).toBeVisible()

    // A lone trigger is not runnable yet; adding a node connects it.
    await page.getByLabel('Workflow name').fill('E2E notification')
    await page.getByRole('button', { name: /Notification/ }).click()
    await expect(page.getByText('valid', { exact: true })).toBeVisible()

    await page.getByRole('button', { name: 'Save', exact: true }).click()
    await expect(page.getByText('saved · v2')).toBeVisible()

    await page.getByRole('button', { name: 'Run', exact: true }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Run', exact: true }).click()

    await expect(page).toHaveURL(/\/executions\/\d+/)
    await expect(page.getByRole('heading', { name: 'E2E notification' })).toBeVisible()
    await expect(page.locator('.head .status-success')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('.timeline')).toContainText('notify_1')
    await expect(page.locator('.timeline')).toContainText('success')
})
