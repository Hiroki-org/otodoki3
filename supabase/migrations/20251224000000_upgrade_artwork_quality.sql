-- Upgrade artwork quality from 100x100 to 1000x1000
-- This migration updates existing artwork_url entries to use higher resolution images

UPDATE track_pool
SET artwork_url = REPLACE(artwork_url, '100x100bb', '1000x1000bb')
WHERE artwork_url IS NOT NULL
  AND artwork_url LIKE '%100x100bb%';

-- Add comment documenting the change
COMMENT ON COLUMN track_pool.artwork_url IS 'Apple Music artwork URL (1000x1000 resolution)';
