-- Bin Management Functions for Karavali Connect
-- Run this in your Supabase SQL Editor after the main schema

-- Drop existing function first
DROP FUNCTION IF EXISTS process_qr_scan(TEXT, UUID, DECIMAL, DECIMAL, INTEGER);

-- Function to process QR scan (atomic transaction)
CREATE FUNCTION process_qr_scan(
  bin_id_param TEXT,
  user_id_param UUID,
  scan_lat DECIMAL(10, 8),
  scan_lng DECIMAL(11, 8),
  coins_param INTEGER
)
RETURNS JSON AS $$
DECLARE
  existing_scan_count INTEGER;
  today_start TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get today's start time in UTC
  today_start := DATE_TRUNC('day', NOW() AT TIME ZONE 'UTC');
  
  -- Check if user already scanned this bin today
  SELECT COUNT(*) INTO existing_scan_count
  FROM bin_qr_scans
  WHERE bin_id = bin_id_param 
    AND user_id = user_id_param 
    AND created_at >= today_start;
  
  -- If already scanned today, return error
  IF existing_scan_count > 0 THEN
    RETURN JSON_BUILD_OBJECT(
      'success', false,
      'error', 'You already scanned this bin today'
    );
  END IF;
  
  -- Insert scan record
  INSERT INTO bin_qr_scans (
    bin_id,
    user_id,
    scan_location_lat,
    scan_location_lng,
    verified,
    coins_awarded
  ) VALUES (
    bin_id_param,
    user_id_param,
    scan_lat,
    scan_lng,
    true,
    coins_param
  );
  
  -- Award coins to user
  UPDATE users
  SET coin_balance = coin_balance + coins_param
  WHERE id = user_id_param;
  
  RETURN JSON_BUILD_OBJECT(
    'success', true,
    'coins_awarded', coins_param
  );
  
EXCEPTION
  WHEN OTHERS THEN
    RETURN JSON_BUILD_OBJECT(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql;

-- Function to update bin last reported time
CREATE OR REPLACE FUNCTION update_bin_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  -- Update timestamp when status changes
  IF NEW.status != OLD.status THEN
    NEW.last_reported_time := NOW();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for timestamp update
DROP TRIGGER IF EXISTS trigger_update_bin_timestamp ON bins;
CREATE TRIGGER trigger_update_bin_timestamp
  BEFORE UPDATE ON bins
  FOR EACH ROW
  EXECUTE FUNCTION update_bin_timestamp();

-- Function to get bin statistics for municipality
CREATE OR REPLACE FUNCTION get_bin_stats()
RETURNS JSON AS $$
DECLARE
  total_bins INTEGER;
  full_bins INTEGER;
  empty_bins INTEGER;
  cleared_bins INTEGER;
BEGIN
  SELECT COUNT(*) INTO total_bins FROM bins;
  SELECT COUNT(*) INTO full_bins FROM bins WHERE status = 'full';
  SELECT COUNT(*) INTO empty_bins FROM bins WHERE status = 'empty';
  SELECT COUNT(*) INTO cleared_bins FROM bins WHERE status = 'cleared';
  
  RETURN JSON_BUILD_OBJECT(
    'total', total_bins,
    'full', full_bins,
    'empty', empty_bins,
    'cleared', cleared_bins,
    'full_percentage', CASE WHEN total_bins > 0 THEN ROUND((full_bins::DECIMAL / total_bins) * 100, 1) ELSE 0 END
  );
END;
$$ LANGUAGE plpgsql;