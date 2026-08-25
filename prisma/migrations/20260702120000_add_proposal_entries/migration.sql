-- Add missing columns to EmailCapture (schema declared them, migration omitted them)
ALTER TABLE "EmailCapture" ADD COLUMN IF NOT EXISTS "email2SentAt" TIMESTAMP(3);
ALTER TABLE "EmailCapture" ADD COLUMN IF NOT EXISTS "email3SentAt" TIMESTAMP(3);

-- New table for proposal tracking
CREATE TABLE "ProposalEntry" (
    "id"        TEXT NOT NULL,
    "email"     TEXT NOT NULL,
    "client"    TEXT NOT NULL,
    "platform"  TEXT NOT NULL,
    "dateSent"  TEXT NOT NULL,
    "status"    TEXT NOT NULL,
    "value"     DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProposalEntry_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "ProposalEntry_email_idx" ON "ProposalEntry"("email");
