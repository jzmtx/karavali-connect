-- Fix for missing register_merchant_shop function
-- Run this in your Supabase SQL Editor

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
    'beach_name', beach_id_param
  );
END;
$$ LANGUAGE plpgsql;