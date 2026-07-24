DROP POLICY IF EXISTS "Product images are publicly accessible" ON storage.objects;

-- Allow public access only by direct object key (no listing). Restrict to single-object reads is implicit:
-- the public render endpoint of public buckets does not require a SELECT policy on storage.objects.
-- We intentionally do NOT recreate a permissive SELECT policy to prevent bucket enumeration.