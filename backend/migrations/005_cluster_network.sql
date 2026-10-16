-- ORIVIA / Kevin: contrato persistente de la red digital cacaotera.
BEGIN;
SET search_path = orivia, public;

CREATE TYPE actor_type AS ENUM (
  'PRODUCER','ASSOCIATION','TRANSFORMER','BUYER','AGROENTREPRENEUR',
  'TRANSPORTER','SERVICE_PROVIDER','INSTITUTION'
);
CREATE TYPE actor_status AS ENUM ('ACTIVE','PENDING','SUSPENDED','BLOCKED','INACTIVE');
CREATE TYPE cluster_visibility AS ENUM ('PUBLIC','SHARED','PRIVATE');
CREATE TYPE need_category AS ENUM (
  'RAW_MATERIAL','INPUTS','TECHNICAL_ASSISTANCE','FINANCING','LOGISTICS',
  'MARKET','PROCESSING_CAPACITY','OTHER'
);
CREATE TYPE need_status AS ENUM ('OPEN','MATCHED','PAUSED','CLOSED','CANCELLED');
CREATE TYPE offer_category AS ENUM (
  'CACAO','TRANSFORMATION','INPUTS','LOGISTICS','TECHNICAL_ASSISTANCE',
  'FINANCING','OTHER'
);
CREATE TYPE offer_status AS ENUM ('DRAFT','PUBLISHED','PAUSED','CLOSED');
CREATE TYPE connection_type AS ENUM ('NEED_MATCH','OFFER_MATCH','DIRECT');
CREATE TYPE connection_status AS ENUM (
  'REQUESTED','ACCEPTED','REJECTED','BLOCKED','CANCELLED'
);
CREATE TYPE trust_signal_type AS ENUM (
  'PROFILE_COMPLETENESS','LOT_TRACEABILITY','COUNTERPARTY_CONFIRMATION',
  'QUANTITY_CONSISTENCY','INCIDENT_RESOLUTION','DOCUMENT_VERIFIED'
);
CREATE TYPE trust_signal_status AS ENUM (
  'PENDING','CONFIRMED','DISPUTED','EXPIRED','REVOKED'
);
CREATE TYPE trust_signal_source AS ENUM (
  'SYSTEM','ACTOR_CONFIRMATION','DOCUMENT','AUDIT'
);

CREATE TABLE actors (
  actor_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_type actor_type NOT NULL,
  status actor_status NOT NULL DEFAULT 'PENDING',
  visibility cluster_visibility NOT NULL DEFAULT 'PUBLIC',
  slug varchar(100) NOT NULL UNIQUE,
  display_name varchar(160) NOT NULL,
  description text,
  municipality varchar(80),
  department varchar(80) NOT NULL DEFAULT 'Huila',
  public_contact varchar(160),
  owner_user_id uuid REFERENCES app_user(user_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_actor_slug CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  CONSTRAINT ck_actor_name CHECK (length(trim(display_name)) >= 2)
);

CREATE TABLE actor_needs (
  need_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES actors(actor_id) ON DELETE CASCADE,
  category need_category NOT NULL,
  status need_status NOT NULL DEFAULT 'OPEN',
  visibility cluster_visibility NOT NULL DEFAULT 'PUBLIC',
  title varchar(160) NOT NULL,
  description text,
  quantity numeric(14,3) CHECK (quantity IS NULL OR quantity > 0),
  unit varchar(20),
  municipality varchar(80),
  department varchar(80) NOT NULL DEFAULT 'Huila',
  due_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_need_title CHECK (length(trim(title)) >= 3)
);

CREATE TABLE actor_offers (
  offer_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES actors(actor_id) ON DELETE CASCADE,
  category offer_category NOT NULL,
  status offer_status NOT NULL DEFAULT 'DRAFT',
  visibility cluster_visibility NOT NULL DEFAULT 'PUBLIC',
  title varchar(160) NOT NULL,
  description text,
  quantity numeric(14,3) CHECK (quantity IS NULL OR quantity > 0),
  unit varchar(20),
  municipality varchar(80),
  department varchar(80) NOT NULL DEFAULT 'Huila',
  available_from date,
  available_until date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_offer_title CHECK (length(trim(title)) >= 3),
  CONSTRAINT ck_offer_availability CHECK (
    available_until IS NULL OR available_from IS NULL OR available_until >= available_from
  )
);

CREATE TABLE actor_connections (
  connection_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_actor_id uuid NOT NULL REFERENCES actors(actor_id),
  target_actor_id uuid NOT NULL REFERENCES actors(actor_id),
  connection_type connection_type NOT NULL,
  status connection_status NOT NULL DEFAULT 'REQUESTED',
  visibility cluster_visibility NOT NULL DEFAULT 'SHARED',
  need_id uuid REFERENCES actor_needs(need_id),
  offer_id uuid REFERENCES actor_offers(offer_id),
  message text,
  requested_by uuid REFERENCES app_user(user_id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ck_connection_not_self CHECK (requester_actor_id <> target_actor_id),
  CONSTRAINT ck_connection_context CHECK (
    (connection_type = 'NEED_MATCH' AND need_id IS NOT NULL) OR
    (connection_type = 'OFFER_MATCH' AND offer_id IS NOT NULL) OR
    (connection_type = 'DIRECT' AND need_id IS NULL AND offer_id IS NULL)
  )
);

CREATE TABLE trust_signals (
  trust_signal_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid NOT NULL REFERENCES actors(actor_id) ON DELETE CASCADE,
  connection_id uuid REFERENCES actor_connections(connection_id),
  signal_type trust_signal_type NOT NULL,
  status trust_signal_status NOT NULL DEFAULT 'PENDING',
  source trust_signal_source NOT NULL DEFAULT 'SYSTEM',
  visibility cluster_visibility NOT NULL DEFAULT 'SHARED',
  score numeric(5,2) CHECK (score IS NULL OR score BETWEEN 0 AND 100),
  explanation varchar(500) NOT NULL,
  evidence_ref varchar(180),
  issued_by uuid REFERENCES app_user(user_id),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  CONSTRAINT ck_trust_explanation CHECK (length(trim(explanation)) >= 5),
  CONSTRAINT ck_trust_expiry CHECK (expires_at IS NULL OR expires_at >= occurred_at)
);

CREATE UNIQUE INDEX uq_actor_connection_context ON actor_connections (
  requester_actor_id, target_actor_id, connection_type,
  coalesce(need_id, '00000000-0000-0000-0000-000000000000'::uuid),
  coalesce(offer_id, '00000000-0000-0000-0000-000000000000'::uuid)
);
CREATE UNIQUE INDEX uq_actor_need_title ON actor_needs(actor_id, title);
CREATE UNIQUE INDEX uq_actor_offer_title ON actor_offers(actor_id, title);
CREATE UNIQUE INDEX uq_trust_signal_evidence_ref ON trust_signals(evidence_ref)
  WHERE evidence_ref IS NOT NULL;
CREATE INDEX idx_actor_public ON actors(status, visibility, actor_type, municipality);
CREATE INDEX idx_need_public ON actor_needs(status, visibility, category, municipality);
CREATE INDEX idx_offer_public ON actor_offers(status, visibility, category, municipality);
CREATE INDEX idx_connection_target_status ON actor_connections(target_actor_id, status);
CREATE INDEX idx_trust_actor_status ON trust_signals(actor_id, status, occurred_at DESC);

CREATE TRIGGER actors_touch BEFORE UPDATE ON actors
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER actor_needs_touch BEFORE UPDATE ON actor_needs
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER actor_offers_touch BEFORE UPDATE ON actor_offers
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
CREATE TRIGGER actor_connections_touch BEFORE UPDATE ON actor_connections
FOR EACH ROW EXECUTE FUNCTION touch_updated_at();

COMMIT;
