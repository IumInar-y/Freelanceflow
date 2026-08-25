-- Flag a payment-failure timestamp on UserPlan so the subscription-events
-- drain from the Polsia payment-events feed can record the most recent
-- failed charge without losing the cancellation audit trail.
ALTER TABLE "UserPlan" ADD COLUMN "paymentFailedAt" TIMESTAMP(3) NULL;
