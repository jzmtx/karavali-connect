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

export default function UserPortal({ user }) {
  const [activeTab, setActiveTab] = useState('map')
  const [coinBalance, setCoinBalance] = useState(0)
  const [pendingCoins, setPendingCoins] = useState(0)
  const navigate = useNavigate()

  useEffect(() => {
    loadUserData()
  }, [user])

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

  const handleLogout = () => {
    localStorage.removeItem('karavali_user')
    window.dispatchEvent(new Event('karavali_user_changed'))
    navigate('/login', { replace: true })
  }

  const tabs = [
    { id: 'map', label: '🗺️ Map', icon: '🗺️' },
    { id: 'bin', label: '🗑️ Report Bin', icon: '🗑️' },
    { id: 'cleanup', label: '🧹 Cleanup', icon: '🧹' },
    { id: 'dispose', label: '♻️ Dispose', icon: '♻️' },
    { id: 'safety', label: '⚠️ Safety', icon: '⚠️' },
    { id: 'wallet', label: '💰 Wallet', icon: '💰' }
  ]

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navigation user={{...user, coin_balance: coinBalance}} currentPage="user" />

      {/* Tab Navigation */}
      <div className="tab-nav container">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <main className="container main-content">
        <div className="glass-card">
          {activeTab === 'map' && <MapView user={user} />}
          {activeTab === 'bin' && <BinReporter user={user} onUpdate={loadUserData} />}
          {activeTab === 'cleanup' && <BeachCleanup user={user} onUpdate={loadUserData} />}
          {activeTab === 'dispose' && <DisposeEarn user={user} onUpdate={loadUserData} />}
          {activeTab === 'safety' && <SafetyReport user={user} />}
          {activeTab === 'wallet' && <Wallet user={user} coinBalance={coinBalance} />}
        </div>
      </main>
    </div>
  )
}

