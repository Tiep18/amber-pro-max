export type VariantAttributes = Record<string, string>;

export type VariantAttributeRow = {
  id: string;
  key: string;
  value: string;
};

export type VariantAttributeIssue = {
  index: number;
  field: 'key' | 'value';
  message: string;
};

export function normalizeVariantAttributes(value: unknown): VariantAttributes | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;

  const entries = Object.entries(value);
  if (entries.length === 0) return null;

  const normalized: Array<[string, string]> = [];
  const keys = new Set<string>();
  for (const [rawKey, rawValue] of entries) {
    if (typeof rawValue !== 'string') return null;
    const key = rawKey.trim();
    const item = rawValue.trim();
    if (!key || !item || keys.has(key)) return null;
    keys.add(key);
    normalized.push([key, item]);
  }

  normalized.sort(([left], [right]) => left.localeCompare(right));
  return Object.fromEntries(normalized);
}

export function rowsToVariantAttributes(rows: VariantAttributeRow[]): {
  attributes: VariantAttributes | null;
  issues: VariantAttributeIssue[];
} {
  const issues: VariantAttributeIssue[] = [];
  const seen = new Set<string>();
  const entries: Array<[string, string]> = [];

  rows.forEach((row, index) => {
    const key = row.key.trim();
    const value = row.value.trim();
    if (!key) issues.push({index, field: 'key', message: 'Enter an attribute name.'});
    if (!value) issues.push({index, field: 'value', message: 'Enter an attribute value.'});
    if (key && seen.has(key)) issues.push({index, field: 'key', message: 'Attribute names must be unique.'});
    if (key) seen.add(key);
    if (key && value) entries.push([key, value]);
  });

  if (rows.length === 0) issues.push({index: 0, field: 'key', message: 'Add at least one attribute.'});
  if (issues.length > 0) return {attributes: null, issues};

  entries.sort(([left], [right]) => left.localeCompare(right));
  return {attributes: Object.fromEntries(entries), issues: []};
}

export function attributesToRows(
  value: unknown,
  createId: () => string = () => crypto.randomUUID()
): VariantAttributeRow[] {
  const attributes = normalizeVariantAttributes(value);
  if (!attributes) return [{id: createId(), key: '', value: ''}];
  return Object.entries(attributes).map(([key, item]) => ({id: createId(), key, value: item}));
}

export function canonicalAttributesText(value: unknown) {
  const attributes = normalizeVariantAttributes(value);
  return attributes ? JSON.stringify(attributes) : '';
}

export function variantAttributesLabel(value: unknown, fallback: string) {
  const attributes = normalizeVariantAttributes(value);
  return attributes ? Object.values(attributes).join(' / ') : fallback;
}
