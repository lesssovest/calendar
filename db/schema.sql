CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publish_date DATE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  customer TEXT NOT NULL,
  audience TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published')),
  important BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS publications_publish_date_idx ON publications (publish_date);

CREATE UNIQUE INDEX IF NOT EXISTS publications_date_audience_unique_idx
  ON publications (publish_date, lower(btrim(audience)))
  WHERE audience IS NOT NULL AND btrim(audience) <> '';

CREATE OR REPLACE FUNCTION set_publications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS publications_set_updated_at ON publications;
CREATE TRIGGER publications_set_updated_at
BEFORE UPDATE ON publications
FOR EACH ROW EXECUTE FUNCTION set_publications_updated_at();
