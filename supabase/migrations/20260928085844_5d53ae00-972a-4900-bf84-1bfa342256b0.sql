CREATE TYPE public.publication_status AS ENUM ('draft', 'scheduled', 'published');

CREATE TABLE public.publications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  publish_date DATE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  customer TEXT NOT NULL,
  audience TEXT,
  status public.publication_status NOT NULL DEFAULT 'draft',
  important BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX publications_publish_date_idx ON public.publications (publish_date);

GRANT SELECT ON public.publications TO anon;
GRANT SELECT ON public.publications TO authenticated;
GRANT ALL ON public.publications TO service_role;

ALTER TABLE public.publications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view publications" ON public.publications FOR SELECT USING (true);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER publications_set_updated_at BEFORE UPDATE ON public.publications
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();