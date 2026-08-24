type Condition = {
    field: string;
    operator: string;
    value: number;
};

export default function evaluateCondition(
    condition: Condition | null,
    data: Record<string, unknown>
): boolean {
    if (condition === null) return true

    switch (condition.operator) {
        case '<': return Number(data[condition.field]) < condition.value;
        case '>': return Number(data[condition.field]) > condition.value;
        case '==': return condition.value === data[condition.field];
        default: throw new Error(`Unknown operator: ${condition.operator}`);
    }

}