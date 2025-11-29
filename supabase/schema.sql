-- Karavali Connect Database Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users Table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone_number TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('tourist', 'merchant', 'admin')),
  coin_balance INTEGER DEFAULT 0,
  pending_coins INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bins Table
CREATE TABLE IF NOT EXISTS bins (
  bin_id TEXT PRIMARY KEY,
  qr_code TEXT UNIQUE NOT NULL,
  gps_lat DECIMAL(10, 8) NOT NULL,
  gps_lng DECIMAL(11, 8) NOT NULL,
  status TEXT DEFAULT 'empty' CHECK (status IN ('empty', 'full', 'cleared')),
  last_reported_time TIMESTAMP WITH TIME ZONE,
  last_reported_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reports Table
CREATE TABLE IF NOT EXISTS reports (
  report_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  bin_id TEXT REFERENCES bins(bin_id),
  type TEXT NOT NULL CHECK (type IN ('net', 'bin', 'cleanup', 'danger', 'dispose')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'cleared', 'rejected')),
  gps_lat DECIMAL(10, 8),
  gps_lng DECIMAL(11, 8),
  image_before_url TEXT,
  image_after_url TEXT,
  description TEXT,
  coins_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions Table
CREATE TABLE IF NOT EXISTS transactions (
  tx_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id),
  merchant_id UUID REFERENCES users(id),
  type TEXT NOT NULL CHECK (type IN ('earned', 'redeemed', 'pending_to_verified')),
  coins_amount INTEGER NOT NULL,
  description TEXT,
  bill_amount DECIMAL(10, 2),
  discount_amount DECIMAL(10, 2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User QR Codes (for dynamic QR generation)
CREATE TABLE IF NOT EXISTS user_qr_codes (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  qr_secret TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Safety Pins Table (for danger reporting)
CREATE TABLE IF NOT EXISTS safety_pins (
  pin_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gps_lat DECIMAL(10, 8) NOT NULL,
  gps_lng DECIMAL(11, 8) NOT NULL,
  report_count INTEGER DEFAULT 1,
  danger_level TEXT DEFAULT 'low' CHECK (danger_level IN ('low', 'medium', 'high', 'critical')),
  last_reported_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_bins_status ON bins(status);
CREATE INDEX IF NOT EXISTS idx_bins_last_reported ON bins(last_reported_time);
CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_transactions_user ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_safety_pins_location ON safety_pins(gps_lat, gps_lng);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- RPC Functions for coin management

-- Increment coin balance
CREATE OR REPLACE FUNCTION increment_coins(user_id_param UUID, coins_param INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET coin_balance = coin_balance + coins_param
  WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql;

-- Increment pending coins
CREATE OR REPLACE FUNCTION increment_pending_coins(user_id_param UUID, coins_param INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET pending_coins = pending_coins + coins_param
  WHERE id = user_id_param;
END;
$$ LANGUAGE plpgsql;

-- Decrement coin balance
CREATE OR REPLACE FUNCTION decrement_coins(user_id_param UUID, coins_param INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET coin_balance = coin_balance - coins_param
  WHERE id = user_id_param AND coin_balance >= coins_param;
END;
$$ LANGUAGE plpgsql;

-- Move pending coins to balance (when bin is cleared)
CREATE OR REPLACE FUNCTION move_pending_to_balance(user_id_param UUID, coins_param INTEGER)
RETURNS VOID AS $$
BEGIN
  UPDATE users
  SET 
    pending_coins = pending_coins - coins_param,
    coin_balance = coin_balance + coins_param
  WHERE id = user_id_param AND pending_coins >= coins_param;
END;
$$ LANGUAGE plpgsql;

-- Add merchant_coins column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS merchant_coins INTEGER DEFAULT 0;

-- Merchant Redemptions Table
CREATE TABLE IF NOT EXISTS merchant_redemptions (
  redemption_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES users(id),
  user_id UUID NOT NULL REFERENCES users(id),
  coins_deducted INTEGER NOT NULL,
  bill_amount DECIMAL(10, 2) NOT NULL,
  discount_amount DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
  user_confirmed BOOLEAN DEFAULT false,
  confirmed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment Requests Table (for merchants to request payment from authority)
CREATE TABLE IF NOT EXISTS payment_requests (
  request_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  merchant_id UUID NOT NULL REFERENCES users(id),
  coins_amount INTEGER NOT NULL,
  amount_requested DECIMAL(10, 2) NOT NULL,
  conversion_rate DECIMAL(5, 3) DEFAULT 0.10,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'paid', 'rejected')),
  approved_by UUID REFERENCES users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bin QR Scans Table (for tracking QR scans)
CREATE TABLE IF NOT EXISTS bin_qr_scans (
  scan_id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  bin_id TEXT NOT NULL REFERENCES bins(bin_id),
  user_id UUID NOT NULL REFERENCES users(id),
  scan_location_lat DECIMAL(10, 8),
  scan_location_lng DECIMAL(11, 8),
  verified BOOLEAN DEFAULT false,
  coins_awarded INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for new tables
CREATE INDEX IF NOT EXISTS idx_merchant_redemptions_merchant ON merchant_redemptions(merchant_id);
CREATE INDEX IF NOT EXISTS idx_merchant_redemptions_user ON merchant_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_merchant ON payment_requests(merchant_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);
CREATE INDEX IF NOT EXISTS idx_bin_qr_scans_bin ON bin_qr_scans(bin_id);
CREATE INDEX IF NOT EXISTS idx_bin_qr_scans_user ON bin_qr_scans(user_id);

