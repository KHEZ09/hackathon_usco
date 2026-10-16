-- ORIVIA / Sebas: persistencia compatible con el contrato de pedidos y trazabilidad.
-- No reemplaza las tablas de Kevin; agrega únicamente los campos necesarios para
-- conservar el payload público y verificar el hash completo de cada evento.
BEGIN;
SET search_path = orivia, public;

ALTER TABLE sales_order
  ADD COLUMN IF NOT EXISTS order_payload jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE order_event
  ADD COLUMN IF NOT EXISTS event_hash char(71);

CREATE INDEX IF NOT EXISTS idx_order_event_hash ON order_event(event_hash);
CREATE INDEX IF NOT EXISTS idx_blockchain_anchor_hash ON blockchain_anchor(event_hash);

COMMIT;
