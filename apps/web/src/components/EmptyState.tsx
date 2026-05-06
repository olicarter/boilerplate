type EmptyStateVariant = 'proposals' | 'delegations' | 'comments' | 'votes';

const illustrations: Record<EmptyStateVariant, React.ReactNode> = {
  proposals: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="12" y="10" width="56" height="60" rx="6" fill="#f0f0f0" stroke="#ddd" strokeWidth="1.5"/>
      <rect x="20" y="22" width="32" height="3" rx="1.5" fill="#ccc"/>
      <rect x="20" y="30" width="40" height="2" rx="1" fill="#e0e0e0"/>
      <rect x="20" y="36" width="36" height="2" rx="1" fill="#e0e0e0"/>
      <rect x="20" y="42" width="28" height="2" rx="1" fill="#e0e0e0"/>
      <circle cx="56" cy="56" r="14" fill="#fff" stroke="#ddd" strokeWidth="1.5"/>
      <line x1="56" y1="50" x2="56" y2="62" stroke="#bbb" strokeWidth="2" strokeLinecap="round"/>
      <line x1="50" y1="56" x2="62" y2="56" stroke="#bbb" strokeWidth="2" strokeLinecap="round"/>
    </svg>
  ),
  delegations: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="24" cy="28" r="10" fill="#f0f0f0" stroke="#ddd" strokeWidth="1.5"/>
      <circle cx="56" cy="28" r="10" fill="#f0f0f0" stroke="#ddd" strokeWidth="1.5"/>
      <circle cx="40" cy="56" r="10" fill="#f0f0f0" stroke="#ddd" strokeWidth="1.5"/>
      <line x1="34" y1="28" x2="46" y2="28" stroke="#ddd" strokeWidth="1.5" strokeDasharray="3 2"/>
      <line x1="28" y1="36" x2="36" y2="48" stroke="#ddd" strokeWidth="1.5" strokeDasharray="3 2"/>
    </svg>
  ),
  comments: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="10" y="18" width="44" height="30" rx="6" fill="#f0f0f0" stroke="#ddd" strokeWidth="1.5"/>
      <polygon points="20,48 14,60 30,48" fill="#f0f0f0" stroke="#ddd" strokeWidth="1.5" strokeLinejoin="round"/>
      <rect x="18" y="28" width="20" height="2" rx="1" fill="#ccc"/>
      <rect x="18" y="34" width="28" height="2" rx="1" fill="#e0e0e0"/>
      <rect x="26" y="38" width="44" height="26" rx="6" fill="#e8e8e8" stroke="#ddd" strokeWidth="1.5"/>
    </svg>
  ),
  votes: (
    <svg width="80" height="80" viewBox="0 0 80 80" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="14" y="20" width="52" height="42" rx="6" fill="#f0f0f0" stroke="#ddd" strokeWidth="1.5"/>
      <rect x="22" y="34" width="10" height="16" rx="2" fill="#e0e0e0"/>
      <rect x="35" y="28" width="10" height="22" rx="2" fill="#ddd"/>
      <rect x="48" y="38" width="10" height="12" rx="2" fill="#e0e0e0"/>
    </svg>
  ),
};

interface EmptyStateProps {
  variant: EmptyStateVariant;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ variant, title, description, action }: EmptyStateProps) {
  return (
    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#aaa' }}>
      <div style={{ marginBottom: '1rem', opacity: 0.7 }}>
        {illustrations[variant]}
      </div>
      <p style={{ margin: '0 0 0.4rem', fontWeight: 600, fontSize: 15, color: '#888' }}>{title}</p>
      {description && (
        <p style={{ margin: '0 0 1rem', fontSize: 14, color: '#bbb', maxWidth: 280, marginLeft: 'auto', marginRight: 'auto' }}>
          {description}
        </p>
      )}
      {action && <div style={{ marginTop: '1rem' }}>{action}</div>}
    </div>
  );
}
