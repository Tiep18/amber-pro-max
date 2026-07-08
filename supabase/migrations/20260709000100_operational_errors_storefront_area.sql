alter table public.operational_errors
  drop constraint if exists operational_errors_area_check;

alter table public.operational_errors
  add constraint operational_errors_area_check
  check (area in ('application', 'storefront', 'payment', 'email', 'fulfillment', 'checkout', 'admin'));

alter table public.operational_errors
  drop constraint if exists operational_errors_error_code_check;

alter table public.operational_errors
  add constraint operational_errors_error_code_check
  check (error_code ~ '^[a-z0-9_.:-]+$');
