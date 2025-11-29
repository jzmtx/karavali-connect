# 🔐 How to Access Admin Panel

## Method 1: Create Admin User via Database (Recommended)

1. **Go to Supabase Dashboard** → SQL Editor
2. **Run this SQL**:
```sql
INSERT INTO users (phone_number, name, email, role, password_hash, coin_balance, pending_coins)
VALUES ('+91 7777777777', 'Admin User', 'admin@karavali.com', 'admin', 'admin123', 0, 0)
ON CONFLICT (phone_number) DO UPDATE SET role = 'admin';
```

3. **Login with**:
   - Phone: `7777777777`
   - Password: `admin123`

4. **You'll be redirected to Admin Panel** automatically!

---

## Method 2: Use Admin Panel to Create Admin

If you already have an admin account:

1. **Login as Admin** (using Method 1 credentials)
2. **Go to Admin Panel** → "Create User" tab
3. **Fill in details**:
   - Name: Your name
   - Phone: Your phone number
   - Email: Your email (optional)
   - Role: **Select "Admin"**
4. **Click "Create User"**
5. **Login with the new admin credentials**

---

## Method 3: Update Existing User to Admin

1. **Go to Supabase Dashboard** → Table Editor → `users`
2. **Find your user** (by phone number)
3. **Edit the row**:
   - Change `role` to `admin`
   - Set `password_hash` to your password (if not set)
4. **Save**
5. **Login with your phone and password**

---

## Quick Demo Access

On the Login page, click **"👑 Fill Admin Demo"** button to auto-fill:
- Phone: `7777777777`
- Password: `admin123`

Then click **Login**.

---

## Admin Panel Features

Once logged in as admin, you can:
- ✅ View all users
- ✅ Create new users (Tourist, Merchant, Municipality, Beach Authority, Forest Department, **Admin**)
- ✅ Delete users (except admin)
- ✅ See all user details and coin balances

---

## Security Note

⚠️ **Important**: In production, passwords should be hashed using bcrypt or similar. Currently, passwords are stored as plain text for demo purposes only.

