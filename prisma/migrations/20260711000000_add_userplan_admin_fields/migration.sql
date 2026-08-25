-- Add admin-grant fields to UserPlan so admins can bypass Stripe and write
-- directly to the plan row (source='admin_grant', verifiedAt=now, optional
-- expiresAt). 'source' stays nullable so existing Stripe-path rows still parse.
ALTER TABLE "UserPlan" ADD COLUMN "source"    TEXT;
ALTER TABLE "UserPlan" ADD COLUMN "verifiedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "UserPlan" ADD COLUMN "expiresAt"  TIMESTAMP(3);
