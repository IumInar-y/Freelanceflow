-- Track whether an upgraded Pro user has completed (or dismissed) the
-- one-time feature discovery tour, so it never fires again after dismissal.
ALTER TABLE "UserPlan" ADD COLUMN "hasSeenProTour" BOOLEAN NOT NULL DEFAULT FALSE;
