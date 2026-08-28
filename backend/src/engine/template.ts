/**
 * Replaces {{field}} with values from the event.
 *
 *   "Hi {{customer}}" + { customer: "Ana" }  ->  "Hi Ana"
 *
 * A field the event doesn't carry is left as-is instead of becoming
 * "undefined", so the history shows what was missing.
 */
export default function fillTemplate(
    value: unknown,
    data: Record<string, unknown>
): unknown {
    if (typeof value !== 'string') return value

    return value.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (original, path: string) => {
        const found = path
            .split('.')
            .reduce<unknown>((acc, key) =>
                (acc && typeof acc === 'object') ? (acc as Record<string, unknown>)[key] : undefined,
            data)

        return found === undefined || found === null ? original : String(found)
    })
}
