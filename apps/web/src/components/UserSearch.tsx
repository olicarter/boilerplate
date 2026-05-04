import { useState } from 'react';
import { useLiveQuery } from '@tanstack/react-db';
import { usersCollection } from '../collections';
import type { User } from '../api';

interface Props {
  onSelect: (user: User) => void;
  placeholder?: string;
  excludeId?: string;
}

export function UserSearch({
  onSelect,
  placeholder = 'Search by name or email…',
  excludeId,
}: Props) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);

  const { data: allUsers } = useLiveQuery(usersCollection);

  const q = query.toLowerCase().trim();
  const matches =
    q.length === 0
      ? []
      : (allUsers ?? [])
          .filter((u: User) => u.id !== excludeId)
          .filter(
            (u: User) =>
              u.name.toLowerCase().includes(q) ||
              u.email.toLowerCase().includes(q),
          )
          .slice(0, 8);

  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '0.5rem',
          fontSize: 14,
          boxSizing: 'border-box',
          border: '1px solid #ddd',
          borderRadius: 4,
        }}
      />
      {open && matches.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: '#fff',
            border: '1px solid #ddd',
            borderTop: 'none',
            borderRadius: '0 0 4px 4px',
            zIndex: 10,
            maxHeight: 240,
            overflowY: 'auto',
          }}
        >
          {matches.map((u: User) => (
            <div
              key={u.id}
              onMouseDown={() => {
                onSelect(u as User);
                setQuery('');
                setOpen(false);
              }}
              style={{ padding: '0.5rem 0.75rem', cursor: 'pointer', fontSize: 14 }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = '#f8f8f8';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLDivElement).style.background = '';
              }}
            >
              <span style={{ fontWeight: 500 }}>{u.name}</span>
              <span style={{ color: '#888', marginLeft: '0.5rem', fontSize: 13 }}>
                {u.email}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
