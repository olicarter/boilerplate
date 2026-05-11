import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useLiveQuery } from '@tanstack/react-db';
import { usersCollection, membershipsCollection } from '../collections';
import { useOrg } from '../OrgContext';
import type { User, Membership, Delegation } from '../api';
import styles from './DelegationNetworkPage.module.css';

interface NodePos {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  name: string;
  role: string;
}

const ROLE_COLOR: Record<string, string> = {
  admin: '#0a0a0a',
  moderator: '#525252',
  member: '#16a34a',
  observer: '#a3a3a3',
};

export function DelegationNetworkPage() {
  const { org, collections: { delegationsCollection } } = useOrg();
  const { data: allUsers } = useLiveQuery(usersCollection);
  const { data: allMemberships } = useLiveQuery(membershipsCollection);
  const { data: allDelegations } = useLiveQuery(delegationsCollection);

  const svgRef = useRef<SVGSVGElement>(null);
  const [nodes, setNodes] = useState<NodePos[]>([]);
  const [edges, setEdges] = useState<{ from: string; to: string }[]>([]);
  const [tooltip, setTooltip] = useState<{ name: string; x: number; y: number } | null>(null);
  const animRef = useRef<number>(0);
  const nodesRef = useRef<NodePos[]>([]);

  useEffect(() => {
    const orgMembers = (allMemberships ?? []).filter((m: Membership) => m.organisation_id === org.id);
    const userMap = new Map((allUsers ?? []).map((u: User) => [u.id, u]));
    const now = Date.now();
    const activeDels = (allDelegations ?? []).filter((d: Delegation) => {
      if (d.organisation_id !== org.id) return false;
      if (d.expires_at && new Date(d.expires_at).getTime() < now) return false;
      return true;
    });

    const W = svgRef.current?.clientWidth ?? 600;
    const H = svgRef.current?.clientHeight ?? 400;
    const cx = W / 2;
    const cy = H / 2;

    const newNodes: NodePos[] = orgMembers.map((m: Membership, i: number) => {
      const angle = (2 * Math.PI * i) / orgMembers.length;
      const r = Math.min(W, H) * 0.35;
      return {
        id: m.user_id,
        x: cx + r * Math.cos(angle),
        y: cy + r * Math.sin(angle),
        vx: 0,
        vy: 0,
        name: (userMap.get(m.user_id) as User | undefined)?.name ?? m.user_id.slice(0, 6),
        role: m.role,
      };
    });

    const newEdges = activeDels
      .filter((d: Delegation) => newNodes.some((n) => n.id === d.delegator_id) && newNodes.some((n) => n.id === d.delegate_id))
      .map((d: Delegation) => ({ from: d.delegator_id, to: d.delegate_id }));

    nodesRef.current = newNodes;
    setNodes([...newNodes]);
    setEdges(newEdges);

    cancelAnimationFrame(animRef.current);

    function tick() {
      const ns = nodesRef.current;
      const W2 = svgRef.current?.clientWidth ?? 600;
      const H2 = svgRef.current?.clientHeight ?? 400;

      for (let i = 0; i < ns.length; i++) {
        let fx = 0;
        let fy = 0;

        for (let j = 0; j < ns.length; j++) {
          if (i === j) continue;
          const dx = ns[i].x - ns[j].x;
          const dy = ns[i].y - ns[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
          const force = 5000 / (dist * dist);
          fx += (dx / dist) * force;
          fy += (dy / dist) * force;
        }

        for (const e of newEdges) {
          let other: NodePos | undefined;
          if (e.from === ns[i].id) other = ns.find((n) => n.id === e.to);
          else if (e.to === ns[i].id) other = ns.find((n) => n.id === e.from);
          if (!other) continue;
          const dx = other.x - ns[i].x;
          const dy = other.y - ns[i].y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
          const spring = (dist - 120) * 0.03;
          fx += (dx / dist) * spring;
          fy += (dy / dist) * spring;
        }

        fx += (W2 / 2 - ns[i].x) * 0.005;
        fy += (H2 / 2 - ns[i].y) * 0.005;

        ns[i].vx = (ns[i].vx + fx) * 0.85;
        ns[i].vy = (ns[i].vy + fy) * 0.85;
        ns[i].x = Math.max(20, Math.min(W2 - 20, ns[i].x + ns[i].vx));
        ns[i].y = Math.max(20, Math.min(H2 - 20, ns[i].y + ns[i].vy));
      }

      setNodes([...ns]);
      animRef.current = requestAnimationFrame(tick);
    }

    animRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(animRef.current);
  }, [allMemberships?.length, allDelegations?.length, allUsers?.length]);

  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link to="/orgs/$slug/delegations" params={{ slug: org.slug }} className={styles.backLink}>
          ← Delegations
        </Link>
        <h2 className={styles.heading}>Delegation network</h2>
      </div>

      <div className={styles.legend}>
        {Object.entries(ROLE_COLOR).map(([role, color]) => (
          <span key={role} className={styles.legendItem}>
            <span className={styles.legendDot} style={{ background: color }} />
            {role}
          </span>
        ))}
        <span className={styles.legendNote}>Arrows = delegation direction (from delegator → to delegate)</span>
      </div>

      <svg ref={svgRef} className={styles.svg}>
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="var(--color-border-strong)" />
          </marker>
        </defs>

        {edges.map((e, i) => {
          const from = nodeMap.get(e.from);
          const to = nodeMap.get(e.to);
          if (!from || !to) return null;
          const dx = to.x - from.x;
          const dy = to.y - from.y;
          const dist = Math.sqrt(dx * dx + dy * dy) || 1;
          const ex = to.x - (dx / dist) * 14;
          const ey = to.y - (dy / dist) * 14;
          return (
            <line
              key={i}
              x1={from.x}
              y1={from.y}
              x2={ex}
              y2={ey}
              stroke="var(--color-border-strong)"
              strokeWidth={1.5}
              markerEnd="url(#arrow)"
            />
          );
        })}

        {nodes.map((n) => (
          <g
            key={n.id}
            transform={`translate(${n.x},${n.y})`}
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setTooltip({ name: n.name, x: n.x, y: n.y })}
            onMouseLeave={() => setTooltip(null)}
          >
            <circle r={12} fill={ROLE_COLOR[n.role] ?? '#888'} opacity={0.9} />
            <text
              textAnchor="middle"
              dy={26}
              fontSize={10}
              fill="var(--color-fg-muted)"
              style={{ pointerEvents: 'none', userSelect: 'none' }}
            >
              {n.name.length > 12 ? n.name.slice(0, 11) + '…' : n.name}
            </text>
          </g>
        ))}

        {tooltip && (
          <g transform={`translate(${tooltip.x + 16},${tooltip.y - 8})`}>
            <rect x={0} y={0} width={tooltip.name.length * 7 + 12} height={22} rx={4} fill="rgba(0,0,0,0.75)" />
            <text x={6} y={15} fontSize={11} fill="#fff">{tooltip.name}</text>
          </g>
        )}
      </svg>

      {nodes.length === 0 && (
        <p className={styles.emptyHint}>No members to display.</p>
      )}
      {nodes.length > 0 && edges.length === 0 && (
        <p className={styles.emptyHint}>No active delegations in this organisation.</p>
      )}
    </div>
  );
}
