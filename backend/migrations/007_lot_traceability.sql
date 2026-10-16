-- ORIVIA / Sebas: persistencia del historial hash-encadenado de lotes.
BEGIN;
SET search_path = orivia, public;

CREATE TABLE trace_lot (
  lot_id varchar(80) PRIMARY KEY,
  product varchar(180) NOT NULL,
  origin varchar(180) NOT NULL,
  producer varchar(180) NOT NULL,
  received_kg numeric(14,3) NOT NULL CHECK (received_kg > 0),
  available_kg numeric(14,3) NOT NULL CHECK (available_kg >= 0),
  affected_kg numeric(14,3) NOT NULL DEFAULT 0 CHECK (affected_kg >= 0),
  available_before_block_kg numeric(14,3),
  status varchar(16) NOT NULL CHECK (status IN ('PENDING','LIBERATED','BLOCKED')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE trace_lot_event (
  event_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id varchar(80) NOT NULL REFERENCES trace_lot(lot_id),
  event_type varchar(40) NOT NULL,
  actor_id varchar(180) NOT NULL,
  previous_status varchar(16),
  new_status varchar(16) NOT NULL,
  occurred_at timestamptz NOT NULL,
  payload jsonb NOT NULL,
  payload_hash varchar(80) NOT NULL,
  previous_event_hash varchar(80),
  event_hash varchar(80) NOT NULL UNIQUE
);

CREATE TABLE trace_lot_audit (
  audit_id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id varchar(80) NOT NULL REFERENCES trace_lot(lot_id),
  actor_id varchar(180) NOT NULL,
  action varchar(80) NOT NULL,
  entity_type varchar(40) NOT NULL,
  changes jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_trace_lot_event_timeline
  ON trace_lot_event(lot_id, occurred_at, event_id);
CREATE INDEX idx_trace_lot_audit_timeline
  ON trace_lot_audit(lot_id, created_at, audit_id);

INSERT INTO trace_lot (
  lot_id, product, origin, producer, received_kg, available_kg, status
)
VALUES
  ('CAC001', 'Cacao fermentado premium', 'Pitalito, Huila', 'Finca El Porvenir', 100, 80, 'LIBERATED'),
  ('CAC002', 'Cacao seco estándar', 'Garzón, Huila', 'Asociación Cacao Huila', 60, 60, 'LIBERATED'),
  ('CAC003', 'Cacao en revisión', 'Acevedo, Huila', 'Productor comunitario', 40, 40, 'PENDING')
ON CONFLICT (lot_id) DO NOTHING;

COMMIT;
