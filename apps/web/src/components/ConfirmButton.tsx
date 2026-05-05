import { useState } from 'react';

interface Props {
  label: string;
  confirmLabel?: string;
  onConfirm: () => void | Promise<void>;
  disabled?: boolean;
  style?: React.CSSProperties;
  confirmStyle?: React.CSSProperties;
}

export function ConfirmButton({ label, confirmLabel = 'Yes', onConfirm, disabled, style, confirmStyle }: Props) {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
        <span style={{ fontSize: 12, color: '#666' }}>Are you sure?</span>
        <button
          type="button"
          onClick={async () => {
            setConfirming(false);
            await onConfirm();
          }}
          style={{ fontSize: 12, padding: '0.2rem 0.6rem', cursor: 'pointer', ...confirmStyle }}
        >
          {confirmLabel}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          style={{ fontSize: 12, padding: '0.2rem 0.6rem', cursor: 'pointer', background: 'none', border: '1px solid #ddd' }}
        >
          Cancel
        </button>
      </span>
    );
  }

  return (
    <button type="button" onClick={() => setConfirming(true)} disabled={disabled} style={style}>
      {label}
    </button>
  );
}
