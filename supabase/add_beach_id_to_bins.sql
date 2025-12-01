-- Add beach_id to bins table
ALTER TABLE bins 
ADD COLUMN IF NOT EXISTS beach_id TEXT REFERENCES beaches(beach_id);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_bins_beach ON bins(beach_id);
