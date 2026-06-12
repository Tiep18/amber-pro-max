begin;

create extension if not exists pgtap with schema extensions;

select plan(6);

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
    '00000000-0000-0000-0000-0000000000c1',
    'authenticated',
    'authenticated',
    'customer@example.test',
    'x',
    now(),
    '{}'::jsonb,
    '{"role":"admin"}'::jsonb,
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-0000000000da',
    'authenticated',
    'authenticated',
    'database-admin@example.test',
    'x',
    now(),
    '{}'::jsonb,
    '{}'::jsonb,
    now(),
    now()
  );

insert into public.profiles (id, email, preferred_locale)
values
  ('00000000-0000-0000-0000-0000000000c1', 'customer@example.test', 'vi'),
  ('00000000-0000-0000-0000-0000000000da', 'database-admin@example.test', 'en');

insert into public.user_roles (user_id, role, assigned_by, note)
values (
  '00000000-0000-0000-0000-0000000000da',
  'admin',
  '00000000-0000-0000-0000-0000000000da',
  'test admin'
);

select has_schema('private', 'private schema exists for security-definer helpers');

select has_function(
  'private',
  'is_admin',
  array[]::name[],
  'private.is_admin exists without arguments'
);

select isnt(
  (select prosecdef from pg_proc where oid = 'private.is_admin()'::regprocedure),
  false,
  'private.is_admin is security definer'
);

select is(
  (select proconfig::text from pg_proc where oid = 'private.is_admin()'::regprocedure),
  '{"search_path=private, public, pg_temp"}',
  'private.is_admin fixes search_path'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', true);
select set_config('request.jwt.claim.role', 'authenticated', true);

select is_empty(
  $$select * from public.user_roles$$,
  'user-editable metadata does not grant admin access'
);

select throws_ok(
  $$select private.is_admin()$$,
  '42501',
  null,
  'authenticated clients cannot execute private.is_admin directly'
);

select finish();

rollback;
