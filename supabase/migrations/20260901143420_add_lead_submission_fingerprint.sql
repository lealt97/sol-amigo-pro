alter table public.leads
  add column if not exists submission_fingerprint text;

create index if not exists leads_user_submission_fingerprint_created_at_idx
  on public.leads (user_id, submission_fingerprint, created_at desc)
  where submission_fingerprint is not null;
