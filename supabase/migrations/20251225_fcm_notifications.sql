-- Migration: Add Firebase Cloud Messaging Support
-- Created: 2025-12-25
-- Description: Add FCM token storage and notification history tables

-- Add FCM token column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS fcm_token TEXT;

-- Create index for faster FCM token lookups
CREATE INDEX IF NOT EXISTS idx_users_fcm_token ON users(fcm_token) WHERE fcm_token IS NOT NULL;

-- Create notifications table for notification history
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('safety_report', 'payment_request', 'bin_overflow', 'rescue_request', 'ghost_net', 'general')),
  data JSONB DEFAULT '{}'::jsonb,
  read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(user_id, read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Create pending FCM notifications queue
CREATE TABLE IF NOT EXISTS pending_fcm_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tokens TEXT[] NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb,
  processed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP
);

-- Create index for pending notifications
CREATE INDEX IF NOT EXISTS idx_pending_fcm_processed ON pending_fcm_notifications(processed) WHERE NOT processed;

-- Function to notify authorities on safety report
CREATE OR REPLACE FUNCTION notify_authorities_on_safety_report()
RETURNS TRIGGER AS $$
DECLARE
  authority_record RECORD;
BEGIN
  -- Insert notification for each authority
  FOR authority_record IN 
    SELECT id FROM users 
    WHERE role IN ('beach_authority', 'admin', 'fisheries_department')
    AND fcm_token IS NOT NULL
  LOOP
    INSERT INTO notifications (user_id, title, body, type, data)
    VALUES (
      authority_record.id,
      '🚨 New Safety Report',
      'A new ' || NEW.type || ' report has been submitted',
      'safety_report',
      jsonb_build_object(
        'report_id', NEW.report_id,
        'type', NEW.type,
        'url', '/authority'
      )
    );
  END LOOP;

  -- Queue FCM notification
  INSERT INTO pending_fcm_notifications (tokens, title, body, data)
  SELECT 
    ARRAY_AGG(fcm_token),
    '🚨 New Safety Report',
    'A new ' || NEW.type || ' report has been submitted',
    jsonb_build_object(
      'type', 'safety_report',
      'report_id', NEW.report_id,
      'url', '/authority'
    )
  FROM users
  WHERE role IN ('beach_authority', 'admin', 'fisheries_department')
    AND fcm_token IS NOT NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for safety reports
DROP TRIGGER IF EXISTS on_safety_report_created ON reports;
CREATE TRIGGER on_safety_report_created
AFTER INSERT ON reports
FOR EACH ROW
WHEN (NEW.type IN ('danger', 'dispose'))
EXECUTE FUNCTION notify_authorities_on_safety_report();

-- Function to notify authorities on payment request
CREATE OR REPLACE FUNCTION notify_authorities_on_payment_request()
RETURNS TRIGGER AS $$
DECLARE
  merchant_name TEXT;
  authority_record RECORD;
BEGIN
  -- Get merchant phone number (or name if available)
  SELECT COALESCE(name, phone_number) INTO merchant_name 
  FROM users WHERE id = NEW.merchant_id;

  -- Insert notification for each beach authority
  FOR authority_record IN 
    SELECT id FROM users 
    WHERE role IN ('beach_authority', 'admin')
    AND fcm_token IS NOT NULL
  LOOP
    INSERT INTO notifications (user_id, title, body, type, data)
    VALUES (
      authority_record.id,
      '💰 New Payment Request',
      merchant_name || ' requested payment of ₹' || NEW.amount_requested,
      'payment_request',
      jsonb_build_object(
        'payment_request_id', NEW.request_id,
        'merchant_id', NEW.merchant_id,
        'amount', NEW.amount_requested,
        'url', '/authority'
      )
    );
  END LOOP;

  -- Queue FCM notification
  INSERT INTO pending_fcm_notifications (tokens, title, body, data)
  SELECT 
    ARRAY_AGG(fcm_token),
    '💰 New Payment Request',
    merchant_name || ' requested payment of ₹' || NEW.amount_requested,
    jsonb_build_object(
      'type', 'payment_request',
      'payment_request_id', NEW.request_id,
      'url', '/authority'
    )
  FROM users
  WHERE role IN ('beach_authority', 'admin')
    AND fcm_token IS NOT NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for payment requests
DROP TRIGGER IF EXISTS on_payment_request_created ON payment_requests;
CREATE TRIGGER on_payment_request_created
AFTER INSERT ON payment_requests
FOR EACH ROW
EXECUTE FUNCTION notify_authorities_on_payment_request();

-- Function to notify municipality on bin overflow
CREATE OR REPLACE FUNCTION notify_municipality_on_bin_full()
RETURNS TRIGGER AS $$
DECLARE
  authority_record RECORD;
BEGIN
  -- Only notify when status changes to 'full'
  IF NEW.status = 'full' AND (OLD.status IS NULL OR OLD.status != 'full') THEN
    -- Insert notification for each municipality user
    FOR authority_record IN 
      SELECT id FROM users 
      WHERE role IN ('municipality', 'admin')
      AND fcm_token IS NOT NULL
    LOOP
      INSERT INTO notifications (user_id, title, body, type, data)
      VALUES (
        authority_record.id,
        '🗑️ Bin Full Alert',
        'Bin ' || NEW.bin_id || ' is now full and needs attention',
        'bin_overflow',
        jsonb_build_object(
          'bin_id', NEW.id,
          'bin_number', NEW.bin_id,
          'url', '/authority'
        )
      );
    END LOOP;

    -- Queue FCM notification
    INSERT INTO pending_fcm_notifications (tokens, title, body, data)
    SELECT 
      ARRAY_AGG(fcm_token),
      '🗑️ Bin Full Alert',
      'Bin ' || NEW.bin_id || ' is now full and needs attention',
      jsonb_build_object(
        'type', 'bin_overflow',
        'bin_id', NEW.id,
        'url', '/authority'
      )
    FROM users
    WHERE role IN ('municipality', 'admin')
      AND fcm_token IS NOT NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for bin status updates
DROP TRIGGER IF EXISTS on_bin_status_changed ON bins;
CREATE TRIGGER on_bin_status_changed
AFTER UPDATE ON bins
FOR EACH ROW
EXECUTE FUNCTION notify_municipality_on_bin_full();

-- Function to notify forest department on rescue/ghost net reports
CREATE OR REPLACE FUNCTION notify_forest_on_rescue_report()
RETURNS TRIGGER AS $$
DECLARE
  authority_record RECORD;
  report_title TEXT;
BEGIN
  -- Determine report title
  IF NEW.type = 'net' THEN
    report_title := '🌊 New Ghost Net Report';
  ELSE
    report_title := '🆘 New Report';
  END IF;

  -- Insert notification for each forest department user
  FOR authority_record IN 
    SELECT id FROM users 
    WHERE role IN ('fisheries_department', 'admin')
    AND fcm_token IS NOT NULL
  LOOP
    INSERT INTO notifications (user_id, title, body, type, data)
    VALUES (
      authority_record.id,
      report_title,
      'A new ' || NEW.type || ' report requires attention',
      CASE WHEN NEW.type = 'net' THEN 'ghost_net' ELSE 'rescue_request' END,
      jsonb_build_object(
        'report_id', NEW.report_id,
        'type', NEW.type,
        'url', '/authority'
      )
    );
  END LOOP;

  -- Queue FCM notification
  INSERT INTO pending_fcm_notifications (tokens, title, body, data)
  SELECT 
    ARRAY_AGG(fcm_token),
    report_title,
    'A new ' || NEW.type || ' report requires attention',
    jsonb_build_object(
      'type', CASE WHEN NEW.type = 'net' THEN 'ghost_net' ELSE 'rescue_request' END,
      'report_id', NEW.report_id,
      'url', '/authority'
    )
  FROM users
  WHERE role IN ('fisheries_department', 'admin')
    AND fcm_token IS NOT NULL;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for rescue and ghost net reports
DROP TRIGGER IF EXISTS on_rescue_report_created ON reports;
CREATE TRIGGER on_rescue_report_created
AFTER INSERT ON reports
FOR EACH ROW
WHEN (NEW.type = 'net')
EXECUTE FUNCTION notify_forest_on_rescue_report();

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON notifications TO anon, authenticated;
GRANT SELECT, INSERT ON pending_fcm_notifications TO anon, authenticated;

COMMENT ON TABLE notifications IS 'Stores notification history for users';
COMMENT ON TABLE pending_fcm_notifications IS 'Queue for FCM notifications to be sent by backend';
COMMENT ON COLUMN users.fcm_token IS 'Firebase Cloud Messaging token for push notifications';
