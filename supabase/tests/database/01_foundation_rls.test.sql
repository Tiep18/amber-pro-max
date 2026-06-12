begin;

create extension if not exists pgtap with schema extensions;

select plan(8);

insert into auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-0000000000a1',
    'authenticated',
    'authenticated',
    'customer-a@example.test',
    'x',
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-0000000000b2',
    'authenticated',
    'authenticated',
    'customer-b@example.test',
    'x',
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-0000000000ad',
    'authenticated',
    'authenticated',
    'admin@example.test',
    'x',
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into public.profiles (id, email, preferred_locale)
values
  ('00000000-0000-0000-0000-0000000000a1', 'customer-a@example.test', 'vi'),
  ('00000000-0000-0000-0000-0000000000b2', 'customer-b@example.test', 'en'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@example.test', 'en');

insert into public.user_roles (user_id, role, assigned_by, note)
values (
  '00000000-0000-0000-0000-0000000000ad',
  'admin',
  '00000000-0000-0000-0000-0000000000ad',
  'test admin'
);

set local role anon;

select throws_ok(
  $$select * from public.profiles$$,
  '42501',
  null,
  'anonymous role cannot read profiles'
);

select throws_ok(
  $$insert into public.profiles (id, email) values ('00000000-0000-0000-0000-000000000001', 'anon@example.test')$$,
  '42501',
  null,
  'anonymous role cannot write profiles'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$select email from public.profiles order by email$$,
  $$values ('customer-a@example.test'::text)$$,
  'customer A reads only their own profile'
);

update public.profiles
set preferred_locale = 'en', updated_at = now()
where id = '00000000-0000-0000-0000-0000000000a1';

select is(
  (select preferred_locale from public.profiles where id = '00000000-0000-0000-0000-0000000000a1'),
  'en',
  'customer A updates their own profile'
);

update public.profiles
set preferred_locale = 'vi', updated_at = now()
where id = '00000000-0000-0000-0000-0000000000b2';

select is(
  (select preferred_locale from public.profiles where id = '00000000-0000-0000-0000-0000000000b2'),
  null,
  'customer A cannot update customer B profile'
);

select throws_ok(
  $$insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-0000000000a1', 'admin')$$,
  '42501',
  null,
  'customer A cannot write role rows'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000ad', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select results_eq(
  $$select email from public.profiles order by email$$,
  $$values ('admin@example.test'::text), ('customer-a@example.test'::text), ('customer-b@example.test'::text)$$,
  'admin can read all profile rows through database-owned authorization'
);

select is(
  (select count(*)::integer from public.user_roles),
  1,
  'admin can read role rows'
);

select finish();

rollback;
