-- Fixed guest identity per private booking link (tour-operator style):
-- bookings created through the link always use these details, so the
-- public page never asks for contact information.
alter table booking_links
  add column if not exists guest_name text,
  add column if not exists guest_email text,
  add column if not exists guest_phone text,
  add column if not exists default_room_config text;
