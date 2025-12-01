import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate, useSearchParams } from 'react-router-dom'
import QRScanner from '../components/QRScanner'
import Navigation from '../components/Navigation'
import MerchantBeachRegistration from '../components/MerchantBeachRegistration'
import LocationUpdatePrompt from '../components/LocationUpdatePrompt'
import { locationService } from '../services/locationService'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

export default function MerchantPortal({ user }) {
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'register')
  const [isRegistered, setIsRegistered] = useState(false)
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
  const [locationStatus, setLocationStatus] = useState({ valid: true, needsUpdate: false })
  const [showLocationPrompt, setShowLocationPrompt] = useState(false)
  const [locationTimeRemaining, setLocationTimeRemaining] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    loadMerchantData()
    loadPaymentRequests()
    checkRegistrationStatus()
    initializeLocationService()

    const tab = searchParams.get('tab')
    if (tab && tab !== activeTab) {
      setActiveTab(tab)
    }
  }, [user, searchParams])

  useEffect(() => {
    const interval = setInterval(() => {
      // No location updates needed for merchants
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  const initializeLocationService = async () => {
    if (!user) return
    try {
      const result = await locationService.initializeForUser(user.id, user.role)
      setLocationStatus({
        valid: result.success,
        needsUpdate: result.needsUpdate,
        isPermanent: result.isPermanent
      })
      if (result.success) {
        setLocationTimeRemaining(result.timeRemaining)
      }
    } catch (error) {
      console.error('Error initializing location service:', error)
      setLocationStatus({ valid: false, needsUpdate: true })
    }
  }

  const checkRegistrationStatus = async () => {
    if (!user) return
    try {
      const { data, error } = await supabase
        .from('beach_merchants')
        .select('*')
        .eq('merchant_id', user.id)
        .eq('is_active', true)
        .single()

      if (data) {
        setIsRegistered(true)
        setActiveTab('scan')
      }
    } catch (err) {
      setIsRegistered(false)
    }
  }

  const handleQRScan = async (qrData) => {
    try {
      const data = JSON.parse(qrData)
      const qrAge = Date.now() - data.timestamp
      if (qrAge > 45000) {
        setError('QR code expired. Please ask customer to refresh.')
        return
      }

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

    const maxCoinsCanUse = Math.min(Math.floor(bill), userData.coin_balance)
    const coinsToUse = Math.min(maxCoinsCanUse, Math.floor(bill))

    if (userData.coin_balance < coinsToUse) {
      setError(`Customer has only ${userData.coin_balance} coins. Need ${coinsToUse} coins.`)
      return
    }

    setLoading(true)
    setError('')

    try {
      const discount = (coinsToUse * discountPercent) / 100
      const finalAmount = bill - discount

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

      const { data: transactionResult, error: transactionError } = await supabase
        .rpc('process_merchant_redemption_with_beach', {
          merchant_id_param: user.id,
          user_id_param: scannedData.userId,
          coins_param: coinsToUse,
          bill_amount_param: bill,
          discount_amount_param: discount
        })

      if (transactionError) throw new Error(`Transaction failed: ${transactionError.message}`)
      if (!transactionResult.success) throw new Error(transactionResult.error)

      await supabase
        .from('merchant_redemptions')
        .delete()
        .eq('redemption_id', redemption.redemption_id)

      setMessage(`✅ Success! Customer redeemed ${coinsToUse} coins for ₹${discount.toFixed(2)} discount. Final amount: ₹${finalAmount.toFixed(2)}. You earned ${coinsToUse} merchant coins!`)
      setScannedData(null)
      setUserData(null)
      setBillAmount('')
      await loadMerchantData()
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

      setMessage(`✅ Payment request submitted! ₹${amountRequested.toFixed(2)} for ${coins} coins.`)
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

  const handleLocationUpdated = (result) => {
    setLocationStatus({ valid: true, needsUpdate: false })
    setShowLocationPrompt(false)
    setLocationTimeRemaining(locationService.formatTimeRemaining())
  }

  const handleLocationPromptCancel = () => {
    setShowLocationPrompt(false)
  }

  const tabs = [
    { id: 'register', label: '🏖️ Beach Registration', icon: '🏖️' },
    { id: 'scan', label: '📷 Scan Customer QR', icon: '📷' },
    { id: 'payments', label: '💳 Payment Requests', icon: '💳' },
    { id: 'profile', label: '👤 Profile Settings', icon: '👤' }
  ]

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    const params = new URLSearchParams()
    params.set('tab', tabId)
    navigate(`/merchant?${params.toString()}`, { replace: true })
  }

  const handleLogout = () => {
    locationService.clearLocation()
    localStorage.removeItem('karavali_user')
    window.dispatchEvent(new Event('karavali_user_changed'))
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen pb-20">
      <Navigation
        user={user}
        currentPage="merchant"
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
      />

      <main className="container pt-20">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">Welcome to Merchant Dashboard</h1>
        </div>

        {error && (
          <div className="alert alert-error mb-6">
            {error}
          </div>
        )}

        {message && (
          <div className="alert alert-success mb-6">
            {message}
          </div>
        )}

        {activeTab === 'register' && (
          <MerchantBeachRegistration
            user={user}
            onRegistrationComplete={(data) => {
              setIsRegistered(true)
              setActiveTab('scan')
              setMessage(`Successfully registered at ${data.beach_name}!`)
            }}
          />
        )}

        {activeTab === 'scan' && isRegistered && (
          <div className="space-y-6">
            <Card>
              <h2 className="text-xl font-bold text-white mb-4">Scan Customer QR Code</h2>
              <div className="rounded-xl overflow-hidden border border-white/10">
                <QRScanner onScan={handleQRScan} />
              </div>
            </Card>

            {userData && (
              <Card>
                <h3 className="text-lg font-bold text-white mb-4">Customer Details</h3>
                <div className="bg-white/5 p-4 rounded-lg border border-white/10 mb-4">
                  <p className="text-gray-300"><strong>Phone:</strong> {userData.phone_number}</p>
                  <p className="text-gray-300"><strong>Available Coins:</strong> {userData.coin_balance}</p>
                </div>

                <div className="space-y-4">
                  <Input
                    label="Bill Amount (₹)"
                    type="number"
                    value={billAmount}
                    onChange={(e) => setBillAmount(e.target.value)}
                    placeholder="500"
                  />

                  <Input
                    label="Discount Percentage (%)"
                    type="number"
                    value={discountPercent}
                    onChange={(e) => setDiscountPercent(parseFloat(e.target.value) || 10)}
                    min="1"
                    max="100"
                  />

                  {billAmount && !isNaN(parseFloat(billAmount)) && userData && (
                    <div className="bg-red-900/20 border border-red-500/30 p-4 rounded-lg backdrop-blur-sm">
                      {(() => {
                        const bill = parseFloat(billAmount)
                        const maxCoins = Math.min(Math.floor(bill), userData.coin_balance)
                        const discount = (maxCoins * discountPercent) / 100
                        const finalAmount = bill - discount
                        return (
                          <div className="space-y-1 text-red-200">
                            <p><strong>Bill:</strong> ₹{bill.toFixed(2)}</p>
                            <p><strong>Customer Coins:</strong> {userData.coin_balance}</p>
                            <p><strong>Coins to Use:</strong> {maxCoins}</p>
                            <p><strong>Discount ({discountPercent}%):</strong> ₹{discount.toFixed(2)}</p>
                            <p className="text-lg font-bold text-white mt-2">Final Amount: ₹{finalAmount.toFixed(2)}</p>
                          </div>
                        )
                      })()}
                    </div>
                  )}

                  <Button
                    onClick={handleRedeem}
                    disabled={loading || !billAmount || userData.coin_balance === 0}
                    isLoading={loading}
                    className="w-full"
                  >
                    {userData.coin_balance === 0 ? 'No Coins Available' : 'Redeem Coins'}
                  </Button>
                </div>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'scan' && !isRegistered && (
          <Card className="text-center py-12">
            <h3 className="text-xl font-bold text-white mb-4">🏖️ Beach Registration Required</h3>
            <p className="text-gray-400 mb-6">
              Please register your business at a beach location before you can scan customer QR codes.
            </p>
            <Button onClick={() => setActiveTab('register')}>
              Go to Registration
            </Button>
          </Card>
        )}

        {activeTab === 'payments' && (
          <Card>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <h2 className="text-xl font-semibold text-white">💰 Merchant Coins: {merchantCoins}</h2>
              <Button
                onClick={() => setShowPaymentForm(!showPaymentForm)}
                disabled={loading || merchantCoins <= 0}
                variant={loading || merchantCoins <= 0 ? 'ghost' : 'primary'}
              >
                💵 Request Payment
              </Button>
            </div>

            {showPaymentForm && (
              <div className="bg-black/20 backdrop-blur-sm p-4 rounded-lg mb-6 border border-red-700/20">
                <Input
                  label="Coins to Convert"
                  type="number"
                  value={paymentCoins}
                  onChange={(e) => setPaymentCoins(e.target.value)}
                  placeholder="Enter coins"
                  min="1"
                  max={merchantCoins}
                />
                <div className="flex gap-2 mt-4">
                  <Button onClick={submitPaymentRequest} disabled={loading || !paymentCoins}>
                    Submit Request
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => { setShowPaymentForm(false); setPaymentCoins('') }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            <div className="bg-black/20 backdrop-blur-sm p-4 rounded-lg mb-6 border border-red-700/20">
              <p className="text-red-200 font-medium mb-2">Conversion Rate:</p>
              <p className="text-red-300/80 text-sm">
                1 Coin = ₹0.10<br />
                {merchantCoins} coins = ₹{(merchantCoins * 0.10).toFixed(2)}
              </p>
            </div>

            <h3 className="text-lg font-semibold text-white mb-4">Your Payment Requests</h3>
            {paymentRequests.length === 0 ? (
              <p className="text-gray-400 text-center py-8">
                No payment requests yet
              </p>
            ) : (
              <div className="space-y-3">
                {paymentRequests.map(request => (
                  <div
                    key={request.request_id}
                    className="bg-white/5 p-4 rounded-lg border border-white/10"
                  >
                    <div className="text-white font-semibold mb-1">
                      {request.coins_amount} coins = ₹{request.amount_requested.toFixed(2)}
                    </div>
                    <div className="text-sm text-gray-400 mb-2">
                      Status: <span className={`font-semibold ${request.status === 'paid' ? 'text-green-400' :
                          request.status === 'approved' ? 'text-blue-400' :
                            request.status === 'rejected' ? 'text-red-400' : 'text-yellow-400'
                        }`}>{request.status}</span>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(request.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {activeTab === 'profile' && (
          <Card>
            <h2 className="text-xl font-bold text-white mb-6">👤 Profile</h2>
            <div className="space-y-6">
              <div>
                <label className="text-sm text-gray-400">Phone Number</label>
                <div className="text-lg font-medium text-white">{user.phone_number}</div>
              </div>

              <div>
                <label className="text-sm text-gray-400">Role</label>
                <div className="text-lg font-medium text-white capitalize">{user.role.replace('_', ' ')}</div>
              </div>

              <div>
                <label className="text-sm text-gray-400">Merchant Coins</label>
                <div className="text-lg font-medium text-green-400">
                  {merchantCoins} coins (₹{(merchantCoins * 0.10).toFixed(2)})
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-400">Registration Status</label>
                <div className={`text-lg font-medium ${isRegistered ? 'text-green-400' : 'text-amber-400'}`}>
                  {isRegistered ? '✅ Registered at Beach' : '⚠️ Not Registered'}
                </div>
              </div>

              <Button
                onClick={handleLogout}
                variant="secondary"
                className="w-full mt-4"
              >
                🚪 Logout
              </Button>
            </div>
          </Card>
        )}
      </main>

      {showLocationPrompt && (
        <LocationUpdatePrompt
          user={user}
          onLocationUpdated={handleLocationUpdated}
          onCancel={handleLocationPromptCancel}
        />
      )}
    </div>
  )
}
