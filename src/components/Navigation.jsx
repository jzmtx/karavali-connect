import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Navigation({ user, currentPage }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('karavali_user')
    window.dispatchEvent(new Event('karavali_user_changed'))
    navigate('/login', { replace: true })
  }

  const getPageTitle = () => {
    switch (currentPage) {
      case 'user': return '🌊 Karavali Connect'
      case 'merchant': return '🏪 Merchant Portal'
      case 'authority': return '🏛️ Authority Portal'
      default: return '🌊 Karavali Connect'
    }
  }

  const getPageInfo = () => {
    switch (currentPage) {
      case 'user': return `Coins: ${user?.coin_balance || 0} • Report & Earn`
      case 'merchant': return `Merchant Coins: ${user?.merchant_coins || 0} • Scan QR codes to redeem`
      case 'authority': return 'Manage reports & payments'
      default: return 'Coastal civic engagement'
    }
  }

  return (
    <>
      {/* Desktop Navigation */}
      <nav style={{
        background: 'var(--dark-gradient)',
        padding: 'clamp(0.5rem, 2vw, 0.75rem) clamp(1rem, 4vw, 2rem)',
        borderBottom: '1px solid var(--glass-border)',
        display: window.innerWidth >= 1024 ? 'flex' : 'none',
        justifyContent: 'space-between',
        alignItems: 'center',
        minHeight: '60px'
      }}>
        <h1 style={{ fontSize: '1.25rem', margin: 0, color: 'white' }}>
          🌊 Karavali Connect
        </h1>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{
            background: 'var(--glass-bg)',
            padding: '0.25rem 0.75rem',
            borderRadius: '20px',
            fontSize: '0.875rem',
            border: '1px solid var(--glass-border)',
            color: 'white'
          }}>
            {getPageInfo()}
          </div>
          <button onClick={handleLogout} className="btn btn-secondary">
            🚪 Logout
          </button>
        </div>
      </nav>

      {/* Mobile Navigation */}
      <nav style={{
        background: 'var(--dark-gradient)',
        padding: 'clamp(0.5rem, 3vw, 0.75rem) clamp(0.75rem, 4vw, 1rem)',
        borderBottom: '1px solid var(--glass-border)',
        display: window.innerWidth < 1024 ? 'flex' : 'none',
        justifyContent: 'space-between',
        alignItems: 'center',
        position: 'relative',
        minHeight: '56px',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <h1 style={{ fontSize: '1.125rem', fontWeight: 'bold', margin: 0, color: 'white' }}>
          🌊 Karavali Connect
        </h1>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ 
            background: 'var(--glass-bg)', 
            padding: '0.25rem 0.5rem', 
            borderRadius: '12px',
            fontSize: '0.75rem',
            border: '1px solid var(--glass-border)',
            color: 'white'
          }}>
            {currentPage === 'user' ? `${user?.coin_balance || 0} 🪙` : getPageInfo()}
          </div>
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            style={{
              color: 'white',
              padding: '0.5rem',
              borderRadius: '8px',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.25rem'
            }}
          >
            {isMobileMenuOpen ? '✕' : '☰'}
          </button>
        </div>
          
        {/* Mobile Menu Dropdown */}
        {isMobileMenuOpen && (
          <div style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'var(--dark-gradient)',
            borderBottom: '1px solid var(--glass-border)',
            padding: '1rem',
            zIndex: 1000
          }}>
            <button onClick={handleLogout} className="btn btn-secondary" style={{ width: '100%' }}>
              🚪 Logout
            </button>
          </div>
        )}
      </nav>
    </>
  )
}