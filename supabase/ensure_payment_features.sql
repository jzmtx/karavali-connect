-- Ensure Payment Features Exist
-- Run this in Supabase SQL Editor

-- 1. Payment Requests Table
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

-- 2. Indexes
CREATE INDEX IF NOT EXISTS idx_payment_requests_merchant ON payment_requests(merchant_id);
CREATE INDEX IF NOT EXISTS idx_payment_requests_status ON payment_requests(status);

-- 3. Function to get payment requests for beach authority
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

-- 4. Grant permissions (if needed)
GRANT ALL ON payment_requests TO authenticated;
GRANT ALL ON payment_requests TO service_role;
