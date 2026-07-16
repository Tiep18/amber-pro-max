-- Keep the aggregate implementation intact behind a private, non-executable
-- helper and enforce the canonical attribute contract at the public boundary.

alter function public.admin_save_catalog_variant(jsonb) set schema private;
alter function private.admin_save_catalog_variant(jsonb)
  rename to admin_save_catalog_variant_20260716190000;

revoke all on function private.admin_save_catalog_variant_20260716190000(jsonb)
  from public, anon, authenticated;

create function public.admin_save_catalog_variant(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
declare
  payload_attributes jsonb;
begin
  if not private.is_admin() then
    raise exception 'admin access required' using errcode = '42501';
  end if;

  payload_attributes := p_payload -> 'attributes';
  if payload_attributes is null
    or jsonb_typeof(payload_attributes) <> 'object'
    or payload_attributes = '{}'::jsonb
    or exists (
      select 1
      from jsonb_each(payload_attributes) as attribute(key, value)
      where btrim(attribute.key) = ''
        or attribute.key <> btrim(attribute.key)
        or jsonb_typeof(attribute.value) <> 'string'
        or btrim(attribute.value #>> '{}') = ''
        or (attribute.value #>> '{}') <> btrim(attribute.value #>> '{}')
    )
    or (
      select count(*) <> count(distinct btrim(attribute.key))
      from jsonb_each(payload_attributes) as attribute(key, value)
    )
  then
    raise exception 'variant attributes must be a canonical non-empty string map'
      using errcode = 'P2004';
  end if;

  return private.admin_save_catalog_variant_20260716190000(p_payload);
end;
$$;

revoke all on function public.admin_save_catalog_variant(jsonb)
  from public, anon, authenticated;
grant execute on function public.admin_save_catalog_variant(jsonb)
  to authenticated;
