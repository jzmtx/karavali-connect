-- Complete Schema Fix for Karavali Connect
-- Run this in your Supabase SQL Editor to fix all database issues

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Ensure beaches table exists with proper structure
CREATE TABLE IF NOT EXISTS beaches (
  beach_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  district TEXT,
  gps_lat DECIMAL(10, 8) NOT NULL,
  gps_lng DECIMAL(11, 8) NOT NULL,
  radius_meters INTEGER DEFAULT 1000,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Ensure users table has all required columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS merchant_coins INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS assigned_beach_id TEXT REFERENCES beaches(beach_id);

-- Ensure bins table has beach_id column
ALTER TABLE bins ADD COLUMN IF NOT EXISTS beach_id TEXT REFERENCES beaches(beach_id);

-- Fix merchant_redemptions table
ALTER TABLE merchant_redemptions ADD COLUMN IF NOT EXISTS beach_id TEXT REFERENCES beaches(beach_id);

-- Create beach_merchants table if not exists
CREATE TABLE IF NOT EXISTS beach_merchants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  beach_id TEXT NOT NULL REFERENCES beaches(beach_id),
  business_name TEXT NOT NULL,
  business_type TEXT,
  shop_address TEXT,
  shop_gps_lat DECIMAL(10, 8),
  shop_gps_lng DECIMAL(11, 8),
  contact_phone TEXT,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(merchant_id, beach_id)
);

-- Update existing merchant_redemptions to have beach_id
UPDATE merchant_redemptions 
SET beach_id = (
  SELECT bm.beach_id 
  FROM beach_merchants bm 
  WHERE bm.merchant_id = merchant_redemptions.merchant_id 
  LIMIT 1
)
WHERE beach_id IS NULL;

-- Create or replace the fixed merchant redemption function
CREATE OR REPLACE FUNCTION process_merchant_redemption_with_beach(
  merchant_id_param UUID,
  user_id_param UUID,
  coins_param INTEGER,
  bill_amount_param DECIMAL(10, 2),
  discount_amount_param DECIMAL(10, 2)
)
RETURNS JSON AS $$
DECLARE
  merchant_beach_id TEXT;
  user_balance INTEGER;
BEGIN
  -- Get merchant's beach
  SELECT beach_id INTO merchant_beach_id
  FROM beach_merchants
  WHERE merchant_id = merchant_id_param AND is_active = true
  LIMIT 1;
  
  IF merchant_beach_id IS NULL THEN
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
  
  -- Process transaction atomically
  BEGIN
    -- Deduct coins from user
    UPDATE users
    SET coin_balance = coin_balance - coins_param
    WHERE id = user_id_param;
    
    -- Add merchant coins
    UPDATE users
    SET merchant_coins = merchant_coins + coins_param
    WHERE id = merchant_id_param;
    
    -- Record transaction
    INSERT INTO transactions (
      user_id, merchant_id, type, coins_amount, 
      bill_amount, discount_amount, description
    ) VALUES (
      user_id_param, merchant_id_param, 'redeemed', coins_param,
      bill_amount_param, discount_amount_param,
      'Coin redemption at merchant'
    );
    
    -- Record merchant redemption with beach_id
    INSERT INTO merchant_redemptions (
      merchant_id, user_id, coins_deducted, bill_amount, 
      discount_amount, beach_id, status, user_confirmed
    ) VALUES (
      merchant_id_param, user_id_param, coins_param, bill_amount_param,
      discount_amount_param, merchant_beach_id, 'confirmed', true
    );
    
    RETURN JSON_BUILD_OBJECT(
      'success', true,
      'beach_id', merchant_beach_id,
      'message', 'Redemption processed successfully'
    );
    
  EXCEPTION WHEN OTHERS THEN
    RETURN JSON_BUILD_OBJECT(
      'success', false,
      'error', 'Transaction failed: ' || SQLERRM
    );
  END;
END;
$$ LANGUAGE plpgsql;

-- Create function to get beach merchants
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

-- Create all necessary indexes
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_bins_status ON bins(status);
CREATE INDEX IF NOT EXISTS idx_bins_beach_id ON bins(beach_id);
CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_merchant_redemptions_merchant ON merchant_redemptions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_redemptions_beach_id ON merchant_redemptions(beach_id);
CREATE INDEX IF NOT EXISTS idx_beach_merchants_merchant ON beach_merchants(merchant_id);
CREATE INDEX IF NOT EXISTS idx_beach_merchants_beach ON beach_merchants(beach_id);

-- Insert default test beach if not exists
INSERT INTO beaches (beach_id, name, district, gps_lat, gps_lng, radius_meters, status) 
VALUES ('test_beach', 'Test Beach', 'Test District', 12.3508111, 76.6123884, 2000, 'active')
ON CONFLICT (beach_id) DO NOTHING;