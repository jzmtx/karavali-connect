import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Navigation from '../components/Navigation'
import MapView from '../components/MapView'
import BinReporter from '../components/BinReporter'
import BeachCleanup from '../components/BeachCleanup'
import DisposeEarn from '../components/DisposeEarn'
import Wallet from '../components/Wallet'
import SafetyReport from '../components/SafetyReport'
import BeachSelector from '../components/BeachSelector'
import BeachConditions from '../components/BeachConditions'
import LocationUpdatePrompt from '../components/LocationUpdatePrompt'
import ManualLocationManager from '../components/ManualLocationManager'
import { locationService } from '../services/locationService'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'

export default function UserPortal({ user }) {
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'map')
  const [coinBalance, setCoinBalance] = useState(0)
  const [pendingCoins, setPendingCoins] = useState(0)
  const [selectedBeach, setSelectedBeach] = useState(() => {
    const saved = localStorage.getItem('selected_beach')
    return saved ? JSON.parse(saved) : null
  })
  const [beachMerchants, setBeachMerchants] = useState([])
  const [locationStatus, setLocationStatus] = useState({ valid: true, needsUpdate: false })
  const [showLocationPrompt, setShowLocationPrompt] = useState(false)
  const [locationTimeRemaining, setLocationTimeRemaining] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    loadUserData()
    initializeLocationService()

    const tab = searchParams.get('tab')
    if (tab && tab !== activeTab) {
      setActiveTab(tab)
    }
  }, [user, searchParams])

  useEffect(() => {
    if (selectedBeach) {
      localStorage.setItem('selected_beach', JSON.stringify(selectedBeach))
      loadBeachMerchants()
    } else {
      localStorage.removeItem('selected_beach')
    }
  }, [selectedBeach])

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

  const loadUserData = async () => {
    if (!user) return
    const { data } = await supabase
      .from('users')
      .select('coin_balance, pending_coins')
      .eq('id', user.id)
      .single()
    if (data) {
      setCoinBalance(data.coin_balance || 0)
      setPendingCoins(data.pending_coins || 0)
    }
  }

  const loadBeachMerchants = async () => {
    if (!selectedBeach) return
    try {
      const { data, error } = await supabase
        .rpc('get_beach_merchants', { beach_id_param: selectedBeach.beach_id })
      if (error) throw error
      setBeachMerchants(data || [])
    } catch (err) {
      console.error('Error loading merchants:', err)
    }
  }

  const handleLocationUpdated = async (result) => {
    try {
      const freshStatus = await locationService.forceRefreshLocation(user.id, user.role)
      setLocationStatus({
        valid: freshStatus.success,
        needsUpdate: !freshStatus.success,
        isPermanent: freshStatus.isPermanent
      })
      setLocationTimeRemaining(freshStatus.timeRemaining || locationService.formatTimeRemaining())
      await loadUserData()
    } catch (error) {
      console.error('Error refreshing location status:', error)
      setLocationStatus({ valid: true, needsUpdate: false })
      setLocationTimeRemaining(locationService.formatTimeRemaining())
    }
    setShowLocationPrompt(false)
  }

  const handleLogout = () => {
    locationService.clearLocation()
    localStorage.removeItem('karavali_user')
    window.dispatchEvent(new Event('karavali_user_changed'))
    navigate('/login', { replace: true })
  }

  return (
    <div className="min-h-screen pb-24 md:pb-20 bg-gradient-to-br from-black via-red-950 to-black">
      <Navigation user={{ ...user, coin_balance: coinBalance }} currentPage="user" />

      <main className="container pt-24 px-4 md:px-8 max-w-7xl mx-auto">
        {activeTab === 'map' && (
          <div className="animate-fade-in space-y-8">
            <div className="text-center space-y-2">
              <h2 className="text-4xl font-bold text-white tracking-tight">
                <span className="text-gradient">Explore</span> The Coast
              </h2>
              <p className="text-gray-400 max-w-xl mx-auto">
                Discover pristine beaches, check real-time conditions, and find local hotspots.
              </p>
            </div>

            {/* Beach Selector - Now standalone for better visual impact */}
            <div className="max-w-2xl mx-auto relative z-20 space-y-6">
              <BeachSelector
                user={user}
                onBeachSelect={setSelectedBeach}
                selectedBeach={selectedBeach}
              />

              {/* Beach Conditions Dashboard */}
              {selectedBeach && (
                <BeachConditions selectedBeach={selectedBeach} />
              )}
            </div>

            {/* Map Container */}
            <div className="h-[calc(100vh-220px)] md:h-[65vh] rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative z-10 glass-card p-0">
              <MapView
                user={user}
                selectedBeach={selectedBeach}
                onBeachSelect={setSelectedBeach}
              />
            </div>
          </div>
        )}

        {activeTab === 'bin' && (
          <div className="animate-fade-in max-w-3xl mx-auto">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold text-white mb-2">🗑️ Report Bin</h2>
              <p className="text-gray-400">Help keep our beaches clean by reporting overflowing bins.</p>
            </div>
            {selectedBeach ? (
              <BinReporter user={user} selectedBeach={selectedBeach} onUpdate={loadUserData} />
            ) : (
              <Card className="text-center py-16 border-dashed border-2 border-white/10 bg-transparent">
                <div className="text-6xl mb-4 opacity-50">🏖️</div>
                <h3 className="text-xl font-bold text-white mb-2">No Beach Selected</h3>
                <p className="text-gray-400">Please select a beach from the Map tab to report bins.</p>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'cleanup' && (
          <div className="animate-fade-in max-w-3xl mx-auto">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold text-white mb-2">🧹 Beach Cleanup</h2>
              <p className="text-gray-400">Join the movement. Clean up and earn rewards.</p>
            </div>
            {selectedBeach ? (
              <BeachCleanup user={user} selectedBeach={selectedBeach} onUpdate={loadUserData} />
            ) : (
              <Card className="text-center py-16 border-dashed border-2 border-white/10 bg-transparent">
                <div className="text-6xl mb-4 opacity-50">🏖️</div>
                <h3 className="text-xl font-bold text-white mb-2">No Beach Selected</h3>
                <p className="text-gray-400">Please select a beach from the Map tab first.</p>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'dispose' && (
          <div className="animate-fade-in max-w-3xl mx-auto">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold text-white mb-2">♻️ Dispose & Earn</h2>
              <p className="text-gray-400">Responsible disposal pays off. Scan and earn.</p>
            </div>
            {selectedBeach ? (
              <DisposeEarn user={user} selectedBeach={selectedBeach} onUpdate={loadUserData} />
            ) : (
              <Card className="text-center py-16 border-dashed border-2 border-white/10 bg-transparent">
                <div className="text-6xl mb-4 opacity-50">🏖️</div>
                <h3 className="text-xl font-bold text-white mb-2">No Beach Selected</h3>
                <p className="text-gray-400">Please select a beach from the Map tab first.</p>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'safety' && (
          <div className="animate-fade-in max-w-3xl mx-auto">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold text-white mb-2">⚠️ Safety Report</h2>
              <p className="text-gray-400">Report hazards to keep everyone safe.</p>
            </div>
            {selectedBeach ? (
              <SafetyReport user={user} selectedBeach={selectedBeach} />
            ) : (
              <Card className="text-center py-16 border-dashed border-2 border-white/10 bg-transparent">
                <div className="text-6xl mb-4 opacity-50">🏖️</div>
                <h3 className="text-xl font-bold text-white mb-2">No Beach Selected</h3>
                <p className="text-gray-400">Please select a beach from the Map tab first.</p>
              </Card>
            )}
          </div>
        )}

        {activeTab === 'merchants' && (
          <div className="animate-fade-in">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold text-white mb-2">🏪 Local Merchants</h2>
              <p className="text-gray-400">Redeem your hard-earned coins at these partners.</p>
            </div>
            {!selectedBeach ? (
              <Card className="text-center py-16 border-dashed border-2 border-white/10 bg-transparent max-w-3xl mx-auto">
                <div className="text-6xl mb-4 opacity-50">🏖️</div>
                <h3 className="text-xl font-bold text-white mb-2">No Beach Selected</h3>
                <p className="text-gray-400">Please select a beach from the Map tab first.</p>
              </Card>
            ) : beachMerchants.length === 0 ? (
              <Card className="text-center py-16 max-w-3xl mx-auto">
                <p className="text-gray-400">No merchants registered at {selectedBeach.name} yet.</p>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {beachMerchants.map((merchant, index) => (
                  <Card key={index} hover className="border-t-4 border-t-red-500">
                    <h4 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                      🏪 {merchant.business_name}
                    </h4>
                    <div className="space-y-2 text-sm text-gray-300">
                      <div className="flex items-center gap-2">
                        <span className="text-red-400">👤</span> {merchant.merchant_name}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-red-400">🏷️</span> {merchant.business_type}
                      </div>
                      {merchant.contact_phone && (
                        <div className="flex items-center gap-2">
                          <span className="text-red-400">📞</span> {merchant.contact_phone}
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'wallet' && (
          <div className="animate-fade-in max-w-4xl mx-auto">
            <div className="mb-8 text-center">
              <h2 className="text-3xl font-bold text-white mb-2">💰 My Wallet</h2>
              <p className="text-gray-400">Track your earnings and transactions.</p>
            </div>
            <Wallet user={user} coinBalance={coinBalance} />
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="animate-fade-in space-y-8 max-w-2xl mx-auto">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-white mb-2">👤 Your Profile</h2>
              <p className="text-gray-400">Manage your account and location settings.</p>
            </div>

            <Card className="overflow-hidden">
              <div className="bg-gradient-to-r from-red-900/20 to-black p-6 border-b border-white/10">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center text-3xl shadow-lg">
                    {user.role === 'tourist' ? '🏖️' : '👤'}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">{user.name || 'User'}</h3>
                    <p className="text-red-400 capitalize">{user.role.replace('_', ' ')}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                    <label className="text-xs text-gray-500 uppercase tracking-wider">Phone</label>
                    <div className="text-lg font-medium text-white mt-1">{user.phone_number}</div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-xl border border-white/5">
                    <label className="text-xs text-gray-500 uppercase tracking-wider">Status</label>
                    <div className={`text-lg font-medium mt-1 ${locationStatus.isPermanent || locationStatus.valid ? 'text-green-400' : 'text-amber-400'}`}>
                      {locationStatus.isPermanent ? 'Permanent' : locationStatus.valid ? 'Active' : 'Expired'}
                    </div>
                  </div>
                </div>

                {user.role === 'tourist' && !locationStatus.valid && (
                  <Button
                    onClick={() => setShowLocationPrompt(true)}
                    className="w-full"
                    variant="primary"
                  >
                    📍 Update Location Access
                  </Button>
                )}

                <Button
                  onClick={handleLogout}
                  variant="secondary"
                  className="w-full"
                >
                  🚪 Logout
                </Button>
              </div>
            </Card>

            <Card>
              <ManualLocationManager user={user} />
            </Card>
          </div>
        )}
      </main>

      {showLocationPrompt && (
        <LocationUpdatePrompt
          user={user}
          onLocationUpdated={handleLocationUpdated}
          onCancel={() => setShowLocationPrompt(false)}
        />
      )}
    </div>
  )
}
