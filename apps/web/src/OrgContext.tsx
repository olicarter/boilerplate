import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { createOrgCollections } from './collections';
import type { Organisation } from './api';

interface OrgContextValue {
  org: Organisation;
  collections: ReturnType<typeof createOrgCollections>;
}

const OrgContext = createContext<OrgContextValue | null>(null);

export function OrgProvider({ org, children }: { org: Organisation; children: ReactNode }) {
  const collections = useMemo(() => createOrgCollections(org.id), [org.id]);
  return <OrgContext.Provider value={{ org, collections }}>{children}</OrgContext.Provider>;
}

export function useOrg(): OrgContextValue {
  const ctx = useContext(OrgContext);
  if (!ctx) throw new Error('useOrg must be used inside OrgProvider');
  return ctx;
}
