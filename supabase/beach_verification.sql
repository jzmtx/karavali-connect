-- Beach Location Verification System
-- Run this in your Supabase SQL Editor

-- Function to verify if user is at the selected beach location
CREATE OR REPLACE FUNCTION verify_beach_location(
  user_lat DECIMAL(10, 8),
  user_lng DECIMAL(11, 8),
  beach_id_param TEXT
)
RETURNS JSON AS $$
DECLARE
  beach_record RECORD;
  distance_meters DECIMAL;
  detection_result JSON;
BEGIN
  -- First try auto-detection to see if user is at any beach
  SELECT detect_user_beach(user_lat, user_lng) INTO detection_result;
  
  -- If auto-detected and matches selected beach, allow immediately
  IF (detection_result->>'detected')::BOOLEAN THEN
    IF detection_result->>'beach_id' = beach_id_param THEN
      RETURN JSON_BUILD_OBJECT(
        'valid', true,
        'method', 'auto_detected',
        'beach_name', detection_result->>'beach_name',
        'distance', detection_result->>'distance',
        'message', 'Location verified - you are at ' || (detection_result->>'beach_name')
      );
    END IF;
  END IF;
  
  -- Get selected beach details
  SELECT * INTO beach_record
  FROM beaches
  WHERE beach_id = beach_id_param AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN JSON_BUILD_OBJECT(
      'valid', false,
      'error', 'Selected beach not found or inactive'
    );
  END IF;
  
  -- Calculate distance to selected beach
  SELECT (
    6371000 * acos(
      cos(radians(beach_record.gps_lat)) * 
      cos(radians(user_lat)) * 
      cos(radians(user_lng) - radians(beach_record.gps_lng)) + 
      sin(radians(beach_record.gps_lat)) * 
      sin(radians(user_lat))
    )
  ) INTO distance_meters;
  
  -- Check if within beach boundaries (radius)
  IF distance_meters <= beach_record.radius_meters THEN
    RETURN JSON_BUILD_OBJECT(
      'valid', true,
      'method', 'manual_verified',
      'beach_name', beach_record.name,
      'distance', distance_meters,
      'max_distance', beach_record.radius_meters,
      'message', 'Location verified - you are within ' || beach_record.name || ' boundaries'
    );
  END IF;
  
  -- Check if user manually entered beach but is at a different location
  IF (detection_result->>'detected')::BOOLEAN THEN
    RETURN JSON_BUILD_OBJECT(
      'valid', false,
      'error', 'You selected ' || beach_record.name || ' but you are actually at ' || (detection_result->>'beach_name') || '. Please select the correct beach or go to ' || beach_record.name,
      'actual_beach', detection_result->>'beach_name',
      'selected_beach', beach_record.name,
      'distance_to_selected', distance_meters
    );
  END IF;
  
  -- User is not at any beach or too far from selected beach
  RETURN JSON_BUILD_OBJECT(
    'valid', false,
    'error', 'You are ' || ROUND(distance_meters) || 'm away from ' || beach_record.name || '. You must be within ' || beach_record.radius_meters || 'm to perform activities there',
    'distance', distance_meters,
    'max_distance', beach_record.radius_meters,
    'beach_name', beach_record.name
  );
END;
$$ LANGUAGE plpgsql;

-- Function to verify beach activity with enhanced fraud detection
CREATE OR REPLACE FUNCTION verify_beach_activity_enhanced(
  user_lat DECIMAL(10, 8),
  user_lng DECIMAL(11, 8),
  selected_beach_id TEXT,
  activity_type TEXT DEFAULT 'cleanup'
)
RETURNS JSON AS $$
DECLARE
  verification_result JSON;
  beach_record RECORD;
BEGIN
  -- Use the main verification function
  SELECT verify_beach_location(user_lat, user_lng, selected_beach_id) INTO verification_result;
  
  -- If valid, add activity-specific metadata
  IF (verification_result->>'valid')::BOOLEAN THEN
    SELECT * INTO beach_record
    FROM beaches
    WHERE beach_id = selected_beach_id;
    
    RETURN JSON_BUILD_OBJECT(
      'valid', true,
      'method', verification_result->>'method',
      'beach_id', selected_beach_id,
      'beach_name', verification_result->>'beach_name',
      'distance', verification_result->>'distance',
      'activity_type', activity_type,
      'verification_time', NOW(),
      'message', verification_result->>'message'
    );
  END IF;
  
  -- Return the error from verification
  RETURN verification_result;
END;
$$ LANGUAGE plpgsql;