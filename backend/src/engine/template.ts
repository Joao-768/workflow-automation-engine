/**
 * Substitui {{campo}} pelos valores do evento.
 *
 *   "Ola {{customer}}" + { customer: "Ana" }  ->  "Ola Ana"
 *
 * Um campo que o evento nao traga fica como esta, em vez de virar
 * "undefined" — assim ve-se no historico o que faltou.
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
