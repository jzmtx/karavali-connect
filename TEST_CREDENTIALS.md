# 🧪 Karavali Connect - Test Credentials

## 🌐 Live Application
**URL:** https://karavali-connect2-cvaqzf7p1-jasmith-k-ps-projects.vercel.app

## 👥 Test User Accounts

### 🏖️ **Tourist/User Account**
- **Phone:** `1234567890`
- **Password:** `test123`
- **Role:** Tourist
- **Features:** Report bins, beach cleanup, earn coins, redeem at merchants

### 🏪 **Merchant Account**
- **Phone:** `1234567891`
- **Password:** `test123`
- **Role:** Merchant
- **Features:** Beach registration, scan customer QR codes, payment requests

### 🏛️ **Beach Authority Account**
- **Phone:** `1234567892`
- **Password:** `test123`
- **Role:** Beach Authority
- **Features:** Beach assignment, approve payments, manage safety reports

### 🏢 **Municipality Account**
- **Phone:** `1234567893`
- **Password:** `test123`
- **Role:** Municipality
- **Features:** Beach assignment, bin management, bin reports

### 👑 **Admin Account**
- **Phone:** `1234567894`
- **Password:** `test123`
- **Role:** Admin
- **Features:** Full system access, user management, all reports

## 🏖️ Test Beach Location
- **Beach ID:** `test_beach`
- **Name:** Test Beach (Your Location)
- **Coordinates:** `12.3508111, 76.6123884`
- **Radius:** 5km (for easy testing)

## 🗑️ Test Bin
- **Bin ID:** `TEST_BIN_001`
- **Location:** Same as test beach
- **QR Code:** Available for download in Municipality dashboard

## 🧪 Testing Instructions

### 1. **Setup Database** (Run in Supabase SQL Editor)
```sql
-- Copy and paste content from supabase/update_test_location.sql
-- This creates all test users and beach data
```

### 2. **Login Process**
1. Go to the live URL
2. Click "Get Started" or navigate to `/login`
3. Select role (Tourist or Authority)
4. Enter phone number and password from above
5. Click Login

### 3. **Test Scenarios**

#### **Tourist Testing:**
- Login as tourist (`1234567890`)
- Update location (will work anywhere due to test mode)
- Report bins, participate in cleanup activities
- Earn coins and check wallet
- Generate QR code for merchant scanning

#### **Merchant Testing:**
- Login as merchant (`1234567891`)
- Register business at test beach
- Scan tourist QR codes
- Process coin redemptions
- Request payments from earned coins

#### **Authority Testing:**
- Login as any authority account
- Assign to test beach (one-time only)
- Review and approve reports
- Manage payment requests
- Access role-specific features

## 🔧 Test Mode Features
- **Location Bypass:** Test beach accepts any GPS location
- **Permanent Access:** No location expiry for testing
- **Pre-loaded Data:** Users, beach, and bin already configured
- **QR Codes:** Ready for merchant-tourist interactions

## 📱 Mobile Testing
- All accounts work on mobile devices
- Touch-optimized interface
- Professional sidebar navigation
- Responsive design for all screen sizes

---
**Note:** These are test accounts for development/demo purposes only.