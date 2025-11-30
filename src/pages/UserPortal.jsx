import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import Navigation from '../components/Navigation'
import MapView from '../components/MapView'
import BinReporter from '../components/BinReporter'
import BeachCleanup from '../components/BeachCleanup'
import DisposeEarn from '../components/DisposeEarn'
import Wallet from '../components/Wallet'
import SafetyReport from '../components/SafetyReport'
import BeachSelector from '../components/BeachSelector'
import LocationUpdatePrompt from '../components/LocationUpdatePrompt'
import ManualLocationManager from '../components/ManualLocationManager'
import { locationService } from '../services/locationService'

export default function UserPortal({ user }) {
  const [activeTab, setActiveTab] = useState('map')
  const [coinBalance, setCoinBalance] = useState(0)
  const [pendingCoins, setPendingCoins] = useState(0)
  const [selectedBeach, setSelectedBeach] = useState(null)
  const [beachMerchants, setBeachMerchants] = useState([])
  const [locationStatus, setLocationStatus] = useState({ valid: true, needsUpdate: false })
  const [showLocationPrompt, setShowLocationPrompt] = useState(false)
  const [locationTimeRemaining, setLocationTimeRemaining] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    loadUserData()
    initializeLocationService()
  }, [user])

  useEffect(() => {
    // Update location timer every minute
    const interval = setInterval(() => {
      setLocationTimeRemaining(locationService.formatTimeRemaining())
      
      // Check if location needs update
      if (locationService.needsLocationUpdate()) {
        setLocationStatus({ valid: false, needsUpdate: true })
      }
    }, 60000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (selectedBeach) {
      loadBeachMerchants()
    }
  }, [selectedBeach])

  const initializeLocationService = async () => {
    if (!user) return
    
    try {
      const result = await locationService.initializeForUser(user.id)
      setLocationStatus({
        valid: result.success,
        needsUpdate: result.needsUpdate
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
        .rpc('get_beach_merchants', {
          beach_id_param: selectedBeach.beach_id
        })
      
      if (error) throw error
      setBeachMerchants(data || [])
    } catch (err) {
      console.error('Error loading merchants:', err)
    }
  }

  const handleLocationUpdated = (result) => {
    setLocationStatus({ valid: true, needsUpdate: false })
    setShowLocationPrompt(false)
    setLocationTimeRemaining(locationService.formatTimeRemaining())
  }

  const handleLocationPromptCancel = () => {
    setShowLocationPrompt(false)
    // Force switch to wallet or profile tab
    if (!['wallet', 'profile'].includes(activeTab)) {
      setActiveTab('wallet')
    }
  }

  const requiresLocation = (tabId) => {
    return ['map', 'bin', 'cleanup', 'dispose', 'safety', 'merchants'].includes(tabId)
  }

  const handleTabChange = (tabId) => {
    if (requiresLocation(tabId) && !locationStatus.valid) {
      setShowLocationPrompt(true)
      return
    }
    setActiveTab(tabId)
  }

  const handleLogout = () => {
    locationService.clearLocation()
    localStorage.removeItem('karavali_user')
    window.dispatchEvent(new Event('karavali_user_changed'))
    navigate('/login', { replace: true })
  }

  const tabs = [
    { id: 'map', label: '🗺️ Map', icon: '🗺️', requiresLocation: true },
    { id: 'bin', label: '🗑️ Report Bin', icon: '🗑️', requiresLocation: true },
    { id: 'cleanup', label: '🧹 Cleanup', icon: '🧹', requiresLocation: true },
    { id: 'dispose', label: '♻️ Dispose', icon: '♻️', requiresLocation: true },
    { id: 'safety', label: '⚠️ Safety', icon: '⚠️', requiresLocation: true },
    { id: 'merchants', label: '🏪 Merchants', icon: '🏪', requiresLocation: true },
    { id: 'wallet', label: '💰 Wallet', icon: '💰', requiresLocation: false },
    { id: 'profile', label: '👤 Profile', icon: '👤', requiresLocation: false }
  ]

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navigation user={{...user, coin_balance: coinBalance}} currentPage="user" />

      {/* Location Status Bar */}
      {locationStatus.valid && locationTimeRemaining && (
        <div className="container" style={{ marginTop: '1rem' }}>
          <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3 text-center">
            <p className="text-green-300 text-sm">
              📍 Location valid - {locationTimeRemaining}
            </p>
          </div>
        </div>
      )}

      {!locationStatus.valid && (
        <div className="container" style={{ marginTop: '1rem' }}>
          <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-3 text-center">
            <p className="text-yellow-300 text-sm">
              ⚠️ Location expired - Update location to access all features
            </p>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tab-nav container">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''} ${
              tab.requiresLocation && !locationStatus.valid ? 'opacity-50' : ''
            }`}
            title={tab.requiresLocation && !locationStatus.valid ? 'Requires location update' : ''}
          >
            {tab.label}
            {tab.requiresLocation && !locationStatus.valid && (
              <span className="ml-1 text-yellow-400">⚠️</span>
            )}
          </button>
        ))}
      </div>

      {/* Content */}
      <main className="container main-content">
        <div className="glass-card">
          {activeTab === 'map' && (
            <>
              <BeachSelector 
                user={user} 
                onBeachSelect={setSelectedBeach} 
                selectedBeach={selectedBeach}
              />
              <MapView user={user} selectedBeach={selectedBeach} />
            </>
          )}
          {activeTab === 'bin' && (
            selectedBeach ? (
              <BinReporter user={user} selectedBeach={selectedBeach} onUpdate={loadUserData} />
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.7)' }}>
                Please select a beach from the Map tab first
              </div>
            )
          )}
          {activeTab === 'cleanup' && (
            selectedBeach ? (
              <BeachCleanup user={user} selectedBeach={selectedBeach} onUpdate={loadUserData} />
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.7)' }}>
                Please select a beach from the Map tab first
              </div>
            )
          )}
          {activeTab === 'dispose' && (
            selectedBeach ? (
              <DisposeEarn user={user} selectedBeach={selectedBeach} onUpdate={loadUserData} />
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.7)' }}>
                Please select a beach from the Map tab first
              </div>
            )
          )}
          {activeTab === 'safety' && (
            selectedBeach ? (
              <SafetyReport user={user} selectedBeach={selectedBeach} />
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.7)' }}>
                Please select a beach from the Map tab first
              </div>
            )
          )}
          {activeTab === 'merchants' && (
            <div>
              <h2 style={{ color: 'white', marginBottom: '1rem' }}>🏪 Local Merchants</h2>
              {!selectedBeach ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.7)' }}>
                  Please select a beach from the Map tab first
                </div>
              ) : beachMerchants.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.7)' }}>
                  No merchants registered at {selectedBeach.name}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {beachMerchants.map((merchant, index) => (
                    <div key={index} style={{
                      background: 'var(--glass-bg)',
                      padding: '1rem',
                      borderRadius: '8px',
                      border: '1px solid var(--glass-border)'
                    }}>
                      <h4 style={{ color: 'white', margin: 0, marginBottom: '0.5rem' }}>
                        🏪 {merchant.business_name}
                      </h4>
                      <div style={{ fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)' }}>
                        <div>📱 {merchant.merchant_name}</div>
                        <div>🏷️ {merchant.business_type}</div>
                        {merchant.contact_phone && (
                          <div>📞 {merchant.contact_phone}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeTab === 'wallet' && <Wallet user={user} coinBalance={coinBalance} />}
          {activeTab === 'profile' && (
            <div className="space-y-6">
              <div>
                <h2 style={{ color: 'white', marginBottom: '1rem' }}>👤 Profile</h2>
                <div style={{
                  background: 'var(--glass-bg)',
                  padding: '1.5rem',
                  borderRadius: '12px',
                  border: '1px solid var(--glass-border)'
                }}>
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>Phone Number</label>
                    <div style={{ color: 'white', fontSize: '1.1rem', fontWeight: '500' }}>
                      {user.phone_number}
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>Role</label>
                    <div style={{ color: 'white', fontSize: '1.1rem', fontWeight: '500', textTransform: 'capitalize' }}>
                      {user.role.replace('_', ' ')}
                    </div>
                  </div>
                  
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>Location Status</label>
                    <div style={{ color: locationStatus.valid ? '#10b981' : '#f59e0b', fontSize: '1.1rem', fontWeight: '500' }}>
                      {locationStatus.valid ? `✅ Valid (${locationTimeRemaining})` : '⚠️ Expired - Update Required'}
                    </div>
                  </div>
                  
                  {!locationStatus.valid && (
                    <button
                      onClick={() => setShowLocationPrompt(true)}
                      className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 mt-4"
                    >
                      📍 Update Location
                    </button>
                  )}
                  
                  <button
                    onClick={handleLogout}
                    className="w-full bg-gray-600/50 hover:bg-gray-600/70 text-gray-300 font-medium py-3 px-4 rounded-xl transition-all duration-200 mt-4"
                  >
                    🚪 Logout
                  </button>
                </div>
              </div>

              <div style={{
                background: 'var(--glass-bg)',
                padding: '1.5rem',
                borderRadius: '12px',
                border: '1px solid var(--glass-border)'
              }}>
                <ManualLocationManager user={user} />
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Location Update Prompt */}
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

