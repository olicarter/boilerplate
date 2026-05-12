import { createContext, useContext, useMemo, useEffect, type ReactNode } from 'react';
import { createOrgCollections } from './collections';
import type { Organisation } from './api';

interface OrgContextValue {
  org: Organisation;
  collections: ReturnType<typeof createOrgCollections>;
}

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({ org, children }: { org: Organisation; children: ReactNode }) {
  const collections = useMemo(() => createOrgCollections(org.id), [org.id]);

  useEffect(() => {
    const root = document.documentElement;
    if (org.primary_color) {
      root.style.setProperty('--color-accent', org.primary_color);
      root.style.setProperty('--color-accent-fg', '#fff');
    } else {
      root.style.removeProperty('--color-accent');
      root.style.removeProperty('--color-accent-fg');
    }
    return () => {
      root.style.removeProperty('--color-accent');
      root.style.removeProperty('--color-accent-fg');
    };
  }, [org.primary_color]);

  return <OrgContext.Provider value={{ org, collections }}>{children}</OrgContext.Provider>;
}

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error('useOrg must be used inside OrgProvider');
  return ctx;
}
