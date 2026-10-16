-- ORIVIA / Kevin: actores sintéticos del clúster cacaotero del Huila.
BEGIN;
SET search_path = orivia, public;

INSERT INTO actors (
  actor_type, status, visibility, slug, display_name, description,
  municipality, department, public_contact, owner_user_id
)
SELECT * FROM (
  VALUES
    ('PRODUCER'::actor_type, 'ACTIVE'::actor_status, 'PUBLIC'::cluster_visibility,
     'finca-la-montana', 'Finca La Montaña',
     'Productor sintético de cacao seco premium.', 'Pitalito', 'Huila',
     'contacto-demo@orivia.test', (SELECT user_id FROM app_user WHERE email='operador@orivia.test')),
    ('ASSOCIATION'::actor_type, 'ACTIVE'::actor_status, 'PUBLIC'::cluster_visibility,
     'asociacion-huila-unido', 'Asociación Huila Unido',
     'Asociación sintética para consolidación y asistencia cacaotera.', 'Garzón', 'Huila',
     'red-demo@orivia.test', (SELECT user_id FROM app_user WHERE email='admin@orivia.test')),
    ('TRANSFORMER'::actor_type, 'ACTIVE'::actor_status, 'PUBLIC'::cluster_visibility,
     'chocolates-del-sur', 'Chocolates del Sur',
     'Transformador sintético de cacao y chocolate terminado.', 'Neiva', 'Huila',
     'compras-demo@orivia.test', (SELECT user_id FROM app_user WHERE email='admin@orivia.test')),
    ('BUYER'::actor_type, 'ACTIVE'::actor_status, 'PUBLIC'::cluster_visibility,
     'compras-andinas', 'Compras Sostenibles Andinas',
     'Comprador sintético interesado en cacao trazable.', 'Bogotá', 'Cundinamarca',
     'buyer-demo@orivia.test', (SELECT user_id FROM app_user WHERE email='comprador@orivia.test'))
) AS seed(actor_type, status, visibility, slug, display_name, description,
          municipality, department, public_contact, owner_user_id)
ON CONFLICT (slug) DO UPDATE SET
  status=EXCLUDED.status, visibility=EXCLUDED.visibility,
  display_name=EXCLUDED.display_name, description=EXCLUDED.description,
  municipality=EXCLUDED.municipality, department=EXCLUDED.department,
  public_contact=EXCLUDED.public_contact, owner_user_id=EXCLUDED.owner_user_id;

INSERT INTO actor_needs (
  actor_id, category, status, visibility, title, description, quantity, unit,
  municipality, department, due_date
)
SELECT actor_id, 'RAW_MATERIAL', 'OPEN', 'PUBLIC',
       'Cacao seco para transformación',
       'Necesidad sintética de cacao seco con trazabilidad de origen.',
       250, 'kg', 'Neiva', 'Huila', current_date + 30
FROM actors WHERE slug='chocolates-del-sur'
ON CONFLICT DO NOTHING;

INSERT INTO actor_needs (
  actor_id, category, status, visibility, title, description, quantity, unit,
  municipality, department, due_date
)
SELECT actor_id, 'TECHNICAL_ASSISTANCE', 'OPEN', 'PUBLIC',
       'Asistencia para mejorar fermentación',
       'Solicitud sintética de acompañamiento técnico para productores.',
       1, 'servicio', 'Garzón', 'Huila', current_date + 45
FROM actors WHERE slug='asociacion-huila-unido'
ON CONFLICT DO NOTHING;

INSERT INTO actor_offers (
  actor_id, category, status, visibility, title, description, quantity, unit,
  municipality, department, available_from, available_until
)
SELECT actor_id, 'CACAO', 'PUBLISHED', 'PUBLIC',
       'Cacao seco premium trazable',
       'Oferta sintética asociada al lote público de demostración.',
       100, 'kg', 'Pitalito', 'Huila', current_date, current_date + 60
FROM actors WHERE slug='finca-la-montana'
ON CONFLICT DO NOTHING;

INSERT INTO actor_offers (
  actor_id, category, status, visibility, title, description, quantity, unit,
  municipality, department, available_from, available_until
)
SELECT actor_id, 'TRANSFORMATION', 'PUBLISHED', 'PUBLIC',
       'Transformación a chocolate terminado',
       'Capacidad sintética de transformación por lotes pequeños.',
       80, 'kg', 'Neiva', 'Huila', current_date, current_date + 90
FROM actors WHERE slug='chocolates-del-sur'
ON CONFLICT DO NOTHING;

INSERT INTO actor_connections (
  requester_actor_id, target_actor_id, connection_type, status, visibility,
  message, requested_by
)
SELECT buyer.actor_id, producer.actor_id, 'DIRECT', 'ACCEPTED', 'SHARED',
       'Conexión sintética para revisar oferta y trazabilidad.',
       (SELECT user_id FROM app_user WHERE email='comprador@orivia.test')
FROM actors buyer, actors producer
WHERE buyer.slug='compras-andinas' AND producer.slug='finca-la-montana'
ON CONFLICT DO NOTHING;

INSERT INTO trust_signals (
  actor_id, signal_type, status, source, visibility, score, explanation,
  evidence_ref, issued_by
)
SELECT actor_id, 'PROFILE_COMPLETENESS', 'CONFIRMED', 'SYSTEM', 'PUBLIC', 92,
       'El perfil sintético contiene tipo, ubicación, descripción y contacto público.',
       'demo:profile-completeness:finca-la-montana',
       (SELECT user_id FROM app_user WHERE email='admin@orivia.test')
FROM actors WHERE slug='finca-la-montana'
ON CONFLICT DO NOTHING;

INSERT INTO trust_signals (
  actor_id, signal_type, status, source, visibility, score, explanation,
  evidence_ref, issued_by
)
SELECT actor_id, 'LOT_TRACEABILITY', 'CONFIRMED', 'AUDIT', 'PUBLIC', 88,
       'El actor está relacionado con un lote sintético cuya recepción y origen pueden verificarse.',
       'demo:traceability:HUI-2026-0001',
       (SELECT user_id FROM app_user WHERE email='admin@orivia.test')
FROM actors WHERE slug='finca-la-montana'
ON CONFLICT DO NOTHING;

COMMIT;
