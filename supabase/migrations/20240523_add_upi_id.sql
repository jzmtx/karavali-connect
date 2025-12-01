-- Add upi_id column to payment_requests table
ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS upi_id TEXT;

-- Comment on column
COMMENT ON COLUMN payment_requests.upi_id IS 'UPI ID provided by the merchant for payment';
