-- Bootstrap controlado do primeiro Super Admin.
-- Email aprovado é inserido exclusivamente na base de dados, não no repositório público.
create schema if not exists internal;
revoke all on schema internal from public, anon, authenticated;
create table internal.first_admin_allowlist (
 email text primary key check (email=lower(btrim(email))),
 approved_at timestamptz not null default now(),
 consumed_at timestamptz,
 consumed_by uuid references auth.users(id) on delete set null
);
revoke all on internal.first_admin_allowlist from public, anon, authenticated;
create function internal.authorize_verified_initial_admin()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  if new.email_confirmed_at is null or new.email is null then return new; end if;
  if exists (select 1 from public.platform_admins) then return new; end if;
  update internal.first_admin_allowlist
     set consumed_at=now(), consumed_by=new.id
   where email=lower(btrim(new.email)) and consumed_at is null;
  if found then
    insert into public.platform_admins(user_id) values (new.id)
    on conflict (user_id) do nothing;
  end if;
  return new;
end $$;
revoke all on function internal.authorize_verified_initial_admin() from public, anon, authenticated;
create trigger ubuntu_pos_first_admin_verified
after insert or update of email_confirmed_at on auth.users
for each row execute function internal.authorize_verified_initial_admin();
comment on function internal.authorize_verified_initial_admin() is
 'Apenas conta previamente aprovada e com email confirmado recebe o primeiro perfil de plataforma; uma única utilização.';
