-- A day may contain multiple publications, but the same non-empty audience
-- must not be scheduled twice on the same day.
CREATE UNIQUE INDEX publications_date_audience_unique_idx
  ON public.publications (publish_date, lower(btrim(audience)))
  WHERE audience IS NOT NULL AND btrim(audience) <> '';
