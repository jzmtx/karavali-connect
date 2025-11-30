-- Test Setup for Local Development
-- Run this in your Supabase SQL Editor
-- REPLACE THE COORDINATES WITH YOUR ACTUAL LOCATION

-- Add test beach at your location (REPLACE THESE COORDINATES)
INSERT INTO beaches (beach_id, name, district, gps_lat, gps_lng, radius_meters, status) VALUES
('test_beach', 'Test Beach (Your Location)', 'Test District', 12.3508111, 76.6123884, 2000, 'active')
ON CONFLICT (beach_id) DO UPDATE SET
  gps_lat = 12.3508111,
  gps_lng = 76.6123884,
  radius_meters = 2000;

-- Create test users (REPLACE PHONE NUMBERS)
INSERT INTO users (phone_number, role, password_hash, coin_balance, merchant_coins) VALUES
('1234567890', 'tourist', 'test123', 100, 0),
('1234567891', 'merchant', 'test123', 0, 50),
('1234567892', 'beach_authority', 'test123', 0, 0),
('1234567893', 'municipality', 'test123', 0, 0),
('1234567894', 'admin', 'test123', 0, 0)
ON CONFLICT (phone_number) DO UPDATE SET
  coin_balance = EXCLUDED.coin_balance,
  merchant_coins = EXCLUDED.merchant_coins;

-- Assign beach to authorities
UPDATE users SET assigned_beach_id = 'test_beach' 
WHERE role IN ('beach_authority', 'municipality') 
AND phone_number IN ('1234567892', '1234567893');

-- Create test bin at your location (REPLACE COORDINATES)
INSERT INTO bins (bin_id, qr_code, gps_lat, gps_lng, status, beach_id) VALUES
('TEST_BIN_001', 'karavali-bin-TEST_BIN_001-' || extract(epoch from now()), 12.3508111, 76.6123884, 'empty', 'test_beach')
ON CONFLICT (bin_id) DO UPDATE SET
  gps_lat = 12.3508111,
  gps_lng = 76.6123884,
  beach_id = 'test_beach';

-- Register test merchant at test beach
DO $$
DECLARE
  merchant_user_id UUID;
BEGIN
  SELECT id INTO merchant_user_id FROM users WHERE phone_number = '1234567891';
  
  INSERT INTO beach_merchants (
    merchant_id, beach_id, business_name, business_type, 
    shop_address, shop_gps_lat, shop_gps_lng, 
    contact_phone, description, is_active
  ) VALUES (
    merchant_user_id, 'test_beach', 'Test Merchant Shop', 'Restaurant',
    'Test Address, Your Location', 12.3508111, 76.6123884,
    '1234567891', 'Test merchant for development', true
  ) ON CONFLICT (merchant_id, beach_id) DO UPDATE SET
    shop_gps_lat = 12.3508111,
    shop_gps_lng = 76.6123884,
    is_active = true;
END $$;

-- Create test mode function (bypasses GPS verification for testing)
CREATE OR REPLACE FUNCTION verify_beach_location_test_mode(
  user_lat DECIMAL(10, 8),
  user_lng DECIMAL(11, 8),
  beach_id_param TEXT
)
RETURNS JSON AS $$
DECLARE
  beach_record RECORD;
BEGIN
  -- Get beach details
  SELECT * INTO beach_record
  FROM beaches
  WHERE beach_id = beach_id_param AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN JSON_BUILD_OBJECT(
      'valid', false,
      'error', 'Beach not found'
    );
  END IF;
  
  -- Always return valid for test beach
  IF beach_id_param = 'test_beach' THEN
    RETURN JSON_BUILD_OBJECT(
      'valid', true,
      'method', 'test_mode',
      'beach_name', beach_record.name,
      'distance', 0,
      'message', 'TEST MODE: Location verification bypassed'
    );
  END IF;
  
  -- For other beaches, use normal verification
  RETURN verify_beach_location(user_lat, user_lng, beach_id_param);
END;
$$ LANGUAGE plpgsql;

-- Create user location tracking table
CREATE TABLE IF NOT EXISTS user_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  gps_lat DECIMAL(10, 8) NOT NULL,
  gps_lng DECIMAL(11, 8) NOT NULL,
  accuracy DECIMAL(8, 2),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '12 hours'),
  UNIQUE(user_id)
);

-- Function to update user location with 12-hour expiry
CREATE OR REPLACE FUNCTION update_user_location(
  user_id_param UUID,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  accuracy_param DECIMAL(8, 2) DEFAULT NULL
)
RETURNS JSON AS $$
BEGIN
  INSERT INTO user_locations (user_id, gps_lat, gps_lng, accuracy, updated_at, expires_at)
  VALUES (user_id_param, lat, lng, accuracy_param, NOW(), NOW() + INTERVAL '12 hours')
  ON CONFLICT (user_id) DO UPDATE SET
    gps_lat = lat,
    gps_lng = lng,
    accuracy = accuracy_param,
    updated_at = NOW(),
    expires_at = NOW() + INTERVAL '12 hours';
  
  RETURN JSON_BUILD_OBJECT(
    'success', true,
    'expires_at', (NOW() + INTERVAL '12 hours'),
    'message', 'Location updated successfully'
  );
END;
$$ LANGUAGE plpgsql;

-- Function to check if user location is valid (not expired)
CREATE OR REPLACE FUNCTION check_user_location_validity(
  user_id_param UUID
)
RETURNS JSON AS $$
DECLARE
  location_record RECORD;
BEGIN
  SELECT * INTO location_record
  FROM user_locations
  WHERE user_id = user_id_param;
  
  IF NOT FOUND THEN
    RETURN JSON_BUILD_OBJECT(
      'valid', false,
      'expired', true,
      'message', 'No location data found. Please update your location.'
    );
  END IF;
  
  IF location_record.expires_at < NOW() THEN
    RETURN JSON_BUILD_OBJECT(
      'valid', false,
      'expired', true,
      'last_updated', location_record.updated_at,
      'expired_at', location_record.expires_at,
      'message', 'Location data expired. Please update your location.'
    );
  END IF;
  
  RETURN JSON_BUILD_OBJECT(
    'valid', true,
    'expired', false,
    'gps_lat', location_record.gps_lat,
    'gps_lng', location_record.gps_lng,
    'accuracy', location_record.accuracy,
    'updated_at', location_record.updated_at,
    'expires_at', location_record.expires_at,
    'hours_remaining', EXTRACT(EPOCH FROM (location_record.expires_at - NOW())) / 3600
  );
END;
$$ LANGUAGE plpgsql;

-- Create manual locations table for user-added locations
CREATE TABLE IF NOT EXISTS user_manual_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  location_name TEXT NOT NULL,
  gps_lat DECIMAL(10, 8) NOT NULL,
  gps_lng DECIMAL(11, 8) NOT NULL,
  address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);

-- Function to add manual location
CREATE OR REPLACE FUNCTION add_manual_location(
  user_id_param UUID,
  location_name_param TEXT,
  lat DECIMAL(10, 8),
  lng DECIMAL(11, 8),
  address_param TEXT DEFAULT NULL
)
RETURNS JSON AS $$
BEGIN
  INSERT INTO user_manual_locations (user_id, location_name, gps_lat, gps_lng, address)
  VALUES (user_id_param, location_name_param, lat, lng, address_param);
  
  RETURN JSON_BUILD_OBJECT(
    'success', true,
    'message', 'Location added successfully'
  );
END;
$$ LANGUAGE plpgsql;

-- Function to remove manual location
CREATE OR REPLACE FUNCTION remove_manual_location(
  user_id_param UUID,
  location_id_param UUID
)
RETURNS JSON AS $$
BEGIN
  DELETE FROM user_manual_locations 
  WHERE id = location_id_param AND user_id = user_id_param;
  
  IF FOUND THEN
    RETURN JSON_BUILD_OBJECT(
      'success', true,
      'message', 'Location removed successfully'
    );
  ELSE
    RETURN JSON_BUILD_OBJECT(
      'success', false,
      'message', 'Location not found'
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to verify real-time GPS for activities (cleanup, safety reports)
CREATE OR REPLACE FUNCTION verify_activity_location(
  user_id_param UUID,
  current_lat DECIMAL(10, 8),
  current_lng DECIMAL(11, 8),
  beach_id_param TEXT,
  activity_type TEXT
)
RETURNS JSON AS $$
DECLARE
  beach_record RECORD;
  distance_meters DECIMAL;
  max_distance INTEGER := 50; -- 50 meters tolerance for activities
BEGIN
  -- Get beach details
  SELECT * INTO beach_record
  FROM beaches
  WHERE beach_id = beach_id_param AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN JSON_BUILD_OBJECT(
      'valid', false,
      'error', 'Beach not found'
    );
  END IF;
  
  -- Calculate distance using Haversine formula
  SELECT (
    6371000 * acos(
      cos(radians(beach_record.gps_lat)) * 
      cos(radians(current_lat)) * 
      cos(radians(current_lng) - radians(beach_record.gps_lng)) + 
      sin(radians(beach_record.gps_lat)) * 
      sin(radians(current_lat))
    )
  ) INTO distance_meters;
  
  -- Check if within beach radius
  IF distance_meters <= beach_record.radius_meters THEN
    -- Additional strict verification for activities
    IF distance_meters <= max_distance THEN
      RETURN JSON_BUILD_OBJECT(
        'valid', true,
        'verified', true,
        'distance', distance_meters,
        'beach_name', beach_record.name,
        'activity_type', activity_type,
        'message', 'Location verified for activity'
      );
    ELSE
      RETURN JSON_BUILD_OBJECT(
        'valid', true,
        'verified', false,
        'distance', distance_meters,
        'beach_name', beach_record.name,
        'activity_type', activity_type,
        'message', 'You are at the beach but need to be closer for ' || activity_type,
        'required_distance', max_distance
      );
    END IF;
  ELSE
    RETURN JSON_BUILD_OBJECT(
      'valid', false,
      'verified', false,
      'distance', distance_meters,
      'beach_name', beach_record.name,
      'activity_type', activity_type,
      'message', 'You must be at ' || beach_record.name || ' to perform ' || activity_type,
      'max_distance', beach_record.radius_meters
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Instructions for testing
SELECT 'TEST SETUP COMPLETE!' as status,
       'IMPORTANT: Update coordinates in this file with your actual location before running!' as instruction,
       'Test Users Created:' as users_info,
       '1234567890 - Tourist (100 coins)' as tourist,
       '1234567891 - Merchant (50 merchant coins)' as merchant,
       '1234567892 - Beach Authority' as beach_auth,
       '1234567893 - Municipality' as municipality,
       '1234567894 - Admin' as admin;