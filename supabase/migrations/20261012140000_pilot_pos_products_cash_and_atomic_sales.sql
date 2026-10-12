-- Generated from the verified POS Supabase schema (12 October 2026).

-- Depends on initial_multitenant_access_foundation. Non-fiscal pilot; no production warranty.

CREATE TABLE public."pos_cash_sessions" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "branch_id" uuid NOT NULL,
  "opened_by" uuid NOT NULL,
  "opened_at" timestamp with time zone DEFAULT now() NOT NULL,
  "opening_float_mzn" numeric(14,2) NOT NULL,
  "closed_at" timestamp with time zone,
  "expected_close_mzn" numeric(14,2),
  "actual_close_mzn" numeric(14,2)
);

CREATE TABLE public."pos_products" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "branch_id" uuid NOT NULL,
  "name" text NOT NULL,
  "sku" text,
  "barcode" text,
  "unit" text DEFAULT 'un'::text NOT NULL,
  "price_mzn" numeric(14,2) NOT NULL,
  "stock_qty" numeric(14,3) DEFAULT 0 NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE public."pos_sale_lines" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "branch_id" uuid NOT NULL,
  "sale_id" uuid NOT NULL,
  "product_id" uuid NOT NULL,
  "quantity" numeric(14,3) NOT NULL,
  "unit_price_mzn" numeric(14,2) NOT NULL,
  "line_total_mzn" numeric(14,2) NOT NULL
);

CREATE TABLE public."pos_sales" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "tenant_id" uuid NOT NULL,
  "branch_id" uuid NOT NULL,
  "cash_session_id" uuid NOT NULL,
  "cashier_id" uuid NOT NULL,
  "client_request_id" uuid NOT NULL,
  "payment_method" text DEFAULT 'cash'::text NOT NULL,
  "total_mzn" numeric(14,2) NOT NULL,
  "cash_received_mzn" numeric(14,2) NOT NULL,
  "change_mzn" numeric(14,2) NOT NULL,
  "sold_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE public."pos_cash_sessions" ADD CONSTRAINT "pos_cash_sessions_pkey" PRIMARY KEY (id);

ALTER TABLE public."pos_products" ADD CONSTRAINT "pos_products_pkey" PRIMARY KEY (id);

ALTER TABLE public."pos_sale_lines" ADD CONSTRAINT "pos_sale_lines_pkey" PRIMARY KEY (id);

ALTER TABLE public."pos_sales" ADD CONSTRAINT "pos_sales_pkey" PRIMARY KEY (id);

ALTER TABLE public."pos_cash_sessions" ADD CONSTRAINT "pos_cash_sessions_tenant_id_branch_id_id_key" UNIQUE (tenant_id, branch_id, id);

ALTER TABLE public."pos_products" ADD CONSTRAINT "pos_products_tenant_id_branch_id_id_key" UNIQUE (tenant_id, branch_id, id);

ALTER TABLE public."pos_products" ADD CONSTRAINT "pos_products_tenant_id_branch_id_sku_key" UNIQUE (tenant_id, branch_id, sku);

ALTER TABLE public."pos_sales" ADD CONSTRAINT "pos_sales_tenant_id_branch_id_id_key" UNIQUE (tenant_id, branch_id, id);

ALTER TABLE public."pos_sales" ADD CONSTRAINT "pos_sales_tenant_id_client_request_id_key" UNIQUE (tenant_id, client_request_id);

ALTER TABLE public."pos_cash_sessions" ADD CONSTRAINT "pos_cash_sessions_check" CHECK ((((closed_at IS NULL) AND (expected_close_mzn IS NULL) AND (actual_close_mzn IS NULL)) OR ((closed_at IS NOT NULL) AND (expected_close_mzn IS NOT NULL) AND (actual_close_mzn IS NOT NULL))));

ALTER TABLE public."pos_cash_sessions" ADD CONSTRAINT "pos_cash_sessions_opening_float_mzn_check" CHECK ((opening_float_mzn >= (0)::numeric));

ALTER TABLE public."pos_products" ADD CONSTRAINT "pos_products_name_check" CHECK (((char_length(btrim(name)) >= 2) AND (char_length(btrim(name)) <= 150)));

ALTER TABLE public."pos_products" ADD CONSTRAINT "pos_products_price_mzn_check" CHECK ((price_mzn >= (0)::numeric));

ALTER TABLE public."pos_products" ADD CONSTRAINT "pos_products_stock_qty_check" CHECK ((stock_qty >= (0)::numeric));

ALTER TABLE public."pos_products" ADD CONSTRAINT "pos_products_unit_check" CHECK ((unit = ANY (ARRAY['un'::text, 'kg'::text, 'l'::text])));

ALTER TABLE public."pos_sale_lines" ADD CONSTRAINT "pos_sale_lines_line_total_mzn_check" CHECK ((line_total_mzn >= (0)::numeric));

ALTER TABLE public."pos_sale_lines" ADD CONSTRAINT "pos_sale_lines_quantity_check" CHECK ((quantity > (0)::numeric));

ALTER TABLE public."pos_sale_lines" ADD CONSTRAINT "pos_sale_lines_unit_price_mzn_check" CHECK ((unit_price_mzn >= (0)::numeric));

ALTER TABLE public."pos_sales" ADD CONSTRAINT "pos_sales_check" CHECK ((cash_received_mzn >= total_mzn));

ALTER TABLE public."pos_sales" ADD CONSTRAINT "pos_sales_check1" CHECK ((change_mzn = (cash_received_mzn - total_mzn)));

ALTER TABLE public."pos_sales" ADD CONSTRAINT "pos_sales_payment_method_check" CHECK ((payment_method = 'cash'::text));

ALTER TABLE public."pos_sales" ADD CONSTRAINT "pos_sales_total_mzn_check" CHECK ((total_mzn >= (0)::numeric));

ALTER TABLE public."pos_cash_sessions" ADD CONSTRAINT "pos_cash_sessions_opened_by_fkey" FOREIGN KEY (opened_by) REFERENCES auth.users(id);

ALTER TABLE public."pos_cash_sessions" ADD CONSTRAINT "pos_cash_sessions_tenant_id_branch_id_fkey" FOREIGN KEY (tenant_id, branch_id) REFERENCES branches(tenant_id, id);

ALTER TABLE public."pos_cash_sessions" ADD CONSTRAINT "pos_cash_sessions_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE public."pos_products" ADD CONSTRAINT "pos_products_tenant_id_branch_id_fkey" FOREIGN KEY (tenant_id, branch_id) REFERENCES branches(tenant_id, id) ON DELETE CASCADE;

ALTER TABLE public."pos_products" ADD CONSTRAINT "pos_products_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

ALTER TABLE public."pos_sale_lines" ADD CONSTRAINT "pos_sale_lines_tenant_id_branch_id_product_id_fkey" FOREIGN KEY (tenant_id, branch_id, product_id) REFERENCES pos_products(tenant_id, branch_id, id);

ALTER TABLE public."pos_sale_lines" ADD CONSTRAINT "pos_sale_lines_tenant_id_branch_id_sale_id_fkey" FOREIGN KEY (tenant_id, branch_id, sale_id) REFERENCES pos_sales(tenant_id, branch_id, id) ON DELETE CASCADE;

ALTER TABLE public."pos_sales" ADD CONSTRAINT "pos_sales_cashier_id_fkey" FOREIGN KEY (cashier_id) REFERENCES auth.users(id);

ALTER TABLE public."pos_sales" ADD CONSTRAINT "pos_sales_tenant_id_branch_id_cash_session_id_fkey" FOREIGN KEY (tenant_id, branch_id, cash_session_id) REFERENCES pos_cash_sessions(tenant_id, branch_id, id);

ALTER TABLE public."pos_sales" ADD CONSTRAINT "pos_sales_tenant_id_branch_id_fkey" FOREIGN KEY (tenant_id, branch_id) REFERENCES branches(tenant_id, id);

ALTER TABLE public."pos_sales" ADD CONSTRAINT "pos_sales_tenant_id_fkey" FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE;

CREATE INDEX pos_cash_sessions_tenant_idx ON public.pos_cash_sessions USING btree (tenant_id, branch_id, opened_at DESC);

CREATE UNIQUE INDEX pos_one_open_cash_per_user ON public.pos_cash_sessions USING btree (tenant_id, branch_id, opened_by) WHERE (closed_at IS NULL);

CREATE INDEX pos_products_branch_idx ON public.pos_products USING btree (tenant_id, branch_id, active);

CREATE INDEX pos_sale_lines_sale_idx ON public.pos_sale_lines USING btree (tenant_id, sale_id);

CREATE INDEX pos_sales_session_idx ON public.pos_sales USING btree (tenant_id, cash_session_id, sold_at DESC);

ALTER TABLE public."pos_cash_sessions" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."pos_products" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."pos_sale_lines" ENABLE ROW LEVEL SECURITY;

ALTER TABLE public."pos_sales" ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Scoped cash sessions visible" ON public."pos_cash_sessions" FOR SELECT TO authenticated USING ((can_read_tenant(tenant_id) AND (can_manage_tenant(tenant_id) OR (opened_by = auth.uid()))));

CREATE POLICY "Company administrators add products" ON public."pos_products" FOR INSERT TO authenticated WITH CHECK (can_manage_tenant(tenant_id));

CREATE POLICY "Company administrators update products" ON public."pos_products" FOR UPDATE TO authenticated USING (can_manage_tenant(tenant_id)) WITH CHECK (can_manage_tenant(tenant_id));

CREATE POLICY "Scoped products visible" ON public."pos_products" FOR SELECT TO authenticated USING ((can_read_tenant(tenant_id) AND (can_manage_tenant(tenant_id) OR (EXISTS ( SELECT 1
   FROM (membership_branches mb
     JOIN tenant_memberships m ON (((m.id = mb.membership_id) AND (m.tenant_id = mb.tenant_id))))
  WHERE ((mb.tenant_id = pos_products.tenant_id) AND (mb.branch_id = pos_products.branch_id) AND (m.user_id = auth.uid()) AND m.active))))));

CREATE POLICY "Scoped sale lines visible" ON public."pos_sale_lines" FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM pos_sales s
  WHERE ((s.id = pos_sale_lines.sale_id) AND (s.tenant_id = pos_sale_lines.tenant_id) AND (s.branch_id = pos_sale_lines.branch_id)))));

CREATE POLICY "Scoped sales visible" ON public."pos_sales" FOR SELECT TO authenticated USING ((can_read_tenant(tenant_id) AND (can_manage_tenant(tenant_id) OR (cashier_id = auth.uid()))));

REVOKE ALL ON public.pos_products,public.pos_cash_sessions,public.pos_sales,public.pos_sale_lines FROM anon,authenticated;

GRANT SELECT ON public.pos_products,public.pos_cash_sessions,public.pos_sales,public.pos_sale_lines TO authenticated;

GRANT INSERT (name,tenant_id,branch_id,sku,barcode,unit,price_mzn,stock_qty,active) ON public.pos_products TO authenticated;

GRANT UPDATE (name,sku,barcode,unit,price_mzn,stock_qty,active) ON public.pos_products TO authenticated;

CREATE OR REPLACE FUNCTION public.pos_actor_allowed(p_actor uuid, p_tenant uuid, p_branch uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
 select exists(
  select 1 from public.tenant_memberships m
  join public.tenants t on t.id=m.tenant_id
  join public.plans p on p.id=t.plan_id
  join public.branches b on b.tenant_id=t.id and b.id=p_branch
  where m.tenant_id=p_tenant and m.user_id=p_actor and m.active
  and m.role in ('company_admin','manager','supervisor','cashier')
  and (m.role='company_admin' or exists (
   select 1 from public.membership_branches mb where mb.tenant_id=p_tenant and mb.branch_id=p_branch and mb.membership_id=m.id
  ))
  and b.active and p.enabled and t.status in ('trial','active') and t.license_expires_at>=current_date
  and exists(select 1 from public.plan_modules pm where pm.plan_id=p.id and pm.module_code='pos')
 );
$function$


CREATE OR REPLACE FUNCTION public.pos_open_cash(p_actor uuid, p_tenant uuid, p_branch uuid, p_opening numeric)
 RETURNS uuid
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_id uuid;
begin
 if not public.pos_actor_allowed(p_actor,p_tenant,p_branch) then raise exception 'Sem permissão para abrir caixa nesta filial.'; end if;
 if p_opening is null or p_opening<0 or p_opening>100000000 or round(p_opening,2)<>p_opening then raise exception 'Fundo de caixa inválido.'; end if;
 insert into public.pos_cash_sessions(tenant_id,branch_id,opened_by,opening_float_mzn)
 values(p_tenant,p_branch,p_actor,p_opening) returning id into v_id;
 return v_id;
end $function$


CREATE OR REPLACE FUNCTION public.pos_close_cash(p_actor uuid, p_tenant uuid, p_branch uuid, p_session uuid, p_actual numeric)
 RETURNS numeric
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_cash public.pos_cash_sessions%rowtype;v_expected numeric(14,2);
begin
 if not public.pos_actor_allowed(p_actor,p_tenant,p_branch) then raise exception 'Sem permissão nesta filial.'; end if;
 select * into v_cash from public.pos_cash_sessions where id=p_session and tenant_id=p_tenant and branch_id=p_branch and opened_by=p_actor and closed_at is null for update;
 if not found then raise exception 'Não existe caixa aberto deste operador.'; end if;
 if p_actual is null or p_actual<0 or round(p_actual,2)<>p_actual then raise exception 'Total contado inválido.'; end if;
 select v_cash.opening_float_mzn+coalesce(sum(total_mzn),0) into v_expected from public.pos_sales where cash_session_id=p_session and tenant_id=p_tenant;
 update public.pos_cash_sessions set closed_at=now(),expected_close_mzn=v_expected,actual_close_mzn=p_actual where id=p_session;
 return v_expected;
end $function$


CREATE OR REPLACE FUNCTION public.pos_cash_sale(p_actor uuid, p_tenant uuid, p_branch uuid, p_session uuid, p_request uuid, p_items jsonb, p_received numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SET search_path TO ''
AS $function$
declare v_cash public.pos_cash_sessions%rowtype;v_item jsonb;v_p public.pos_products%rowtype;
 v_product uuid;v_qty numeric(14,3);v_total numeric(14,2):=0;v_line numeric(14,2);
 v_id uuid; v_old public.pos_sales%rowtype;
begin
 if not public.pos_actor_allowed(p_actor,p_tenant,p_branch) then raise exception 'Sem permissão para vender nesta filial.'; end if;
 if p_request is null then raise exception 'É obrigatório um identificador único de venda.'; end if;
 select * into v_old from public.pos_sales where tenant_id=p_tenant and client_request_id=p_request;
 if found then return jsonb_build_object('sale_id',v_old.id,'total_mzn',v_old.total_mzn,'change_mzn',v_old.change_mzn,'duplicate',true); end if;
 select * into v_cash from public.pos_cash_sessions where id=p_session and tenant_id=p_tenant and branch_id=p_branch and opened_by=p_actor and closed_at is null for update;
 if not found then raise exception 'Abra o seu caixa antes de registar uma venda.'; end if;
 if p_items is null or jsonb_typeof(p_items)<>'array' or jsonb_array_length(p_items)<1 or jsonb_array_length(p_items)>60 then raise exception 'Carrinho inválido.'; end if;
 if (select count(*)<>count(distinct item->>'product_id') from jsonb_array_elements(p_items) item) then raise exception 'Não repita o mesmo artigo no carrinho.'; end if;
 for v_item in select value from jsonb_array_elements(p_items) t(value) order by (value->>'product_id') loop
  begin v_product:=(v_item->>'product_id')::uuid;v_qty:=(v_item->>'quantity')::numeric; exception when others then raise exception 'Produto ou quantidade inválidos.'; end;
  if v_qty is null or v_qty<=0 or v_qty>100000 or round(v_qty,3)<>v_qty then raise exception 'Quantidade inválida.'; end if;
  select * into v_p from public.pos_products where id=v_product and tenant_id=p_tenant and branch_id=p_branch and active for update;
  if not found then raise exception 'Produto não encontrado ou inactivo.'; end if;
  if v_p.unit='un' and trunc(v_qty)<>v_qty then raise exception 'Este artigo vende-se por unidade inteira.'; end if;
  if v_p.stock_qty<v_qty then raise exception 'Stock insuficiente para %.',v_p.name; end if;
  v_line:=round(v_p.price_mzn*v_qty,2);v_total:=v_total+v_line;
 end loop;
 if p_received is null or round(p_received,2)<>p_received or p_received<v_total or p_received>100000000 then raise exception 'Valor recebido insuficiente ou inválido.'; end if;
 insert into public.pos_sales(tenant_id,branch_id,cash_session_id,cashier_id,client_request_id,total_mzn,cash_received_mzn,change_mzn)
 values(p_tenant,p_branch,p_session,p_actor,p_request,v_total,p_received,p_received-v_total) returning id into v_id;
 for v_item in select value from jsonb_array_elements(p_items) t(value) order by (value->>'product_id') loop
  v_product:=(v_item->>'product_id')::uuid;v_qty:=(v_item->>'quantity')::numeric;
  select * into v_p from public.pos_products where id=v_product and tenant_id=p_tenant and branch_id=p_branch;
  v_line:=round(v_p.price_mzn*v_qty,2);
  update public.pos_products set stock_qty=stock_qty-v_qty where id=v_product and stock_qty>=v_qty;
  if not found then raise exception 'Stock insuficiente para %.',v_p.name; end if;
  insert into public.pos_sale_lines(tenant_id,branch_id,sale_id,product_id,quantity,unit_price_mzn,line_total_mzn)
  values(p_tenant,p_branch,v_id,v_product,v_qty,v_p.price_mzn,v_line);
 end loop;
 return jsonb_build_object('sale_id',v_id,'total_mzn',v_total,'change_mzn',p_received-v_total,'duplicate',false);
end $function$


REVOKE ALL ON FUNCTION public.pos_actor_allowed(uuid,uuid,uuid) FROM public,anon,authenticated;

GRANT EXECUTE ON FUNCTION public.pos_actor_allowed(uuid,uuid,uuid) TO service_role;

REVOKE ALL ON FUNCTION public.pos_open_cash(uuid,uuid,uuid,numeric) FROM public,anon,authenticated;

GRANT EXECUTE ON FUNCTION public.pos_open_cash(uuid,uuid,uuid,numeric) TO service_role;

REVOKE ALL ON FUNCTION public.pos_close_cash(uuid,uuid,uuid,uuid,numeric) FROM public,anon,authenticated;

GRANT EXECUTE ON FUNCTION public.pos_close_cash(uuid,uuid,uuid,uuid,numeric) TO service_role;

REVOKE ALL ON FUNCTION public.pos_cash_sale(uuid,uuid,uuid,uuid,uuid,jsonb,numeric) FROM public,anon,authenticated;

GRANT EXECUTE ON FUNCTION public.pos_cash_sale(uuid,uuid,uuid,uuid,uuid,jsonb,numeric) TO service_role;
