// Generic fetch wrapper — all API calls go through this so error handling and
// the base URL are kept in one place.
export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json() as Promise<T>;
}

// All mutations on ElectricSQL-synced tables must return { item: T; txid: number }.
// The txid is captured server-side via `SELECT pg_current_xact_id()::text` inside
// the same transaction as the write, and returned to the client so TanStack DB can
// reconcile the optimistic row once ElectricSQL streams the committed row back.
export interface MutationResult<T> {
  item: T;
  txid: number;
}

// Example: define your entity type with an index signature so TanStack DB's
// Row<unknown> constraint is satisfied without casting everywhere.
//
// export interface Item {
//   id: string;
//   name: string;
//   created_at: string;
//   [key: string]: unknown;
// }
//
// export const itemsApi = {
//   create: (name: string, id: string) =>
//     request<MutationResult<Item>>('/items', {
//       method: 'POST',
//       body: JSON.stringify({ name, id }),
//     }),
//
//   update: (id: string, data: Partial<Pick<Item, 'name'>>) =>
//     request<MutationResult<Item>>(`/items/${id}`, {
//       method: 'PATCH',
//       body: JSON.stringify(data),
//     }),
//
//   delete: (id: string) =>
//     request<{ txid: number }>(`/items/${id}`, { method: 'DELETE' }),
// };
