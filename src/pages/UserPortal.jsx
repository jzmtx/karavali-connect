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
import LocationUpdatePrompt from '../components/LocationUpdatePrompt'
import ManualLocationManager from '../components/ManualLocationManager'
import { locationService } from '../services/locationService'

export default function UserPortal({ user }) {
  const [searchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'map')
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
    
    // Update tab when URL changes
    const tab = searchParams.get('tab')
    if (tab && tab !== activeTab) {
      setActiveTab(tab)
    }
  }, [user, searchParams])

  // Removed location expiry timer - location is now permanent for all users

  useEffect(() => {
    if (selectedBeach) {
      loadBeachMerchants()
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
        .rpc('get_beach_merchants', {
          beach_id_param: selectedBeach.beach_id
        })
      
      if (error) throw error
      setBeachMerchants(data || [])
    } catch (err) {
      console.error('Error loading merchants:', err)
    }
  }

  const handleLocationUpdated = async (result) => {
    // Force refresh location status from database
    try {
      const freshStatus = await locationService.forceRefreshLocation(user.id, user.role)
      setLocationStatus({
        valid: freshStatus.success,
        needsUpdate: !freshStatus.success,
        isPermanent: freshStatus.isPermanent
      })
      setLocationTimeRemaining(freshStatus.timeRemaining || locationService.formatTimeRemaining())
      
      // Also reload user data to ensure everything is in sync
      await loadUserData()
    } catch (error) {
      console.error('Error refreshing location status:', error)
      // Fallback to optimistic update
      setLocationStatus({ valid: true, needsUpdate: false })
      setLocationTimeRemaining(locationService.formatTimeRemaining())
    }
    setShowLocationPrompt(false)
  }

  const handleLocationPromptCancel = () => {
    setShowLocationPrompt(false)
    // User can manually choose which tab to go to
  }

  const requiresLocation = (tabId) => {
    return ['map', 'bin', 'cleanup', 'dispose', 'safety', 'merchants'].includes(tabId)
  }

  const handleTabChange = (tabId) => {
    // All users have permanent location access now
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





      {/* Content */}
      <main className="app-main">
        <div className="content-container">
          {activeTab === 'map' && (
            <div className="content-section">
              <div className="section-header">
                <div>
                  <h2 className="section-title">🗺️ Interactive Map</h2>
                  <p className="section-subtitle">Explore beaches, check conditions, and find locations</p>
                </div>
              </div>
              <div className="enhanced-card">
                <BeachSelector 
                  user={user} 
                  onBeachSelect={setSelectedBeach} 
                  selectedBeach={selectedBeach}
                />
              </div>
              <MapView user={user} selectedBeach={selectedBeach} />
            </div>
          )}
          {activeTab === 'bin' && (
            <div className="content-section">
              <div className="section-header">
                <div>
                  <h2 className="section-title">🗑️ Report Bin</h2>
                  <p className="section-subtitle">Report overflowing bins and earn coins</p>
                </div>
              </div>
              {selectedBeach ? (
                <BinReporter user={user} selectedBeach={selectedBeach} onUpdate={loadUserData} />
              ) : (
                <div className="enhanced-card" style={{ textAlign: 'center', padding: '3rem' }}>
                  <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🏖️</div>
                  <h3 style={{ color: 'white', marginBottom: '0.5rem' }}>Select a Beach First</h3>
                  <p style={{ color: 'rgba(255,255,255,0.7)' }}>Please select a beach from the Map tab to report bins</p>
                </div>
              )}
            </div>
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
          {activeTab === 'wallet' && (
            <div className="content-section">
              <div className="section-header">
                <div>
                  <h2 className="section-title">💰 My Wallet</h2>
                  <p className="section-subtitle">Manage your coins and view transaction history</p>
                </div>
              </div>
              <Wallet user={user} coinBalance={coinBalance} />
            </div>
          )}
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
                    <div style={{ color: locationStatus.isPermanent || locationStatus.valid ? '#10b981' : '#f59e0b', fontSize: '1.1rem', fontWeight: '500' }}>
                      {locationStatus.isPermanent ? '✅ Permanent Access' : 
                       locationStatus.valid ? `✅ Valid (${locationTimeRemaining})` : '⚠️ Expired - Update Required'}
                    </div>
                  </div>
                  
                  {user.role === 'tourist' && !locationStatus.valid && (
                    <button
                      onClick={() => setShowLocationPrompt(true)}
                      className="btn btn-primary"
                      style={{ width: '100%', marginTop: '1rem' }}
                    >
                      📍 Update Location
                    </button>
                  )}
                  
                  <button
                    onClick={handleLogout}
                    className="btn btn-secondary"
                    style={{ width: '100%', marginTop: '1rem' }}
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

