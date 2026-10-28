-- ==============================================================================
-- Migration: 20261028000004_resource_marketplace.sql
-- Description: Add resource_type, full-text search indexes, and Supabase Storage bucket
-- Platform: Supabase PostgreSQL (TechCircuit Hackathon)
-- ==============================================================================

-- 1. ADD RESOURCE_TYPE TO RESOURCES
DO $$ BEGIN
  ALTER TABLE public.resources
    ADD COLUMN IF NOT EXISTS resource_type TEXT NOT NULL DEFAULT 'equipment'
    CHECK (resource_type IN ('equipment', 'laboratory', 'workspace', 'meeting_room', 'classroom', 'other'));
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_resources_resource_type ON public.resources(resource_type);

-- 2. DISCOVERY FULL-TEXT SEARCH INDEX
CREATE INDEX IF NOT EXISTS idx_resources_search ON public.resources
USING gin(to_tsvector('english', title || ' ' || COALESCE(description, '')));

-- 3. SUPABASE STORAGE BUCKET CONFIGURATION FOR RESOURCE IMAGES
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'resource-images',
  'resource-images',
  true,
  5242880, -- 5 MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

-- 4. STORAGE ACCESS POLICIES
DROP POLICY IF EXISTS "Public can view resource images" ON storage.objects;
CREATE POLICY "Public can view resource images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'resource-images');

DROP POLICY IF EXISTS "Authenticated users can upload resource images" ON storage.objects;
CREATE POLICY "Authenticated users can upload resource images"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'resource-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Owners can update their uploaded images" ON storage.objects;
CREATE POLICY "Owners can update their uploaded images"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'resource-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  )
  WITH CHECK (
    bucket_id = 'resource-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

DROP POLICY IF EXISTS "Owners can delete their uploaded images" ON storage.objects;
CREATE POLICY "Owners can delete their uploaded images"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'resource-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
