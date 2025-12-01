-- Seed Test Data for User Testing
-- Location: 12.898705, 74.984711

-- 1. Insert Test Beach
INSERT INTO beaches (beach_id, name, district, gps_lat, gps_lng, status)
VALUES (
  'test_beach_location',
  'Test Beach Location',
  'Test District',
  12.898705,
  74.984711,
  'active'
) ON CONFLICT (beach_id) DO NOTHING;

-- 2. Insert Test Users
-- Merchant
INSERT INTO users (phone_number, password_hash, role, coin_balance, pending_coins, created_at)
VALUES (
  '9999999901',
  'password',
  'merchant',
  1000,
  0,
  NOW()
) ON CONFLICT (phone_number) DO NOTHING;

-- Municipality (Assigned to Test Beach)
INSERT INTO users (phone_number, password_hash, role, coin_balance, pending_coins, assigned_beach_id, created_at)
VALUES (
  '9999999902',
  'password',
  'municipality',
  0,
  0,
  'test_beach_location',
  NOW()
) ON CONFLICT (phone_number) DO NOTHING;

-- Beach Authority (Assigned to Test Beach)
INSERT INTO users (phone_number, password_hash, role, coin_balance, pending_coins, assigned_beach_id, created_at)
VALUES (
  '9999999903',
  'password',
  'beach_authority',
  0,
  0,
  'test_beach_location',
  NOW()
) ON CONFLICT (phone_number) DO NOTHING;

-- 3. Insert Test Bin
INSERT INTO bins (bin_id, qr_code, gps_lat, gps_lng, status, beach_id, created_at)
VALUES (
  'BIN-TEST-001',
  'karavali-bin-test-001',
  12.898705,
  74.984711,
  'empty',
  'test_beach_location',
  NOW()
) ON CONFLICT (bin_id) DO NOTHING;
