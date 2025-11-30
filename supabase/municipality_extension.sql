-- Municipality Beach Assignment Extension
-- Run this in your Supabase SQL Editor after authority_beach_system.sql

-- Update the assign_beach_to_authority function to support municipality
CREATE OR REPLACE FUNCTION assign_beach_to_authority(
  authority_id UUID,
  beach_id_param TEXT
)
RETURNS JSON AS $$
DECLARE
  existing_assignment TEXT;
  beach_record RECORD;
  user_role TEXT;
BEGIN
  -- Get user role and check if authority already has a beach assigned
  SELECT assigned_beach_id, role INTO existing_assignment, user_role
  FROM users
  WHERE id = authority_id AND role IN ('beach_authority', 'municipality');
  
  IF existing_assignment IS NOT NULL THEN
    RETURN JSON_BUILD_OBJECT(
      'success', false,
      'error', user_role || ' already assigned to a beach'
    );
  END IF;
  
  -- Verify beach exists
  SELECT * INTO beach_record
  FROM beaches
  WHERE beach_id = beach_id_param AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN JSON_BUILD_OBJECT(
      'success', false,
      'error', 'Beach not found'
    );
  END IF;
  
  -- Assign beach to authority
  UPDATE users
  SET assigned_beach_id = beach_id_param
  WHERE id = authority_id;
  
  RETURN JSON_BUILD_OBJECT(
    'success', true,
    'beach_id', beach_id_param,
    'beach_name', beach_record.name
  );
END;
$$ LANGUAGE plpgsql;

-- Update get_beach_authority_reports to support municipality
CREATE OR REPLACE FUNCTION get_beach_authority_reports(authority_id UUID)
RETURNS TABLE(
  report_id UUID,
  type TEXT,
  description TEXT,
  status TEXT,
  gps_lat DECIMAL,
  gps_lng DECIMAL,
  created_at TIMESTAMP WITH TIME ZONE,
  user_phone TEXT
) AS $$
DECLARE
  authority_beach TEXT;
BEGIN
  -- Get authority's assigned beach (works for both beach_authority and municipality)
  SELECT assigned_beach_id INTO authority_beach
  FROM users
  WHERE id = authority_id AND role IN ('beach_authority', 'municipality');
  
  IF authority_beach IS NULL THEN
    RETURN;
  END IF;
  
  -- Return reports only from assigned beach
  RETURN QUERY
  SELECT 
    r.report_id,
    r.type,
    r.description,
    r.status,
    r.gps_lat,
    r.gps_lng,
    r.created_at,
    u.phone_number as user_phone
  FROM reports r
  JOIN users u ON r.user_id = u.id
  WHERE r.beach_id = authority_beach
  ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to get bins for specific municipality
CREATE OR REPLACE FUNCTION get_municipality_bins(municipality_id UUID)
RETURNS TABLE(
  bin_id TEXT,
  qr_code TEXT,
  gps_lat DECIMAL,
  gps_lng DECIMAL,
  status TEXT,
  last_reported_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  municipality_beach TEXT;
BEGIN
  -- Get municipality's assigned beach
  SELECT assigned_beach_id INTO municipality_beach
  FROM users
  WHERE id = municipality_id AND role = 'municipality';
  
  IF municipality_beach IS NULL THEN
    RETURN;
  END IF;
  
  -- Return bins only from assigned beach
  RETURN QUERY
  SELECT 
    b.bin_id,
    b.qr_code,
    b.gps_lat,
    b.gps_lng,
    b.status,
    b.last_reported_time,
    b.created_at
  FROM bins b
  WHERE b.beach_id = municipality_beach
  ORDER BY b.created_at DESC;
END;
$$ LANGUAGE plpgsql;