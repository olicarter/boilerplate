// ElectricSQL + TanStack DB collection — one collection per synced Postgres table.
//
// How it works:
//   1. `createCollection` sets up a local reactive store backed by an ElectricSQL shape.
//   2. Calling collection.insert / .update / .delete applies the change optimistically
//      in the local store immediately, before the API responds.
//   3. The onInsert / onUpdate / onDelete callbacks send the mutation to your NestJS API
//      and return the Postgres transaction ID (txid).
//   4. ElectricSQL streams the committed row back via the shape endpoint; TanStack DB
//      uses the txid to reconcile the optimistic row with the real Postgres row.
//
// Example — copy and adapt for each synced table:
//
// import { electricCollectionOptions } from '@tanstack/electric-db-collection';
// import { createCollection } from '@tanstack/react-db';
// import { itemsApi, type Item } from './api';
//
// export const itemCollection = createCollection(
//   electricCollectionOptions({
//     id: 'items',
//     shapeOptions: {
//       url: `${window.location.origin}/electric/v1/shape`,
//       params: { table: 'items' },
//     },
//     getKey: (row) => (row as Item).id,
//
//     onInsert: async ({ transaction }) => {
//       const newItem = transaction.mutations[0].modified as Item;
//       const result = await itemsApi.create(newItem.name, newItem.id);
//       return { txid: result.txid };
//     },
//
//     onUpdate: async ({ transaction }) => {
//       const modified = transaction.mutations[0].modified as Item;
//       const result = await itemsApi.update(modified.id, { name: modified.name });
//       return { txid: result.txid };
//     },
//
//     onDelete: async ({ transaction }) => {
//       const original = transaction.mutations[0].original as Item;
//       const result = await itemsApi.delete(original.id);
//       return { txid: result.txid };
//     },
//   }),
// );
