BEGIN;
SET search_path = orivia, public;

INSERT INTO farm(supplier_id,name,municipality,department,certification)
SELECT s.supplier_id,'Finca La Montaña','Pitalito','Huila','Buenas prácticas'
FROM supplier s WHERE s.name='Asociación Cacaotera Sintética'
  AND NOT EXISTS (SELECT 1 FROM farm f WHERE f.name='Finca La Montaña');

INSERT INTO customer(name,email,phone,document_ref)
SELECT 'Comprador Sintético','cliente@orivia.test','3000000000','SYNTH-001'
WHERE NOT EXISTS (SELECT 1 FROM customer WHERE email='cliente@orivia.test');

INSERT INTO lot(lot_code,farm_id,product_id,harvest_date,gross_weight_kg,net_weight_kg,current_weight_kg,quality_status,public_notes,created_by)
SELECT 'HUI-2026-0001',f.farm_id,p.product_id,'2026-09-20',110,100,0,'APPROVED','Lote sintético para demostración',u.user_id
FROM farm f JOIN product p ON p.sku='CAC-SEC-001' CROSS JOIN app_user u
WHERE f.name='Finca La Montaña' AND u.email='operador@orivia.test'
  AND NOT EXISTS (SELECT 1 FROM lot WHERE lot_code='HUI-2026-0001');

INSERT INTO inventory_movement(lot_id,movement_type,quantity_kg,unit_cost,reference_type,reference_id,created_by,notes)
SELECT l.lot_id,'RECEIPT',100,12000,'SEED',l.lot_id,u.user_id,'Recepción sintética inicial'
FROM lot l CROSS JOIN app_user u
WHERE l.lot_code='HUI-2026-0001' AND u.email='operador@orivia.test'
  AND NOT EXISTS (SELECT 1 FROM inventory_movement m WHERE m.reference_type='SEED' AND m.reference_id=l.lot_id);

INSERT INTO lot_cost(lot_id,total_cost,cost_per_kg)
SELECT l.lot_id,1200000,12000 FROM lot l WHERE l.lot_code='HUI-2026-0001'
ON CONFLICT(lot_id) DO UPDATE SET total_cost=EXCLUDED.total_cost,cost_per_kg=EXCLUDED.cost_per_kg,updated_at=now();

COMMIT;
