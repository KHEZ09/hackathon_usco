-- ORIVIA / Sebas: generic anchor metadata for a real EVM registry.
-- Existing local anchors remain readable and can be upgraded without data loss.
BEGIN;
SET search_path = orivia, public;

ALTER TABLE blockchain_anchor
  ALTER COLUMN event_id DROP NOT NULL;

ALTER TABLE blockchain_anchor
  ADD COLUMN IF NOT EXISTS entity_type varchar(40) NOT NULL DEFAULT 'order',
  ADD COLUMN IF NOT EXISTS entity_id varchar(180),
  ADD COLUMN IF NOT EXISTS block_number bigint,
  ADD COLUMN IF NOT EXISTS chain_id bigint,
  ADD COLUMN IF NOT EXISTS contract_address varchar(42);

CREATE UNIQUE INDEX IF NOT EXISTS uq_blockchain_anchor_event_hash
  ON blockchain_anchor(event_hash);

CREATE INDEX IF NOT EXISTS idx_blockchain_anchor_entity
  ON blockchain_anchor(entity_type, entity_id, created_at DESC);

COMMIT;
