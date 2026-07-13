DROP VIEW IF EXISTS public.inventory_reservation_reconciliation;
DROP FUNCTION IF EXISTS public.release_payment_reservation(UUID, TEXT);
DROP FUNCTION IF EXISTS public.recover_payment_reservation(UUID, INTEGER);
DROP INDEX IF EXISTS public.idx_payments_reservation_expires_at;
