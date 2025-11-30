# 🔧 Database Fix Instructions

## Issue
The merchant redemption is failing because the `merchant_redemptions` table is missing the `beach_id` column.

## Quick Fix

### Step 1: Run the Complete Schema Fix
1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/complete_schema_fix.sql`
4. Click **Run** to execute the script

### Step 2: Verify the Fix
Run this query to check if the column was added:
```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'merchant_redemptions';
```

You should see `beach_id` in the results.

### Step 3: Test the Application
1. Try the merchant QR scanning feature
2. The redemption should now work without errors

## What the Fix Does

1. **Adds missing `beach_id` column** to `merchant_redemptions` table
2. **Updates existing records** to populate the beach_id based on merchant registration
3. **Fixes the redemption function** to properly handle beach tracking
4. **Adds necessary indexes** for better performance
5. **Ensures all tables** have the correct structure

## Alternative Quick Fix (If above doesn't work)

If you're still getting errors, run just this command:

```sql
ALTER TABLE merchant_redemptions 
ADD COLUMN IF NOT EXISTS beach_id TEXT REFERENCES beaches(beach_id);
```

Then run the merchant redemption function fix from `supabase/fix_merchant_redemptions.sql`.

## Verification

After running the fix, test by:
1. Login as a merchant
2. Scan a user's QR code
3. Process a redemption
4. Should complete successfully without errors

The error "column beach_id does not exist" should be resolved! ✅