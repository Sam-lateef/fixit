-- Add an optional short bio / "about" text for shops. Max 500 chars is
-- enforced at the API layer (kept as TEXT in the DB so we can extend later
-- without a schema migration).
ALTER TABLE "Shop" ADD COLUMN "bio" TEXT;
