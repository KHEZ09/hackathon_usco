-- ORIVIA / Sebas: RF01 recepción y RF02 transformación sobre la cadena trazable.
BEGIN;
SET search_path = orivia, public;

ALTER TABLE trace_lot_event
  ADD COLUMN IF NOT EXISTS operation_code varchar(80);

CREATE UNIQUE INDEX IF NOT EXISTS uq_trace_lot_event_operation_code
  ON trace_lot_event(operation_code)
  WHERE operation_code IS NOT NULL;

COMMIT;
