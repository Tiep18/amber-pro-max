-- Link hash-only bearer-token records to the email intent that created them.
-- The nullable columns preserve every legacy token row. Partial unique indexes
-- provide the concurrency fence for new outbox-driven issuance without
-- preventing older/manual token workflows from creating multiple rows.

alter table public.digital_access_tokens
  add column source_email_outbox_id uuid
  references public.transactional_email_outbox(id) on delete set null;

create unique index digital_access_tokens_source_email_outbox_idx
  on public.digital_access_tokens (source_email_outbox_id)
  where source_email_outbox_id is not null;

alter table public.guest_order_access_tokens
  add column source_email_outbox_id uuid
  references public.transactional_email_outbox(id) on delete set null;

create unique index guest_order_access_tokens_source_email_outbox_idx
  on public.guest_order_access_tokens (source_email_outbox_id)
  where source_email_outbox_id is not null;

alter table public.newsletter_unsubscribe_tokens
  add column source_email_outbox_id uuid
  references public.transactional_email_outbox(id) on delete set null;

create unique index newsletter_unsubscribe_tokens_source_email_outbox_idx
  on public.newsletter_unsubscribe_tokens (source_email_outbox_id)
  where source_email_outbox_id is not null;
