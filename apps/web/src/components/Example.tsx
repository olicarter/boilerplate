// Example React components showing TanStack DB + ElectricSQL collection patterns.
//
// useLiveQuery provides a reactive query against a local collection — the component
// re-renders automatically whenever the underlying data changes (optimistic or synced).
// Client-side UUID generation lets the optimistic insert have a stable key before the
// API round-trip completes.
//
// import { type FormEvent, useState } from 'react';
// import { useLiveQuery } from '@tanstack/react-db';
// import { v4 as uuidv4 } from 'uuid';
// import { itemCollection } from '../collections';
// import { type Item } from '../api';
//
// export function ItemForm() {
//   const [name, setName] = useState('');
//
//   const handleSubmit = (e: FormEvent) => {
//     e.preventDefault();
//     if (!name.trim()) return;
//     // Insert with a client-generated UUID — the onInsert callback in
//     // collections.ts will POST to the API and return the txid for reconciliation.
//     itemCollection.insert({
//       id: uuidv4(),
//       name: name.trim(),
//       created_at: new Date().toISOString(),
//     } as Item);
//     setName('');
//   };
//
//   return (
//     <form onSubmit={handleSubmit}>
//       <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" />
//       <button type="submit">Add</button>
//     </form>
//   );
// }
//
// export function ItemList() {
//   const { data } = useLiveQuery((q) =>
//     q.from({ item: itemCollection }).orderBy(({ item }) => item.created_at),
//   );
//
//   return (
//     <ul>
//       {data.map((item) => (
//         <li key={item.id}>
//           <span>{item.name}</span>
//           <button
//             onClick={() =>
//               itemCollection.update(item.id, (draft) => {
//                 // mutate draft directly — TanStack DB handles immutability
//               })
//             }
//           >
//             Edit
//           </button>
//           <button onClick={() => itemCollection.delete(item.id)}>Delete</button>
//         </li>
//       ))}
//     </ul>
//   );
// }
