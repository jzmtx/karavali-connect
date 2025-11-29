-- Additional schema updates for QR code verification and payment system
-- Run this AFTER the main schema.sql

-- Add merchant coin balance column
ALTER TABLE users ADD COLUMN IF NOT EXISTS merchant_coins INTEGER DEFAULT 0;

-- Payment Requests Table
CREATE TABLE IF NOT EXISTS payment_requests (
  request_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES users(id),
  coins_amount INTEGER NOT NULL,
  amount_requested DECIMAL(10, 2) NOT NULL,
  conversion_rate DECIMAL(10, 4) DEFAULT 0.10, -- 1 coin = ₹0.10
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  approved_by UUID REFERENCES users(id),
  payment_proof_url TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bin QR Verification Table (tracks QR scans for verification)
CREATE TABLE IF NOT EXISTS bin_qr_scans (
  scan_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bin_id TEXT NOT NULL REFERENCES bins(bin_id),
  user_id UUID NOT NULL REFERENCES users(id),
  scan_location_lat DECIMAL(10, 8),
  scan_location_lng DECIMAL(11, 8),
  verified BOOLEAN DEFAULT false,
  coins_awarded INTEGER DEFAULT 0,
  scanned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Merchant Redemption Requests (for user QR scans with confirmation)
CREATE TABLE IF NOT EXISTS merchant_redemptions (
  redemption_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES users(id),
  user_id UUID NOT NULL REFERENCES users(id),
  coins_deducted INTEGER NOT NULL,
  user_confirmed BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled')),
  bill_amount DECIMAL(10, 2),
  discount_amount DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  confirmed_at TIMESTAMP WITH TIME ZONE
);

-- Update transactions table to include merchant_redemption type
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check 
  CHECK (type IN ('earned', 'redeemed', 'pending_to_verified', 'merchant_redemption', 'merchant_earned'));

-- Indexes
CREATE INDEX IF NOT EXISTS idx_payment_requests_merchant ON payment_requests(merchant_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_bin_qr_scans_bin ON bin_qr_scans(bin_id);
CREATE INDEX IF NOT EXISTS idx_bin_qr_scans_user ON bin_qr_scans(user_id);
CREATE INDEX IF NOT EXISTS idx_merchant_redemptions_merchant ON merchant_redemptions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_redemptions_user ON merchant_redemptions(user_id);

-- RPC Function: Add coins to merchant
CREATE OR REPLACE FUNCTION increment_merchant_coins(merchant_id_param UUID, coins_param INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET merchant_coins = merchant_coins + coins_param
  WHERE id = merchant_id_param AND role = 'merchant';
END;
$$ LANGUAGE plpgsql;

-- RPC Function: Deduct coins from merchant
CREATE OR REPLACE FUNCTION decrement_merchant_coins(merchant_id_param UUID, coins_param INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET merchant_coins = merchant_coins - coins_param
  WHERE id = merchant_id_param AND merchant_coins >= coins_param AND role = 'merchant';
END;
$$ LANGUAGE plpgsql;

-- Trigger for payment_requests updated_at
CREATE TRIGGER update_payment_requests_updated_at BEFORE UPDATE ON payment_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
