create table public.launch_settings (
  singleton_id boolean primary key default true check (singleton_id),
  brand_name text,
  enabled_country_codes text[] not null default '{}',
  tax_stance text,
  seller_policy_approval text,
  paypal_sandbox_evidence text,
  vietqr_bank_evidence text,
  e2e_evidence text,
  monitoring_ready boolean not null default false,
  redaction_ready boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.launch_settings (singleton_id)
values (true)
on conflict (singleton_id) do nothing;

create or replace function private.touch_launch_settings_updated_at()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger launch_settings_touch_updated_at
before update on public.launch_settings
for each row execute function private.touch_launch_settings_updated_at();

alter table public.launch_settings enable row level security;

create policy "launch settings are admin managed" on public.launch_settings
for all to authenticated
using (private.is_admin())
with check (private.is_admin());

grant select, insert, update, delete on public.launch_settings to authenticated;
grant select, insert, update, delete on public.launch_settings to service_role;

create or replace function public.list_published_required_policy_links(target_locale text)
returns table (
  policy_kind text,
  slug text,
  title text
)
language sql
stable
security definer
set search_path = public, private, pg_temp
as $$
  select
    pp.policy_kind,
    ppt.slug,
    ppt.title
  from public.policy_pages pp
  join public.policy_page_translations ppt
    on ppt.policy_id = pp.id
   and ppt.locale = target_locale
  where pp.status = 'published'
    and pp.published_at is not null
    and pp.policy_kind in ('privacy', 'terms_of_sale', 'returns', 'digital_downloads')
  order by pp.policy_kind;
$$;

revoke all on function public.list_published_required_policy_links(text) from public;
grant execute on function public.list_published_required_policy_links(text) to anon, authenticated;
