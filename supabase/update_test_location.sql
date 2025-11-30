-- Update Test Beach Location for Testing
-- This will set the test beach to your current location

-- Update test beach coordinates (replace with your actual coordinates)
UPDATE beaches 
SET 
  gps_lat = 12.3508111,
  gps_lng = 76.6123884,
  radius_meters = 5000,
  name = 'Test Beach (Your Location)',
  district = 'Test District'
WHERE beach_id = 'test_beach';

-- If test beach doesn't exist, create it
INSERT INTO beaches (beach_id, name, district, gps_lat, gps_lng, radius_meters, status) 
VALUES ('test_beach', 'Test Beach (Your Location)', 'Test District', 12.3508111, 76.6123884, 5000, 'active')
ON CONFLICT (beach_id) DO UPDATE SET
  gps_lat = 12.3508111,
  gps_lng = 76.6123884,
  radius_meters = 5000,
  name = 'Test Beach (Your Location)',
  district = 'Test District';

-- Update test bin location to match
UPDATE bins 
SET 
  gps_lat = 12.3508111,
  gps_lng = 76.6123884,
  beach_id = 'test_beach'
WHERE bin_id = 'TEST_BIN_001';

-- Create test bin if it doesn't exist
INSERT INTO bins (bin_id, qr_code, gps_lat, gps_lng, status, beach_id) 
VALUES ('TEST_BIN_001', 'karavali-bin-TEST_BIN_001-' || extract(epoch from now()), 12.3508111, 76.6123884, 'empty', 'test_beach')
ON CONFLICT (bin_id) DO UPDATE SET
  gps_lat = 12.3508111,
  gps_lng = 76.6123884,
  beach_id = 'test_beach';

-- Update merchant location
UPDATE beach_merchants 
SET 
  shop_gps_lat = 12.3508111,
  shop_gps_lng = 76.6123884
WHERE beach_id = 'test_beach';

-- Create test mode location verification function
CREATE OR REPLACE FUNCTION verify_beach_location_test(
  user_lat DECIMAL(10, 8),
  user_lng DECIMAL(11, 8),
  beach_id_param TEXT
)
RETURNS JSON AS $$
BEGIN
  -- For test beach, always return valid
  IF beach_id_param = 'test_beach' THEN
    RETURN JSON_BUILD_OBJECT(
      'valid', true,
      'method', 'test_mode',
      'beach_name', 'Test Beach (Your Location)',
      'distance', 0,
      'message', 'TEST MODE: Location verification bypassed'
    );
  END IF;
  
  -- For other beaches, use normal verification
  RETURN verify_beach_location(user_lat, user_lng, beach_id_param);
END;
$$ LANGUAGE plpgsql;