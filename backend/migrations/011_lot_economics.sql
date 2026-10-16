-- ORIVIA: RF05/RF12 costos y precio de venta por lote trazable (costo unitario y margen se calculan en la API).
BEGIN;
SET search_path = orivia, public;

CREATE TABLE IF NOT EXISTS trace_lot_economics (
  lot_id varchar(80) PRIMARY KEY REFERENCES trace_lot(lot_id),
  total_cost_cop numeric(16,2) NOT NULL CHECK (total_cost_cop >= 0),
  sale_price_cop_kg numeric(16,2) NOT NULL CHECK (sale_price_cop_kg >= 0),
  included_costs varchar(300) NOT NULL DEFAULT '',
  updated_by varchar(180) NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Ejemplo base del reto para CAC001: $1.600.000 COP de costo total y $25.000 COP/kg de precio.
INSERT INTO trace_lot_economics (lot_id, total_cost_cop, sale_price_cop_kg, included_costs, updated_by)
SELECT 'CAC001', 1600000, 25000, 'Mano de obra, energía y empaque de la etapa de transformación', 'system-seed'
WHERE EXISTS (SELECT 1 FROM trace_lot WHERE lot_id = 'CAC001')
ON CONFLICT (lot_id) DO NOTHING;

COMMIT;
