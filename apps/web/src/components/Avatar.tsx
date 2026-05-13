interface Props {
  name: string;
  avatarUrl?: string | null;
  size?: number;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function hue(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % 360;
  return h;
}

export function Avatar({ name, avatarUrl, size = 28 }: Props) {
  const style: React.CSSProperties = {
    width: size,
    height: size,
    borderRadius: '50%',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  };

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        loading="lazy"
        decoding="async"
        style={{ ...style, objectFit: 'cover' }}
      />
    );
  }

  const h = hue(name);
  return (
    <div
      aria-label={name}
      style={{
        ...style,
        background: `hsl(${h}, 40%, 85%)`,
        color: `hsl(${h}, 40%, 30%)`,
        fontSize: size * 0.38,
        fontWeight: 600,
        fontFamily: 'var(--font-sans)',
        userSelect: 'none',
      }}
    >
      {initials(name)}
    </div>
  );
}
