-- Kevin: keep persisted roles aligned with the server-owned permission map.
BEGIN;
SET search_path = orivia, public;

ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'ACCOUNTING';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'VIEWER';

COMMIT;
