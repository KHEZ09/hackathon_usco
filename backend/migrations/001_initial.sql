-- ORIVIA / Kevin: modelo PostgreSQL inicial. Datos sintéticos únicamente.
BEGIN;
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE SCHEMA IF NOT EXISTS orivia;
SET search_path = orivia, public;

CREATE TYPE account_status AS ENUM ('ACTIVE','BLOCKED','SUSPENDED');
CREATE TYPE user_role AS ENUM ('OPERATOR','ADMIN','BUYER');
CREATE TYPE product_kind AS ENUM ('CACAO_FRESCO','CACAO_SECO','GRANO_TOSTADO','NIBS','CHOCOLATE','PRODUCTO_TERMINADO');
CREATE TYPE inventory_movement_kind AS ENUM ('RECEIPT','TRANSFORMATION_INPUT','TRANSFORMATION_OUTPUT','SALE','ADJUSTMENT_IN','ADJUSTMENT_OUT');
CREATE TYPE order_status AS ENUM ('CREATED','CONFIRMED','IN_PREPARATION','IN_TRANSIT','DELIVERED','CANCELLED');
CREATE TYPE sync_status AS ENUM ('STARTED','SUCCESS','FAILED');

CREATE TABLE app_user (
  user_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name varchar(120) NOT NULL,
  email varchar(254) NOT NULL,
  password_hash text NOT NULL,
  account_status account_status NOT NULL DEFAULT 'ACTIVE',
  phone varchar(30), municipality varchar(80),
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_user_email CHECK (position('@' in email) > 1)
);
CREATE UNIQUE INDEX uq_app_user_email ON app_user(lower(email));

CREATE TABLE app_user_role (
  user_id uuid NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
  role user_role NOT NULL, PRIMARY KEY(user_id, role)
);

CREATE TABLE customer (
  customer_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(140) NOT NULL, email varchar(254), phone varchar(30),
  document_ref varchar(80), is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX uq_customer_email ON customer(lower(email)) WHERE email IS NOT NULL;

CREATE TABLE supplier (
  supplier_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name varchar(140) NOT NULL, contact_name varchar(120), email varchar(254), phone varchar(30),
  municipality varchar(80) NOT NULL DEFAULT 'Pitalito', department varchar(80) NOT NULL DEFAULT 'Huila',
  is_active boolean NOT NULL DEFAULT true, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE farm (
  farm_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id uuid REFERENCES supplier(supplier_id), name varchar(140) NOT NULL,
  municipality varchar(80) NOT NULL DEFAULT 'Pitalito', department varchar(80) NOT NULL DEFAULT 'Huila',
  latitude numeric(9,6), longitude numeric(9,6), certification text,
  CONSTRAINT ck_farm_coordinates CHECK ((latitude IS NULL AND longitude IS NULL) OR (latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180))
);

CREATE TABLE product (
  product_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), sku varchar(40) NOT NULL UNIQUE,
  name varchar(140) NOT NULL, kind product_kind NOT NULL, unit varchar(12) NOT NULL DEFAULT 'kg',
  sale_price numeric(14,2) NOT NULL DEFAULT 0 CHECK(sale_price >= 0),
  max_cost_per_kg numeric(14,2) CHECK(max_cost_per_kg IS NULL OR max_cost_per_kg >= 0),
  min_stock_kg numeric(14,3) NOT NULL DEFAULT 0 CHECK(min_stock_kg >= 0),
  is_public boolean NOT NULL DEFAULT true, is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE lot (
  lot_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), lot_code varchar(40) NOT NULL UNIQUE,
  farm_id uuid NOT NULL REFERENCES farm(farm_id), product_id uuid NOT NULL REFERENCES product(product_id),
  harvest_date date, received_at timestamptz NOT NULL DEFAULT now(),
  gross_weight_kg numeric(14,3) NOT NULL CHECK(gross_weight_kg > 0),
  net_weight_kg numeric(14,3) NOT NULL CHECK(net_weight_kg > 0 AND net_weight_kg <= gross_weight_kg),
  current_weight_kg numeric(14,3) NOT NULL DEFAULT 0 CHECK(current_weight_kg >= 0),
  quality_status varchar(20) NOT NULL DEFAULT 'PENDING' CHECK(quality_status IN ('PENDING','APPROVED','CONDITIONAL','REJECTED')),
  blocked boolean NOT NULL DEFAULT false, block_reason text, public_notes text,
  created_by uuid REFERENCES app_user(user_id), created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_block_reason CHECK((blocked AND nullif(trim(block_reason),'') IS NOT NULL) OR NOT blocked),
  CONSTRAINT ck_lot_stock CHECK(current_weight_kg <= net_weight_kg)
);

CREATE TABLE inventory_movement (
  movement_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), lot_id uuid NOT NULL REFERENCES lot(lot_id),
  movement_type inventory_movement_kind NOT NULL, quantity_kg numeric(14,3) NOT NULL CHECK(quantity_kg > 0),
  unit_cost numeric(14,4) NOT NULL DEFAULT 0 CHECK(unit_cost >= 0), reference_type varchar(40), reference_id uuid,
  occurred_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES app_user(user_id), notes text
);

CREATE TABLE lot_cost (
  lot_id uuid PRIMARY KEY REFERENCES lot(lot_id) ON DELETE CASCADE,
  total_cost numeric(14,2) NOT NULL DEFAULT 0 CHECK(total_cost >= 0),
  cost_per_kg numeric(14,4) NOT NULL DEFAULT 0 CHECK(cost_per_kg >= 0), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE transformation (
  transformation_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), operation_code varchar(40) NOT NULL UNIQUE,
  operation_type varchar(60) NOT NULL, input_kg numeric(14,3) NOT NULL CHECK(input_kg >= 0),
  output_kg numeric(14,3) NOT NULL CHECK(output_kg >= 0), max_merma_pct numeric(7,3) NOT NULL DEFAULT 15 CHECK(max_merma_pct BETWEEN 0 AND 100),
  status varchar(20) NOT NULL DEFAULT 'DRAFT', started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz,
  CONSTRAINT ck_transformation_mass CHECK(output_kg <= input_kg)
);

CREATE TABLE sales_order (
  order_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_code varchar(40) NOT NULL UNIQUE,
  customer_id uuid REFERENCES customer(customer_id), buyer_name varchar(140) NOT NULL, buyer_email varchar(254) NOT NULL,
  status order_status NOT NULL DEFAULT 'CREATED', total_amount numeric(14,2) NOT NULL DEFAULT 0 CHECK(total_amount >= 0),
  ordered_at timestamptz NOT NULL DEFAULT now(), created_by uuid REFERENCES app_user(user_id)
);
CREATE TABLE sales_order_item (
  order_item_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES sales_order(order_id) ON DELETE CASCADE,
  lot_id uuid NOT NULL REFERENCES lot(lot_id), quantity_kg numeric(14,3) NOT NULL CHECK(quantity_kg > 0),
  unit_price numeric(14,2) NOT NULL CHECK(unit_price >= 0), UNIQUE(order_id, lot_id)
);
CREATE TABLE order_event (
  event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL REFERENCES sales_order(order_id) ON DELETE CASCADE,
  event_type varchar(40) NOT NULL, previous_status text, new_status text, actor_id uuid REFERENCES app_user(user_id),
  occurred_at timestamptz NOT NULL DEFAULT now(), payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  payload_hash char(71) NOT NULL, previous_hash char(71), UNIQUE(order_id,payload_hash)
);
CREATE TABLE audit_log (
  audit_id bigserial PRIMARY KEY, table_name text NOT NULL, record_id text NOT NULL,
  action varchar(10) NOT NULL CHECK(action IN ('INSERT','UPDATE','DELETE')),
  actor_id uuid REFERENCES app_user(user_id), changed_at timestamptz NOT NULL DEFAULT now(),
  old_data jsonb, new_data jsonb, request_id varchar(120)
);
CREATE INDEX idx_audit_record_time ON audit_log(table_name,record_id,changed_at DESC);
CREATE TABLE blockchain_anchor (
  anchor_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), event_id uuid NOT NULL UNIQUE REFERENCES order_event(event_id),
  network varchar(40) NOT NULL DEFAULT 'pending', status varchar(20) NOT NULL DEFAULT 'PENDING_ANCHOR'
    CHECK(status IN ('PENDING_ANCHOR','ANCHORED','FAILED')),
  transaction_id varchar(160), event_hash char(71) NOT NULL, attempts smallint NOT NULL DEFAULT 0 CHECK(attempts >= 0),
  last_error text, created_at timestamptz NOT NULL DEFAULT now(), anchored_at timestamptz
);

CREATE TABLE refresh_token (
  refresh_token_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL REFERENCES app_user(user_id) ON DELETE CASCADE,
  token_hash char(64) NOT NULL UNIQUE, issued_at timestamptz NOT NULL DEFAULT now(), expires_at timestamptz NOT NULL, revoked_at timestamptz,
  CONSTRAINT ck_refresh_expiry CHECK(expires_at > issued_at)
);
CREATE TABLE integration_sync_log (
  sync_id uuid PRIMARY KEY DEFAULT gen_random_uuid(), provider varchar(80) NOT NULL, idempotency_key varchar(120) NOT NULL,
  status sync_status NOT NULL, response_summary jsonb, attempts smallint NOT NULL DEFAULT 0 CHECK(attempts >= 0),
  error_message text, started_at timestamptz NOT NULL DEFAULT now(), finished_at timestamptz, UNIQUE(provider,idempotency_key)
);

CREATE INDEX idx_lot_product_stock ON lot(product_id) WHERE NOT blocked;
CREATE INDEX idx_lot_farm_date ON lot(farm_id, harvest_date);
CREATE INDEX idx_inventory_lot_date ON inventory_movement(lot_id, occurred_at DESC);
CREATE INDEX idx_order_status_date ON sales_order(status, ordered_at DESC);
CREATE INDEX idx_order_event_timeline ON order_event(order_id, occurred_at);
CREATE INDEX idx_sync_provider_status ON integration_sync_log(provider, status, started_at DESC);

CREATE OR REPLACE FUNCTION touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END $$;
CREATE TRIGGER app_user_touch BEFORE UPDATE ON app_user FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

CREATE OR REPLACE FUNCTION apply_inventory_movement() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE delta numeric; available numeric;
BEGIN
  delta := CASE WHEN NEW.movement_type IN ('RECEIPT','TRANSFORMATION_OUTPUT','ADJUSTMENT_IN') THEN NEW.quantity_kg ELSE -NEW.quantity_kg END;
  SELECT current_weight_kg INTO available FROM lot WHERE lot_id=NEW.lot_id FOR UPDATE;
  IF available IS NULL OR (delta < 0 AND available + delta < 0) THEN RAISE EXCEPTION 'Inventario insuficiente o lote inexistente'; END IF;
  UPDATE lot SET current_weight_kg=current_weight_kg+delta WHERE lot_id=NEW.lot_id;
  RETURN NEW;
END $$;
CREATE TRIGGER inventory_movement_apply AFTER INSERT ON inventory_movement FOR EACH ROW EXECUTE FUNCTION apply_inventory_movement();

CREATE VIEW v_inventory AS
SELECT p.product_id,p.sku,p.name,p.kind,p.min_stock_kg,coalesce(sum(l.current_weight_kg) FILTER(WHERE NOT l.blocked),0)::numeric(14,3) available_kg,
       count(l.lot_id) FILTER(WHERE NOT l.blocked) lot_count,
       coalesce(sum(l.current_weight_kg) FILTER(WHERE NOT l.blocked),0) < p.min_stock_kg low_stock
FROM product p LEFT JOIN lot l USING(product_id) GROUP BY p.product_id,p.sku,p.name,p.kind,p.min_stock_kg;
CREATE VIEW v_public_traceability AS
SELECT l.lot_code,p.sku,p.name product_name,f.name farm_name,s.name supplier_name,f.municipality,l.harvest_date,l.received_at,l.quality_status,l.current_weight_kg,l.public_notes
FROM lot l JOIN product p USING(product_id) JOIN farm f USING(farm_id) LEFT JOIN supplier s USING(supplier_id)
WHERE p.is_public AND p.is_active AND NOT l.blocked;

COMMIT;
