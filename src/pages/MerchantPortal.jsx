import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import QRScanner from '../components/QRScanner'
import Navigation from '../components/Navigation'

export default function MerchantPortal({ user }) {
  const [activeTab, setActiveTab] = useState('scan')
  const [scannedData, setScannedData] = useState(null)
  const [userData, setUserData] = useState(null)
  const [billAmount, setBillAmount] = useState('')
  const [discountPercent, setDiscountPercent] = useState(10)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [merchantCoins, setMerchantCoins] = useState(0)
  const [paymentRequests, setPaymentRequests] = useState([])
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentCoins, setPaymentCoins] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    loadMerchantData()
    loadPaymentRequests()
  }, [user])

  const handleQRScan = async (qrData) => {
    try {
      const data = JSON.parse(qrData)
      
      // Verify QR code is not expired (30 seconds + buffer)
      const qrAge = Date.now() - data.timestamp
      if (qrAge > 45000) { // 45 second buffer (30s + 15s grace)
        setError('QR code expired. Please ask customer to refresh.')
        return
      }

      // Verify secret in database
      const { data: qrRecord } = await supabase
        .from('user_qr_codes')
        .select('*')
        .eq('user_id', data.userId)
        .eq('qr_secret', data.secret)
        .single()

      if (!qrRecord) {
        setError('Invalid QR code. Please ask customer to refresh.')
        return
      }

      // Get user data
      const { data: userInfo } = await supabase
        .from('users')
        .select('*')
        .eq('id', data.userId)
        .single()

      if (!userInfo) {
        setError('User not found')
        return
      }

      setScannedData(data)
      setUserData(userInfo)
      setError('')
    } catch (err) {
      setError('Invalid QR code format')
    }
  }

  const loadMerchantData = async () => {
    if (!user) return
    const { data } = await supabase
      .from('users')
      .select('merchant_coins')
      .eq('id', user.id)
      .single()

    if (data) {
      setMerchantCoins(data.merchant_coins || 0)
    }
  }

  const loadPaymentRequests = async () => {
    if (!user) return
    const { data } = await supabase
      .from('payment_requests')
      .select('*')
      .eq('merchant_id', user.id)
      .order('created_at', { ascending: false })

    if (data) {
      setPaymentRequests(data)
    }
  }

  const handleRedeem = async () => {
    if (!scannedData || !userData || !billAmount) {
      setError('Please scan QR code and enter bill amount')
      return
    }

    const bill = parseFloat(billAmount)
    if (isNaN(bill) || bill <= 0) {
      setError('Please enter a valid bill amount')
      return
    }

    // User decides how many coins to use (up to bill amount and available balance)
    const maxCoinsCanUse = Math.min(Math.floor(bill), userData.coin_balance)
    const coinsToUse = Math.min(maxCoinsCanUse, Math.floor(bill)) // Use all available up to bill amount
    
    if (userData.coin_balance < coinsToUse) {
      setError(`Customer has only ${userData.coin_balance} coins. Need ${coinsToUse} coins.`)
      return
    }

    setLoading(true)
    setError('')

    try {
      const discount = (coinsToUse * discountPercent) / 100 // Calculate discount based on coins used
      const finalAmount = bill - discount

      // Use atomic transaction approach
      const { data: redemption, error: redemptionError } = await supabase
        .from('merchant_redemptions')
        .insert({
          merchant_id: user.id,
          user_id: scannedData.userId,
          coins_deducted: coinsToUse,
          bill_amount: bill,
          discount_amount: discount,
          status: 'pending',
          user_confirmed: false
        })
        .select()
        .single()

      if (redemptionError) throw redemptionError

      // Use atomic transaction function
      const { data: transactionResult, error: transactionError } = await supabase
        .rpc('process_merchant_redemption', {
          merchant_id_param: user.id,
          user_id_param: scannedData.userId,
          coins_param: coinsToUse,
          bill_amount_param: bill,
          discount_amount_param: discount
        })

      if (transactionError) {
        throw new Error(`Transaction failed: ${transactionError.message}`)
      }

      if (!transactionResult.success) {
        throw new Error(transactionResult.error)
      }

      // Delete the pending redemption record since we processed it atomically
      await supabase
        .from('merchant_redemptions')
        .delete()
        .eq('redemption_id', redemption.redemption_id)

      setMessage(`✅ Success! Customer redeemed ${coinsToUse} coins for ₹${discount.toFixed(2)} discount. Final amount: ₹${finalAmount.toFixed(2)}. You earned ${coinsToUse} merchant coins!`)
      setScannedData(null)
      setUserData(null)
      setBillAmount('')
      loadMerchantData()
    } catch (err) {
      setError(err.message || 'Failed to process redemption')
    } finally {
      setLoading(false)
    }
  }

  const submitPaymentRequest = async () => {
    if (!paymentCoins || isNaN(parseInt(paymentCoins))) {
      setError('Please enter a valid number of coins')
      return
    }

    const coins = parseInt(paymentCoins)
    if (coins > merchantCoins) {
      setError(`You only have ${merchantCoins} merchant coins`)
      return
    }

    if (coins <= 0) {
      setError('Please enter a positive number')
      return
    }

    setLoading(true)
    setError('')

    try {
      const conversionRate = 0.10
      const amountRequested = coins * conversionRate

      const { error: requestError } = await supabase
        .from('payment_requests')
        .insert({
          merchant_id: user.id,
          coins_amount: coins,
          amount_requested: amountRequested,
          conversion_rate: conversionRate,
          status: 'pending'
        })

      if (requestError) throw requestError

      setMessage(`✅ Payment request submitted! ₹${amountRequested.toFixed(2)} for ${coins} coins. Waiting for authority approval.`)
      setShowPaymentForm(false)
      setPaymentCoins('')
      loadPaymentRequests()
      loadMerchantData()
    } catch (err) {
      setError(err.message || 'Failed to create payment request')
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('karavali_user')
    window.dispatchEvent(new Event('karavali_user_changed'))
    navigate('/login', { replace: true })
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navigation user={user} currentPage="merchant" />

      {/* Tabs */}
      <div className="tab-nav container">
        <button
          onClick={() => setActiveTab('scan')}
          className={`tab-btn ${activeTab === 'scan' ? 'active' : ''}`}
        >
          📷 Scan QR
        </button>
        <button
          onClick={() => setActiveTab('payments')}
          className={`tab-btn ${activeTab === 'payments' ? 'active' : ''}`}
        >
          💰 Payment Requests
        </button>
      </div>

      <main className="container main-content">
        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {message && (
          <div className="alert alert-success">
            {message}
          </div>
        )}

        {activeTab === 'scan' && (
          <>
            <div className="glass-card">
              <h2>Scan Customer QR Code</h2>
              <QRScanner onScan={handleQRScan} />
            </div>

        {userData && (
          <div className="glass-card">
            <h3>Customer Details</h3>
            <div style={{
              background: 'var(--glass-bg)',
              padding: '1rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              border: '1px solid var(--glass-border)'
            }}>
              <p><strong>Phone:</strong> {userData.phone_number}</p>
              <p><strong>Available Coins:</strong> {userData.coin_balance}</p>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Bill Amount (₹)
              </label>
              <input
                type="number"
                value={billAmount}
                onChange={(e) => setBillAmount(e.target.value)}
                placeholder="500"
                className="form-input"
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Discount Percentage (%)
              </label>
              <input
                type="number"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 10)}
                min="1"
                max="100"
                className="form-input"
              />
            </div>

            {billAmount && !isNaN(parseFloat(billAmount)) && userData && (
              <div className="bg-blue-900/20 border border-blue-500/30 p-4 rounded-lg mb-4 backdrop-blur-sm">
                {(() => {
                  const bill = parseFloat(billAmount)
                  const maxCoins = Math.min(Math.floor(bill), userData.coin_balance)
                  const discount = (maxCoins * discountPercent) / 100
                  const finalAmount = bill - discount
                  return (
                    <>
                      <p className="text-blue-200 mb-1"><strong>Bill:</strong> ₹{bill.toFixed(2)}</p>
                      <p className="text-blue-200 mb-1"><strong>Customer Coins Available:</strong> {userData.coin_balance}</p>
                      <p className="text-blue-200 mb-1"><strong>Coins to Use:</strong> {maxCoins} (max available for this bill)</p>
                      <p className="text-blue-200 mb-1"><strong>Discount ({discountPercent}%):</strong> ₹{discount.toFixed(2)}</p>
                      <p className="text-blue-200"><strong>Final Amount:</strong> ₹{finalAmount.toFixed(2)}</p>
                    </>
                  )
                })()}
              </div>
            )}

            <button
              onClick={handleRedeem}
              disabled={loading || !billAmount || userData.coin_balance === 0}
              className="btn btn-primary"
              style={{
                width: '100%',
                background: loading || !billAmount || userData.coin_balance === 0 ? '#9ca3af' : undefined,
                cursor: loading || !billAmount || userData.coin_balance === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Processing...' : userData.coin_balance === 0 ? 'No Coins Available' : 'Redeem Coins'}
            </button>
          </div>
        )}
        </>)}

        {activeTab === 'payments' && (
          <div className="glass-card p-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h2 className="text-xl font-semibold text-white">💰 Merchant Coins: {merchantCoins}</h2>
              <button
                onClick={() => setShowPaymentForm(!showPaymentForm)}
                disabled={loading || merchantCoins <= 0}
                className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
                  loading || merchantCoins <= 0
                    ? 'bg-gray-600 cursor-not-allowed'
                    : 'bg-red-600 hover:bg-red-700 cursor-pointer'
                } text-white`}
              >
                💵 Request Payment
              </button>
            </div>

            {showPaymentForm && (
              <div className="bg-black/20 backdrop-blur-sm p-4 rounded-lg mb-6 border border-red-700/20">
                <label className="block text-red-200 text-sm font-medium mb-2">
                  Coins to Convert:
                </label>
                <input
                  type="number"
                  value={paymentCoins}
                  onChange={(e) => setPaymentCoins(e.target.value)}
                  placeholder="Enter coins"
                  min="1"
                  max={merchantCoins}
                  className="w-full p-3 bg-black/30 border border-red-700/30 rounded-lg text-white placeholder-red-300/50 focus:border-red-500 focus:outline-none backdrop-blur-sm mb-4"
                />
                <div className="flex gap-2">
                  <button
                    onClick={submitPaymentRequest}
                    disabled={loading || !paymentCoins}
                    className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                      loading || !paymentCoins
                        ? 'bg-gray-600 cursor-not-allowed'
                        : 'bg-green-600 hover:bg-green-700 cursor-pointer'
                    } text-white`}
                  >
                    Submit Request
                  </button>
                  <button
                    onClick={() => { setShowPaymentForm(false); setPaymentCoins('') }}
                    className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition-all duration-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="bg-black/20 backdrop-blur-sm p-4 rounded-lg mb-6 border border-red-700/20">
              <p className="text-red-200 font-medium mb-2">Conversion Rate:</p>
              <p className="text-red-300/80 text-sm">
                1 Coin = ₹0.10<br/>
                {merchantCoins} coins = ₹{(merchantCoins * 0.10).toFixed(2)}
              </p>
            </div>

            <h3 className="text-lg font-semibold text-white mb-4">Your Payment Requests</h3>
            {paymentRequests.length === 0 ? (
              <p className="text-red-300/60 text-center py-8">
                No payment requests yet
              </p>
            ) : (
              <div className="space-y-3">
                {paymentRequests.map(request => (
                  <div
                    key={request.request_id}
                    className="bg-black/20 backdrop-blur-sm p-4 rounded-lg border border-red-700/20"
                  >
                    <div className="text-white font-semibold mb-1">
                      {request.coins_amount} coins = ₹{request.amount_requested.toFixed(2)}
                    </div>
                    <div className="text-sm text-red-300/80 mb-2">
                      Status: <span className={`font-semibold ${
                        request.status === 'paid' ? 'text-green-400' : 
                        request.status === 'approved' ? 'text-blue-400' :
                        request.status === 'rejected' ? 'text-red-400' : 'text-yellow-400'
                      }`}>{request.status}</span>
                    </div>
                    <div className="text-xs text-red-400/60">
                      {new Date(request.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

