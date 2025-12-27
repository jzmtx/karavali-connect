-- Seed Test Data for User Testing
-- This file is now deprecated - use test_setup.sql instead
-- Location: 12.900792, 74.987995

-- Delete old test users from this file
DELETE FROM users WHERE phone_number IN (
  '9999999901', '9999999902', '9999999903', '9999999904'
);

-- Note: All test users are now managed in test_setup.sql
-- Run test_setup.sql instead of this file for the latest test data

SELECT 'DEPRECATED: Use test_setup.sql instead' as notice,
       'This file has been deprecated in favor of test_setup.sql' as message,
       'All old test users (9999999901-9999999904) have been deleted' as cleanup_status;
