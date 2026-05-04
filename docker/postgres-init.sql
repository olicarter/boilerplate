-- Create the Electric publication for only the tables we want to sync.
-- Excludes 'credentials' which has BYTEA/TEXT[] types Electric can't handle.
-- Excludes 'document_versions' and 'document_references' which have BYTEA fields.
CREATE PUBLICATION electric_publication_default FOR TABLE
  public.users,
  public.topics,
  public.proposals,
  public.votes,
  public.delegations,
  public.teams,
  public.documents,
  public.document_updates;
