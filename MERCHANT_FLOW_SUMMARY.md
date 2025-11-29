# Merchant Flow Summary 🏪

## Complete Merchant Redemption Process

### 1. QR Code Scanning
- **Merchant scans customer's QR code** using the built-in QR scanner
- QR code contains encrypted user data with timestamp validation (45-second expiry)
- System verifies QR authenticity against database records
- Customer details are displayed including available coin balance

### 2. Bill Entry & Coin Calculation
- **Merchant enters bill amount** (e.g., ₹500)
- **System automatically calculates maximum coins** customer can use:
  - `maxCoins = Math.min(Math.floor(billAmount), customerCoinBalance)`
  - Example: Bill ₹500, Customer has 300 coins → Use 300 coins
  - Example: Bill ₹200, Customer has 500 coins → Use 200 coins
- **Merchant sets discount percentage** (default 10%)
- **Real-time preview shows:**
  - Bill amount: ₹500
  - Customer coins available: 300
  - Coins to use: 300
  - Discount (10%): ₹30
  - Final amount: ₹470

### 3. Customer Confirmation & Processing
- **Customer confirms the discount** (UI shows transaction details)
- **Atomic transaction processing:**
  - Deducts coins from customer balance
  - Adds merchant coins to merchant account (1:1 ratio)
  - Creates transaction records
  - Updates redemption status to 'confirmed'
- **Success message displayed** with transaction summary

### 4. Merchant Coin Management
- **Merchant accumulates coins** from customer redemptions
- **Conversion rate:** 1 merchant coin = ₹0.10
- **Payment request system:**
  - Merchant can request payment anytime
  - Enters number of coins to convert
  - System calculates payment amount
  - Request sent to beach authority for approval

### 5. Payment Request Workflow
- **Status tracking:**
  - `pending` → Submitted to authority
  - `approved` → Authority approved payment
  - `paid` → Payment completed
  - `rejected` → Request denied
- **Authority portal** manages all payment requests
- **Merchant dashboard** shows request history and status

## Key Features Implemented

### ✅ Responsive Navigation
- **Desktop:** Full navigation bar with user info and logout
- **Mobile:** Collapsible hamburger menu with touch-optimized design
- **Dark red gradient theme** with glass morphism effects

### ✅ Atomic Transactions
- **Database functions** prevent double-spending
- **Race condition protection** with proper locking
- **Rollback capability** on transaction failures

### ✅ Real-time Updates
- **Live coin balance** updates after each transaction
- **Payment request status** tracking
- **Error handling** with user-friendly messages

### ✅ Security Features
- **QR code expiration** (45-second window)
- **Database verification** of QR authenticity
- **Input validation** for all form fields
- **SQL injection protection** with parameterized queries

## Database Tables Used

### `merchant_redemptions`
- Tracks all coin redemption transactions
- Links merchant, customer, and transaction details
- Stores confirmation status and timestamps

### `payment_requests`
- Manages merchant payment requests to authority
- Tracks approval workflow and payment status
- Conversion rate and amount calculations

### `transactions`
- Complete audit trail of all coin movements
- Links to users, merchants, and transaction types
- Supports reporting and analytics

## User Experience Flow

1. **Customer generates QR** → Shows coin balance
2. **Merchant scans QR** → Validates and shows customer info
3. **Merchant enters bill** → System calculates optimal coin usage
4. **Customer confirms** → Sees discount and final amount
5. **Transaction processes** → Atomic database operations
6. **Both parties updated** → Coins transferred, records created
7. **Merchant requests payment** → Converts coins to cash requests
8. **Authority approves** → Payment processed to merchant

## Technical Implementation

### Frontend (React + Tailwind)
- Responsive design with mobile-first approach
- Glass morphism cards with dark red gradient theme
- Real-time form validation and preview calculations
- QR scanner integration with camera access

### Backend (Supabase)
- PostgreSQL with atomic transaction functions
- Row-level security for data protection
- Real-time subscriptions for live updates
- Comprehensive indexing for performance

### Security & Performance
- Input sanitization and validation
- Optimistic UI updates with error handling
- Efficient database queries with proper indexing
- Memory leak prevention in React components

This complete flow ensures secure, efficient, and user-friendly merchant operations while maintaining data integrity and providing excellent user experience across all devices.