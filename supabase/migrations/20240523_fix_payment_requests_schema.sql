-- Add missing columns to payment_requests table if they don't exist
ALTER TABLE payment_requests 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id);

-- Comment on columns
COMMENT ON COLUMN payment_requests.approved_at IS 'Timestamp when the request was approved';
COMMENT ON COLUMN payment_requests.approved_by IS 'Authority who approved the request';
