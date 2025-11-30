-- Fix merchant_redemptions table - Add missing beach_id column
-- Run this in your Supabase SQL Editor

-- Add beach_id column to merchant_redemptions table
ALTER TABLE merchant_redemptions 
ADD COLUMN IF NOT EXISTS beach_id TEXT REFERENCES beaches(beach_id);

-- Update existing records to have beach_id based on merchant's registered beach
UPDATE merchant_redemptions 
SET beach_id = (
  SELECT bm.beach_id 
  FROM beach_merchants bm 
  WHERE bm.merchant_id = merchant_redemptions.merchant_id 
  LIMIT 1
)
WHERE beach_id IS NULL;

-- Create or replace the merchant redemption function with beach tracking
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
  result_json JSON;
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
  
  -- Start transaction
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
    -- Rollback handled automatically
    RETURN JSON_BUILD_OBJECT(
      'success', false,
      'error', 'Transaction failed: ' || SQLERRM
    );
  END;
END;
$$ LANGUAGE plpgsql;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_merchant_redemptions_beach_id 
ON merchant_redemptions(beach_id);

-- Create index for merchant_redemptions merchant_id if not exists
CREATE INDEX IF NOT EXISTS idx_merchant_redemptions_merchant_id 
ON merchant_redemptions(merchant_id);