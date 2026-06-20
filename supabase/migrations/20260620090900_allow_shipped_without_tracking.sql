alter table public.physical_fulfillments drop constraint if exists physical_fulfillments_check;
alter table public.physical_fulfillments add constraint physical_fulfillments_tracking_url_https_check check (tracking_url is null or tracking_url ~ '^https://');
