-- CreateTable for UpsellEvent analytics
CREATE TABLE "UpsellEvent" (
    "id"        TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "source"    TEXT,
    "email"     TEXT,
    "userId"    TEXT,
    "plan"      TEXT,
    "amountUsd" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UpsellEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "UpsellEvent_eventType_idx" ON "UpsellEvent"("eventType");
CREATE INDEX "UpsellEvent_createdAt_idx" ON "UpsellEvent"("createdAt");
