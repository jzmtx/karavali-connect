import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Navigation({ user, currentPage }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    
    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)
    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

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
      case 'admin': return '👑 Admin Panel'
      default: return '🌊 Karavali Connect'
    }
  }

  const getPageInfo = () => {
    switch (currentPage) {
      case 'user': return `Coins: ${user?.coin_balance || 0} • Report & Earn`
      case 'merchant': return `Merchant Coins: ${user?.merchant_coins || 0} • Scan QR codes to redeem`
      case 'authority': return 'Manage reports & payments'
      case 'admin': return 'System administration'
      default: return 'Coastal civic engagement'
    }
  }

  const navigationItems = [
    { id: 'profile', label: '👤 Profile', action: () => navigate('/profile') },
    { id: 'logout', label: '🚪 Logout', action: handleLogout }
  ]

  const closeMobileMenu = () => setIsMobileMenuOpen(false)

  return (
    <>
      {/* Desktop Navigation */}
      {!isMobile && (
        <nav className="desktop-nav">
          <h1 className="nav-title">
            {getPageTitle()}
          </h1>
          
          <div className="nav-actions">
            <div className="nav-info">
              {getPageInfo()}
            </div>
            <button onClick={handleLogout} className="btn btn-secondary">
              🚪 Logout
            </button>
          </div>
        </nav>
      )}

      {/* Mobile Navigation */}
      {isMobile && (
        <>
          <nav className="mobile-nav">
            <h1 className="mobile-nav-title">
              {getPageTitle()}
            </h1>
            
            <div className="mobile-nav-actions">
              <div className="mobile-nav-info">
                {currentPage === 'user' ? `${user?.coin_balance || 0} 🪙` : 
                 currentPage === 'merchant' ? `${user?.merchant_coins || 0} 🪙` :
                 getPageTitle().split(' ')[0]}
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="mobile-menu-toggle"
                aria-label="Toggle menu"
              >
                {isMobileMenuOpen ? '✕' : '☰'}
              </button>
            </div>
          </nav>

          {/* Mobile Sidebar Overlay */}
          {isMobileMenuOpen && (
            <div className="mobile-sidebar-overlay" onClick={closeMobileMenu}>
              <div className="mobile-sidebar" onClick={(e) => e.stopPropagation()}>
                <div className="mobile-sidebar-header">
                  <h2>🌊 Karavali Connect</h2>
                  <button 
                    onClick={closeMobileMenu}
                    className="mobile-sidebar-close"
                    aria-label="Close menu"
                  >
                    ✕
                  </button>
                </div>
                
                <div className="mobile-sidebar-content">
                  <div className="mobile-user-info">
                    <div className="mobile-user-avatar">
                      {currentPage === 'user' ? '👤' : 
                       currentPage === 'merchant' ? '🏪' :
                       currentPage === 'authority' ? '🏛️' : '👑'}
                    </div>
                    <div className="mobile-user-details">
                      <div className="mobile-user-phone">{user?.phone_number}</div>
                      <div className="mobile-user-role">{user?.role?.replace('_', ' ')}</div>
                      <div className="mobile-user-coins">
                        {currentPage === 'user' && `${user?.coin_balance || 0} Coins`}
                        {currentPage === 'merchant' && `${user?.merchant_coins || 0} Merchant Coins`}
                        {(currentPage === 'authority' || currentPage === 'admin') && 'Authority Access'}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mobile-sidebar-menu">
                    {navigationItems.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          item.action()
                          closeMobileMenu()
                        }}
                        className="mobile-sidebar-item"
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </>
  )
}