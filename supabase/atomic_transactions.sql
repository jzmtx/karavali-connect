-- Atomic transaction functions for Karavali Connect
-- Run this in your Supabase SQL Editor after the main schema

-- Function for atomic merchant redemption
CREATE OR REPLACE FUNCTION process_merchant_redemption(
  merchant_id_param UUID,
  user_id_param UUID,
  coins_param INTEGER,
  bill_amount_param DECIMAL(10,2),
  discount_amount_param DECIMAL(10,2)
)
RETURNS JSON AS $$
DECLARE
  redemption_id UUID;
  result JSON;
BEGIN
  -- Start transaction
  BEGIN
    -- Check if user has enough coins
    IF (SELECT coin_balance FROM users WHERE id = user_id_param) < coins_param THEN
      RETURN json_build_object('success', false, 'error', 'Insufficient coins');
    END IF;

    -- Create redemption record
    INSERT INTO merchant_redemptions (
      merchant_id, user_id, coins_deducted, bill_amount, 
      discount_amount, status, user_confirmed, confirmed_at
    ) VALUES (
      merchant_id_param, user_id_param, coins_param, bill_amount_param,
      discount_amount_param, 'confirmed', true, NOW()
    ) RETURNING redemption_id INTO redemption_id;

    -- Deduct coins from user
    UPDATE users 
    SET coin_balance = coin_balance - coins_param 
    WHERE id = user_id_param;

    -- Add coins to merchant
    UPDATE users 
    SET merchant_coins = merchant_coins + coins_param 
    WHERE id = merchant_id_param;

    -- Create transaction record
    INSERT INTO transactions (
      user_id, merchant_id, type, coins_amount, 
      bill_amount, discount_amount, description
    ) VALUES (
      user_id_param, merchant_id_param, 'merchant_redemption', 
      coins_param, bill_amount_param, discount_amount_param,
      'Redeemed at merchant - Confirmed'
    );

    -- Return success
    result := json_build_object(
      'success', true, 
      'redemption_id', redemption_id,
      'message', 'Redemption processed successfully'
    );
    
    RETURN result;

  EXCEPTION WHEN OTHERS THEN
    -- Rollback happens automatically
    RETURN json_build_object('success', false, 'error', SQLERRM);
  END;
END;
$$ LANGUAGE plpgsql;

-- Function for atomic QR scan processing
CREATE OR REPLACE FUNCTION process_qr_scan(
  bin_id_param TEXT,
  user_id_param UUID,
  scan_lat DECIMAL(10,8),
  scan_lng DECIMAL(11,8),
  coins_param INTEGER DEFAULT 10
)
RETURNS JSON AS $$
DECLARE
  result JSON;
  bin_status TEXT;
BEGIN
  -- Start transaction
  BEGIN
    -- Get bin status
    SELECT status INTO bin_status FROM bins WHERE bin_id = bin_id_param;
    
    -- Record QR scan
    INSERT INTO bin_qr_scans (
      bin_id, user_id, scan_location_lat, scan_location_lng,
      verified, coins_awarded
    ) VALUES (
      bin_id_param, user_id_param, scan_lat, scan_lng, true, coins_param
    );

    -- Award coins
    UPDATE users 
    SET coin_balance = coin_balance + coins_param 
    WHERE id = user_id_param;

    -- Create transaction
    INSERT INTO transactions (
      user_id, type, coins_amount, description
    ) VALUES (
      user_id_param, 'earned', coins_param, 
      'Bin QR scan verified - ' || bin_id_param
    );

    -- Update bin status if empty
    IF bin_status = 'empty' THEN
      UPDATE bins 
      SET status = 'full', 
          last_reported_time = NOW(), 
          last_reported_by = user_id_param
      WHERE bin_id = bin_id_param;
    END IF;

    -- Return success
    result := json_build_object(
      'success', true,
      'coins_awarded', coins_param,
      'message', 'QR scan processed successfully'
    );
    
    RETURN result;

  EXCEPTION WHEN OTHERS THEN
    -- Rollback happens automatically
    RETURN json_build_object('success', false, 'error', SQLERRM);
  END;
END;
$$ LANGUAGE plpgsql;