BEGIN;
SET search_path = orivia, public;
INSERT INTO app_user(full_name,email,password_hash,account_status) VALUES
 ('Operador Demo','operador@orivia.test','CHANGE_ME_BCRYPT_HASH','ACTIVE'),
 ('Administradora Demo','admin@orivia.test','CHANGE_ME_BCRYPT_HASH','ACTIVE'),
 ('Comprador Demo','comprador@orivia.test','CHANGE_ME_BCRYPT_HASH','ACTIVE')
ON CONFLICT DO NOTHING;
INSERT INTO app_user_role(user_id,role) SELECT user_id,'OPERATOR' FROM app_user WHERE email='operador@orivia.test' ON CONFLICT DO NOTHING;
INSERT INTO app_user_role(user_id,role) SELECT user_id,'ADMIN' FROM app_user WHERE email='admin@orivia.test' ON CONFLICT DO NOTHING;
INSERT INTO app_user_role(user_id,role) SELECT user_id,'BUYER' FROM app_user WHERE email='comprador@orivia.test' ON CONFLICT DO NOTHING;
INSERT INTO supplier(name,contact_name,municipality) VALUES('Asociación Cacaotera Sintética','Contacto Demo','Pitalito') ON CONFLICT DO NOTHING;
INSERT INTO product(sku,name,kind,sale_price,max_cost_per_kg,min_stock_kg) VALUES
 ('CAC-SEC-001','Cacao seco premium','CACAO_SECO',18000,14000,100),('CHO-70-001','Chocolate 70% Huila','PRODUCTO_TERMINADO',42000,30000,30)
ON CONFLICT(sku) DO NOTHING;
COMMIT;
