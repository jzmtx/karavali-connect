-- Beach Management System for Karavali Connect
-- Run this in your Supabase SQL Editor

-- Beaches table with authority assignments
CREATE TABLE IF NOT EXISTS beaches (
  beach_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  district TEXT NOT NULL,
  gps_lat DECIMAL(10, 8) NOT NULL,
  gps_lng DECIMAL(11, 8) NOT NULL,
  radius_meters INTEGER DEFAULT 1000,
  beach_authority_id UUID REFERENCES users(id),
  municipality_id UUID REFERENCES users(id),
  fisheries_authority_id UUID REFERENCES users(id),
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add beach_id to existing tables
ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_beach_id TEXT REFERENCES beaches(beach_id);
ALTER TABLE bins ADD COLUMN IF NOT EXISTS beach_id TEXT REFERENCES beaches(beach_id);
ALTER TABLE reports ADD COLUMN IF NOT EXISTS beach_id TEXT REFERENCES beaches(beach_id);

-- Merchants table for beach-specific merchants with shop locations
CREATE TABLE IF NOT EXISTS beach_merchants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES users(id),
  beach_id TEXT NOT NULL REFERENCES beaches(beach_id),
  business_name TEXT NOT NULL,
  business_type TEXT NOT NULL,
  shop_address TEXT NOT NULL,
  shop_gps_lat DECIMAL(10, 8),
  shop_gps_lng DECIMAL(11, 8),
  contact_phone TEXT,
  business_image_url TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(merchant_id, beach_id)
);

-- Insert sample beaches with coordinates
INSERT INTO beaches (beach_id, name, district, gps_lat, gps_lng, radius_meters) VALUES
('malpe', 'Malpe Beach', 'Udupi', 13.3503, 74.7042, 1000),
('kaup', 'Kaup Beach', 'Udupi', 13.2333, 74.7500, 800),
('panambur', 'Panambur Beach', 'Mangalore', 12.8625, 74.8097, 1200),
('tannirbhavi', 'Tannirbhavi Beach', 'Mangalore', 12.8333, 74.8000, 800),
('gokarna', 'Gokarna Beach', 'Uttara Kannada', 14.5492, 74.3200, 1000),
('om_beach', 'Om Beach', 'Gokarna', 14.5333, 74.3167, 600),
('kudle', 'Kudle Beach', 'Gokarna', 14.5400, 74.3150, 600),
('half_moon', 'Half Moon Beach', 'Gokarna', 14.5350, 74.3100, 500),
('paradise', 'Paradise Beach', 'Gokarna', 14.5300, 74.3050, 500),
('murudeshwar', 'Murudeshwar Beach', 'Bhatkal', 14.0942, 74.4850, 1000),
('karwar', 'Karwar Beach', 'Karwar', 14.8142, 74.1297, 1000),
('devbagh', 'Devbagh Beach', 'Karwar', 14.8500, 74.1000, 800),
('kundapura', 'Kundapura Beach', 'Kundapura', 13.6167, 74.6833, 800),
('maravanthe', 'Maravanthe Beach', 'Kundapura', 13.6000, 74.7000, 800),
('ullal', 'Ullal Beach', 'Mangalore', 12.8000, 74.8667, 800),
('surathkal', 'Surathkal Beach', 'Mangalore', 13.0167, 74.7833, 800),
('someshwar', 'Someshwar Beach', 'Mangalore', 12.7833, 74.8833, 800)
ON CONFLICT (beach_id) DO NOTHING;

-- Function to detect beach from user location using Google Maps-like detection
CREATE OR REPLACE FUNCTION detect_user_beach(
  user_lat DECIMAL(10, 8),
  user_lng DECIMAL(11, 8)
)
RETURNS JSON AS $$
DECLARE
  beach_record RECORD;
  distance_meters DECIMAL;
BEGIN
  -- Find nearest beach within boundaries
  SELECT *, (
    6371000 * acos(
      cos(radians(gps_lat)) * 
      cos(radians(user_lat)) * 
      cos(radians(user_lng) - radians(gps_lng)) + 
      sin(radians(gps_lat)) * 
      sin(radians(user_lat))
    )
  ) as distance
  INTO beach_record
  FROM beaches
  WHERE status = 'active'
  AND (
    6371000 * acos(
      cos(radians(gps_lat)) * 
      cos(radians(user_lat)) * 
      cos(radians(user_lng) - radians(gps_lng)) + 
      sin(radians(gps_lat)) * 
      sin(radians(user_lat))
    )
  ) <= radius_meters
  ORDER BY distance
  LIMIT 1;
  
  IF FOUND THEN
    RETURN JSON_BUILD_OBJECT(
      'detected', true,
      'beach_id', beach_record.beach_id,
      'beach_name', beach_record.name,
      'distance', beach_record.distance,
      'beach_authority', beach_record.beach_authority_id,
      'municipality', beach_record.municipality_id,
      'fisheries_authority', beach_record.fisheries_authority_id
    );
  ELSE
    RETURN JSON_BUILD_OBJECT(
      'detected', false,
      'message', 'No beach detected at current location'
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to verify if user can perform activities (either detected or manually selected)
CREATE OR REPLACE FUNCTION verify_beach_activity(
  user_lat DECIMAL(10, 8),
  user_lng DECIMAL(11, 8),
  selected_beach_id TEXT
)
RETURNS JSON AS $$
DECLARE
  detection_result JSON;
  beach_record RECORD;
  distance_meters DECIMAL;
BEGIN
  -- First try to detect beach automatically
  SELECT detect_user_beach(user_lat, user_lng) INTO detection_result;
  
  -- If beach detected and matches selected beach, allow activity
  IF (detection_result->>'detected')::BOOLEAN THEN
    IF detection_result->>'beach_id' = selected_beach_id THEN
      RETURN JSON_BUILD_OBJECT(
        'valid', true,
        'method', 'auto_detected',
        'beach_name', detection_result->>'beach_name',
        'distance', detection_result->>'distance'
      );
    END IF;
  END IF;
  
  -- If no detection or different beach, check if user is within selected beach boundaries
  SELECT * INTO beach_record
  FROM beaches
  WHERE beach_id = selected_beach_id AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN JSON_BUILD_OBJECT(
      'valid', false,
      'error', 'Selected beach not found'
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
  
  IF distance_meters <= beach_record.radius_meters THEN
    RETURN JSON_BUILD_OBJECT(
      'valid', true,
      'method', 'manual_verified',
      'beach_name', beach_record.name,
      'distance', distance_meters
    );
  ELSE
    RETURN JSON_BUILD_OBJECT(
      'valid', false,
      'error', 'You are not within the boundaries of ' || beach_record.name,
      'distance', distance_meters,
      'max_distance', beach_record.radius_meters
    );
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to get nearby beaches for a location
CREATE OR REPLACE FUNCTION get_nearby_beaches(
  user_lat DECIMAL(10, 8),
  user_lng DECIMAL(11, 8),
  max_distance_km DECIMAL DEFAULT 50
)
RETURNS TABLE(
  beach_id TEXT,
  name TEXT,
  district TEXT,
  distance_km DECIMAL,
  gps_lat DECIMAL,
  gps_lng DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.beach_id,
    b.name,
    b.district,
    ROUND(
      (6371 * acos(
        cos(radians(b.gps_lat)) * 
        cos(radians(user_lat)) * 
        cos(radians(user_lng) - radians(b.gps_lng)) + 
        sin(radians(b.gps_lat)) * 
        sin(radians(user_lat))
      ))::DECIMAL, 2
    ) as distance_km,
    b.gps_lat,
    b.gps_lng
  FROM beaches b
  WHERE b.status = 'active'
  AND (
    6371 * acos(
      cos(radians(b.gps_lat)) * 
      cos(radians(user_lat)) * 
      cos(radians(user_lng) - radians(b.gps_lng)) + 
      sin(radians(b.gps_lat)) * 
      sin(radians(user_lat))
    )
  ) <= max_distance_km
  ORDER BY distance_km;
END;
$$ LANGUAGE plpgsql;

-- Function to register merchant shop at any location
CREATE OR REPLACE FUNCTION register_merchant_shop(
  merchant_id_param UUID,
  beach_id_param TEXT,
  business_name_param TEXT,
  business_type_param TEXT,
  shop_address_param TEXT,
  shop_lat DECIMAL(10, 8),
  shop_lng DECIMAL(11, 8),
  contact_phone_param TEXT,
  business_image_param TEXT,
  description_param TEXT
)
RETURNS JSON AS $$
DECLARE
  beach_record RECORD;
BEGIN
  -- Verify beach exists
  SELECT * INTO beach_record
  FROM beaches
  WHERE beach_id = beach_id_param AND status = 'active';
  
  IF NOT FOUND THEN
    RETURN JSON_BUILD_OBJECT(
      'success', false,
      'error', 'Beach not found or inactive'
    );
  END IF;
  
  -- Insert or update merchant registration
  INSERT INTO beach_merchants (
    merchant_id,
    beach_id,
    business_name,
    business_type,
    shop_address,
    shop_gps_lat,
    shop_gps_lng,
    contact_phone,
    business_image_url,
    description,
    is_active
  ) VALUES (
    merchant_id_param,
    beach_id_param,
    business_name_param,
    business_type_param,
    shop_address_param,
    shop_lat,
    shop_lng,
    contact_phone_param,
    business_image_param,
    description_param,
    true
  )
  ON CONFLICT (merchant_id, beach_id)
  DO UPDATE SET
    business_name = business_name_param,
    business_type = business_type_param,
    shop_address = shop_address_param,
    shop_gps_lat = shop_lat,
    shop_gps_lng = shop_lng,
    contact_phone = contact_phone_param,
    business_image_url = business_image_param,
    description = description_param,
    is_active = true;
  
  RETURN JSON_BUILD_OBJECT(
    'success', true,
    'beach_id', beach_id_param,
    'beach_name', beach_record.name
  );
END;
$$ LANGUAGE plpgsql;

-- Function to get merchants for a specific beach with shop details
CREATE OR REPLACE FUNCTION get_beach_merchants(beach_id_param TEXT)
RETURNS TABLE(
  merchant_name TEXT,
  business_name TEXT,
  business_type TEXT,
  shop_address TEXT,
  shop_gps_lat DECIMAL,
  shop_gps_lng DECIMAL,
  contact_phone TEXT,
  business_image_url TEXT,
  description TEXT,
  merchant_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.phone_number as merchant_name,
    bm.business_name,
    bm.business_type,
    bm.shop_address,
    bm.shop_gps_lat,
    bm.shop_gps_lng,
    bm.contact_phone,
    bm.business_image_url,
    bm.description,
    bm.merchant_id
  FROM beach_merchants bm
  JOIN users u ON bm.merchant_id = u.id
  WHERE bm.beach_id = beach_id_param 
    AND bm.is_active = true
    AND u.role = 'merchant'
  ORDER BY bm.business_name;
END;
$$ LANGUAGE plpgsql;

-- Function to get beach-specific notifications for authorities
CREATE OR REPLACE FUNCTION get_beach_notifications(
  authority_user_id UUID,
  beach_id_param TEXT
)
RETURNS TABLE(
  notification_type TEXT,
  message TEXT,
  created_at TIMESTAMP WITH TIME ZONE,
  report_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.type as notification_type,
    CASE 
      WHEN r.type = 'bin' THEN 'Bin reported as ' || r.description
      WHEN r.type = 'cleanup' THEN 'Beach cleanup completed'
      WHEN r.type = 'danger' THEN 'Safety issue reported'
      WHEN r.type = 'net' THEN 'Ghost net reported'
      ELSE 'New report submitted'
    END as message,
    r.created_at,
    r.report_id
  FROM reports r
  WHERE r.beach_id = beach_id_param
    AND r.status = 'pending'
    AND r.created_at >= NOW() - INTERVAL '24 hours'
  ORDER BY r.created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_beaches_location ON beaches(gps_lat, gps_lng);
CREATE INDEX IF NOT EXISTS idx_beach_merchants_beach ON beach_merchants(beach_id);
CREATE INDEX IF NOT EXISTS idx_beach_merchants_merchant ON beach_merchants(merchant_id);
CREATE INDEX IF NOT EXISTS idx_users_beach ON users(assigned_beach_id);
CREATE INDEX IF NOT EXISTS idx_bins_beach ON bins(beach_id);
CREATE INDEX IF NOT EXISTS idx_reports_beach ON reports(beach_id);
CREATE INDEX IF NOT EXISTS idx_reports_beach_status ON reports(beach_id, status);