drop view if exists public.approved_product_reviews;

create table public.approved_product_reviews (
  id uuid primary key references public.product_reviews(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  title text check (title is null or char_length(btrim(title)) between 1 and 120),
  body text check (body is null or char_length(btrim(body)) between 1 and 2000),
  masked_author text not null check (char_length(btrim(masked_author)) between 1 and 320),
  verified_purchase boolean not null default true,
  approved_at timestamptz not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  shop_reply_body text check (shop_reply_body is null or char_length(btrim(shop_reply_body)) between 1 and 2000),
  shop_reply_updated_at timestamptz
);

create index approved_product_reviews_product_approved_idx
on public.approved_product_reviews (product_id, approved_at desc);

alter table public.approved_product_reviews enable row level security;

revoke all on table public.approved_product_reviews from public, anon, authenticated;
grant select on table public.approved_product_reviews to anon, authenticated;
grant select, insert, update, delete on table public.approved_product_reviews to service_role;

create policy "approved product reviews are public readable"
on public.approved_product_reviews
for select
to anon, authenticated
using (true);

create or replace function private.sync_approved_product_review_publication(p_review_id uuid)
returns void
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  if p_review_id is null then
    return;
  end if;

  if exists (
    select 1
    from public.product_reviews pr
    where pr.id = p_review_id
      and pr.status = 'approved'
      and pr.approved_at is not null
  ) then
    insert into public.approved_product_reviews (
      id,
      product_id,
      rating,
      title,
      body,
      masked_author,
      verified_purchase,
      approved_at,
      created_at,
      updated_at,
      shop_reply_body,
      shop_reply_updated_at
    )
    select
      pr.id,
      pr.product_id,
      pr.rating,
      pr.title,
      pr.body,
      public.mask_review_author(coalesce(u.email, '')),
      true,
      pr.approved_at,
      pr.created_at,
      pr.updated_at,
      rar.body,
      rar.updated_at
    from public.product_reviews pr
    join auth.users u
      on u.id = pr.user_id
    left join public.review_admin_replies rar
      on rar.review_id = pr.id
    where pr.id = p_review_id
      and pr.status = 'approved'
      and pr.approved_at is not null
    on conflict (id) do update set
      product_id = excluded.product_id,
      rating = excluded.rating,
      title = excluded.title,
      body = excluded.body,
      masked_author = excluded.masked_author,
      verified_purchase = excluded.verified_purchase,
      approved_at = excluded.approved_at,
      created_at = excluded.created_at,
      updated_at = excluded.updated_at,
      shop_reply_body = excluded.shop_reply_body,
      shop_reply_updated_at = excluded.shop_reply_updated_at;
  else
    delete from public.approved_product_reviews
    where id = p_review_id;
  end if;
end;
$$;

create or replace function private.sync_approved_product_review_from_review()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  perform private.sync_approved_product_review_publication(coalesce(new.id, old.id));
  return coalesce(new, old);
end;
$$;

create or replace function private.sync_approved_product_review_from_reply()
returns trigger
language plpgsql
security definer
set search_path = public, private, pg_temp
as $$
begin
  perform private.sync_approved_product_review_publication(coalesce(new.review_id, old.review_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists product_reviews_sync_approved_publication on public.product_reviews;
create trigger product_reviews_sync_approved_publication
after insert or update or delete on public.product_reviews
for each row execute function private.sync_approved_product_review_from_review();

drop trigger if exists review_admin_replies_sync_approved_publication on public.review_admin_replies;
create trigger review_admin_replies_sync_approved_publication
after insert or update or delete on public.review_admin_replies
for each row execute function private.sync_approved_product_review_from_reply();

insert into public.approved_product_reviews (
  id,
  product_id,
  rating,
  title,
  body,
  masked_author,
  verified_purchase,
  approved_at,
  created_at,
  updated_at,
  shop_reply_body,
  shop_reply_updated_at
)
select
  pr.id,
  pr.product_id,
  pr.rating,
  pr.title,
  pr.body,
  public.mask_review_author(coalesce(u.email, '')),
  true,
  pr.approved_at,
  pr.created_at,
  pr.updated_at,
  rar.body,
  rar.updated_at
from public.product_reviews pr
join auth.users u
  on u.id = pr.user_id
left join public.review_admin_replies rar
  on rar.review_id = pr.id
where pr.status = 'approved'
  and pr.approved_at is not null
on conflict (id) do update set
  product_id = excluded.product_id,
  rating = excluded.rating,
  title = excluded.title,
  body = excluded.body,
  masked_author = excluded.masked_author,
  verified_purchase = excluded.verified_purchase,
  approved_at = excluded.approved_at,
  created_at = excluded.created_at,
  updated_at = excluded.updated_at,
  shop_reply_body = excluded.shop_reply_body,
  shop_reply_updated_at = excluded.shop_reply_updated_at;

revoke all on function private.sync_approved_product_review_publication(uuid) from public, anon, authenticated;
revoke all on function private.sync_approved_product_review_from_review() from public, anon, authenticated;
revoke all on function private.sync_approved_product_review_from_reply() from public, anon, authenticated;
