-- Ubuntu POS 360: núcleo multiempresa e RBAC (sem migrar dados da demonstração).
-- Todas as escritas privilegiadas são feitas pelo backend com service_role.
create table public.platform_admins (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_-]{3,40}$'),
  name text not null check (length(btrim(name)) between 3 and 100),
  monthly_price_mzn numeric(12,2) not null default 0 check (monthly_price_mzn >= 0),
  max_branches integer not null default 1 check (max_branches between 1 and 1000),
  max_users integer not null default 5 check (max_users between 1 and 10000),
  enabled boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.modules (
  code text primary key check (code ~ '^[a-z0-9_-]{3,50}$'),
  name text not null,
  module_type text not null check (module_type in ('core','sector','addon')),
  available boolean not null default true
);
create table public.plan_modules (
  plan_id uuid not null references public.plans(id) on delete cascade,
  module_code text not null references public.modules(code),
  primary key (plan_id,module_code)
);
create table public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(btrim(name)) between 3 and 160),
  slug text not null unique check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  sector text not null check (sector in ('loja','farmacia','restaurante','bar','talho','padaria','grossista')),
  province text not null default '',
  city text not null default '',
  nuit text,
  phone text not null default '',
  email text not null default '',
  plan_id uuid not null references public.plans(id),
  status text not null default 'trial' check (status in ('trial','active','suspended')),
  license_expires_at date not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index tenants_status_idx on public.tenants(status,license_expires_at);
create table public.tenant_modules (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  module_code text not null references public.modules(code),
  primary key (tenant_id,module_code)
);
create table public.branches (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  name text not null check (length(btrim(name)) between 2 and 120),
  code text not null check (length(btrim(code)) between 2 and 24),
  city text not null default '',
  address text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id,id),
  unique (tenant_id,code)
);
create index branches_tenant_idx on public.branches(tenant_id);
create table public.tenant_memberships (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null check (length(btrim(display_name)) between 2 and 120),
  email text not null,
  role text not null check (role in ('company_admin','manager','supervisor','cashier','stock')),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (tenant_id,user_id),
  unique (tenant_id,id)
);
create index tenant_memberships_user_idx on public.tenant_memberships(user_id,tenant_id) where active;
create table public.membership_branches (
  tenant_id uuid not null,
  membership_id uuid not null,
  branch_id uuid not null,
  primary key (tenant_id,membership_id,branch_id),
  foreign key (tenant_id,membership_id) references public.tenant_memberships(tenant_id,id) on delete cascade,
  foreign key (tenant_id,branch_id) references public.branches(tenant_id,id) on delete cascade
);
create table public.audit_events (
  id bigint generated always as identity primary key,
  tenant_id uuid references public.tenants(id) on delete cascade,
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null,
  target_type text not null,
  target_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index audit_events_tenant_time_idx on public.audit_events(tenant_id,created_at desc);

-- SECURITY DEFINER checks: table ownership bypasses membership RLS recursion.
create function public.is_platform_admin() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.platform_admins where user_id = (select auth.uid())); $$;
create function public.can_read_tenant(target_tenant uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
 select public.is_platform_admin() or exists(
  select 1 from public.tenant_memberships m
  join public.tenants t on t.id=m.tenant_id
  where m.tenant_id=target_tenant and m.user_id=(select auth.uid())
   and m.active and t.status in ('trial','active') and t.license_expires_at>=current_date
 );
$$;
create function public.can_manage_tenant(target_tenant uuid) returns boolean
language sql stable security definer set search_path = ''
as $$
 select public.is_platform_admin() or exists(
  select 1 from public.tenant_memberships m
  join public.tenants t on t.id=m.tenant_id
  where m.tenant_id=target_tenant and m.user_id=(select auth.uid())
   and m.role='company_admin' and m.active
   and t.status in ('trial','active') and t.license_expires_at>=current_date
 );
$$;
revoke all on function public.is_platform_admin() from public,anon;
revoke all on function public.can_read_tenant(uuid) from public,anon;
revoke all on function public.can_manage_tenant(uuid) from public,anon;
grant execute on function public.is_platform_admin() to authenticated;
grant execute on function public.can_read_tenant(uuid) to authenticated;
grant execute on function public.can_manage_tenant(uuid) to authenticated;

alter table public.platform_admins enable row level security;
alter table public.plans enable row level security;
alter table public.modules enable row level security;
alter table public.plan_modules enable row level security;
alter table public.tenants enable row level security;
alter table public.tenant_modules enable row level security;
alter table public.branches enable row level security;
alter table public.tenant_memberships enable row level security;
alter table public.membership_branches enable row level security;
alter table public.audit_events enable row level security;

create policy "Platform admins see own authorization" on public.platform_admins for select to authenticated
 using (user_id=(select auth.uid()));
create policy "Signed-in users see available plans" on public.plans for select to authenticated using (enabled);
create policy "Signed-in users see module catalogue" on public.modules for select to authenticated using (available);
create policy "Signed-in users see plan module catalogue" on public.plan_modules for select to authenticated using (true);
create policy "Members see licensed tenant or platform admins" on public.tenants for select to authenticated
 using ((select public.can_read_tenant(id)));
create policy "Members see assigned modules" on public.tenant_modules for select to authenticated
 using ((select public.can_read_tenant(tenant_id)));
create policy "Members see their branches" on public.branches for select to authenticated
 using ((select public.can_read_tenant(tenant_id)) and (
  (select public.can_manage_tenant(tenant_id))
  or exists (select 1 from public.membership_branches mb join public.tenant_memberships m
   on m.id=mb.membership_id and m.tenant_id=mb.tenant_id
   where mb.tenant_id=branches.tenant_id and mb.branch_id=branches.id
    and m.user_id=(select auth.uid()) and m.active)
 ));
create policy "Administrators see staff; staff see own membership" on public.tenant_memberships
 for select to authenticated using (
  (select public.can_manage_tenant(tenant_id))
  or (user_id=(select auth.uid()) and (select public.can_read_tenant(tenant_id)))
 );
create policy "Administrators see branch grants; staff own" on public.membership_branches
 for select to authenticated using (
  (select public.can_manage_tenant(tenant_id))
  or exists(select 1 from public.tenant_memberships m
   where m.id=membership_branches.membership_id and m.tenant_id=membership_branches.tenant_id
   and m.user_id=(select auth.uid()) and m.active
   and (select public.can_read_tenant(m.tenant_id)))
 );
create policy "Platform or company admins see audit events" on public.audit_events
 for select to authenticated using (
  case when tenant_id is null then (select public.is_platform_admin())
  else (select public.can_manage_tenant(tenant_id)) end
 );
-- No INSERT/UPDATE/DELETE grants for authenticated: writes require vetted server operations.
revoke all on public.platform_admins,public.plans,public.modules,public.plan_modules,
 public.tenants,public.tenant_modules,public.branches,public.tenant_memberships,
 public.membership_branches,public.audit_events from anon,authenticated;
grant select on public.platform_admins,public.plans,public.modules,public.plan_modules,
 public.tenants,public.tenant_modules,public.branches,public.tenant_memberships,
 public.membership_branches,public.audit_events to authenticated;

insert into public.modules(code,name,module_type) values
 ('pos','Ponto de venda','core'),('stock','Produtos e stock','core'),
 ('clientes','Clientes e fiado','core'),('relatorios','Relatórios','core'),
 ('farmacias','Farmácias','sector'),('restaurantes','Restaurantes','sector'),
 ('bares','Bares','sector'),('talhos','Talhos','sector'),
 ('padarias','Padarias','sector'),('grossistas','Grossistas','sector'),
 ('filiais','Gestão de filiais','addon'),('catalogo','Catálogo online','addon'),
 ('entregas','Entregas','addon'),('fidelizacao','Fidelização','addon'),
 ('offline','Vendas sem Internet','addon'),('balancas','Balanças','addon'),
 ('auditoria','Auditoria e alertas','addon'),('assistente','Assistente inteligente','addon');
insert into public.plans(code,name,monthly_price_mzn,max_branches,max_users)
 values ('piloto','Piloto (sem cobrança)',0,1,5);
insert into public.plan_modules(plan_id,module_code)
 select p.id,m.code from public.plans p cross join
 (values ('pos'),('stock'),('clientes'),('relatorios')) m(code) where p.code='piloto';
comment on table public.platform_admins is 'Bootstrapping estritamente manual via SQL seguro depois de um utilizador Supabase Auth autenticado; nunca atribuir admin a partir do navegador.';
comment on table public.audit_events is 'Eventos criados apenas por funções de servidor, não pelos clientes autenticados.';
