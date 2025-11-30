-- Authority Beach Assignment System
-- Run this in your Supabase SQL Editor

-- Update users table to store assigned beach for authorities
ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_beach_id TEXT REFERENCES beaches(beach_id);

-- Function to assign beach to authority (one-time assignment)
CREATE OR REPLACE FUNCTION assign_beach_to_authority(
  authority_id UUID,
  beach_id_param TEXT
)
RETURNS JSON AS $$
DECLARE
  existing_assignment TEXT;
  beach_record RECORD;
BEGIN
  -- Check if authority already has a beach assigned
  SELECT assigned_beach_id INTO existing_assignment
  FROM users
  WHERE id = authority_id AND role = 'beach_authority';
  
  IF existing_assignment IS NOT NULL THEN
    RETURN JSON_BUILD_OBJECT(
      'success', false,
      'error', 'Beach authority already assigned to a beach'
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

-- Function to get reports for specific beach authority
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
  -- Get authority's assigned beach
  SELECT assigned_beach_id INTO authority_beach
  FROM users
  WHERE id = authority_id AND role = 'beach_authority';
  
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

-- Function to process merchant redemption with beach tracking
CREATE OR REPLACE FUNCTION process_merchant_redemption_with_beach(
  merchant_id_param UUID,
  user_id_param UUID,
  coins_param INTEGER,
  bill_amount_param DECIMAL,
  discount_amount_param DECIMAL
)
RETURNS JSON AS $$
DECLARE
  merchant_beach TEXT;
  user_balance INTEGER;
BEGIN
  -- Get merchant's beach
  SELECT beach_id INTO merchant_beach
  FROM beach_merchants
  WHERE merchant_id = merchant_id_param AND is_active = true
  LIMIT 1;
  
  IF merchant_beach IS NULL THEN
    RETURN JSON_BUILD_OBJECT(
      'success', false,
      'error', 'Merchant not registered at any beach'
    );
  END IF;
  
  -- Check user balance
  SELECT coin_balance INTO user_balance
  FROM users
  WHERE id = user_id_param;
  
  IF user_balance < coins_param THEN
    RETURN JSON_BUILD_OBJECT(
      'success', false,
      'error', 'Insufficient coins'
    );
  END IF;
  
  -- Deduct coins from user
  UPDATE users
  SET coin_balance = coin_balance - coins_param
  WHERE id = user_id_param;
  
  -- Add merchant coins (to be paid by beach authority)
  UPDATE users
  SET merchant_coins = COALESCE(merchant_coins, 0) + coins_param
  WHERE id = merchant_id_param;
  
  -- Record transaction with beach info
  INSERT INTO merchant_redemptions (
    merchant_id,
    user_id,
    beach_id,
    coins_deducted,
    bill_amount,
    discount_amount,
    status,
    created_at
  ) VALUES (
    merchant_id_param,
    user_id_param,
    merchant_beach,
    coins_param,
    bill_amount_param,
    discount_amount_param,
    'completed',
    NOW()
  );
  
  RETURN JSON_BUILD_OBJECT(
    'success', true,
    'coins_redeemed', coins_param,
    'beach_id', merchant_beach
  );
END;
$$ LANGUAGE plpgsql;

-- Create merchant redemptions table if not exists
CREATE TABLE IF NOT EXISTS merchant_redemptions (
  redemption_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES users(id),
  user_id UUID NOT NULL REFERENCES users(id),
  beach_id TEXT REFERENCES beaches(beach_id),
  coins_deducted INTEGER NOT NULL,
  bill_amount DECIMAL(10,2),
  discount_amount DECIMAL(10,2),
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Function to get payment requests for specific beach authority
CREATE OR REPLACE FUNCTION get_beach_payment_requests(authority_id UUID)
RETURNS TABLE(
  request_id UUID,
  merchant_phone TEXT,
  business_name TEXT,
  coins_amount INTEGER,
  amount_requested DECIMAL,
  status TEXT,
  created_at TIMESTAMP WITH TIME ZONE
) AS $$
DECLARE
  authority_beach TEXT;
BEGIN
  -- Get authority's assigned beach
  SELECT assigned_beach_id INTO authority_beach
  FROM users
  WHERE id = authority_id AND role = 'beach_authority';
  
  IF authority_beach IS NULL THEN
    RETURN;
  END IF;
  
  -- Return payment requests from merchants in assigned beach
  RETURN QUERY
  SELECT 
    pr.request_id,
    u.phone_number as merchant_phone,
    bm.business_name,
    pr.coins_amount,
    pr.amount_requested,
    pr.status,
    pr.created_at
  FROM payment_requests pr
  JOIN users u ON pr.merchant_id = u.id
  JOIN beach_merchants bm ON bm.merchant_id = u.id
  WHERE bm.beach_id = authority_beach
    AND bm.is_active = true
  ORDER BY pr.created_at DESC;
END;
$$ LANGUAGE plpgsql;