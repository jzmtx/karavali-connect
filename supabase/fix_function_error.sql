-- Fix function error by dropping and recreating
-- Run this first to resolve the function return type conflict

-- Drop existing function that's causing the conflict
DROP FUNCTION IF EXISTS get_beach_merchants(text);

-- Now recreate with correct signature
CREATE OR REPLACE FUNCTION get_beach_merchants(beach_id_param TEXT)
RETURNS TABLE (
  merchant_id UUID,
  merchant_name TEXT,
  business_name TEXT,
  business_type TEXT,
  contact_phone TEXT,
  shop_address TEXT,
  shop_gps_lat DECIMAL(10, 8),
  shop_gps_lng DECIMAL(11, 8),
  is_active BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bm.merchant_id,
    u.phone_number as merchant_name,
    bm.business_name,
    bm.business_type,
    bm.contact_phone,
    bm.shop_address,
    bm.shop_gps_lat,
    bm.shop_gps_lng,
    bm.is_active
  FROM beach_merchants bm
  JOIN users u ON bm.merchant_id = u.id
  WHERE bm.beach_id = beach_id_param AND bm.is_active = true
  ORDER BY bm.business_name;
END;
$$ LANGUAGE plpgsql;