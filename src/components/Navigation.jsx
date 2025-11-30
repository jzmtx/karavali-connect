import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Navigation({ user, currentPage, tabs, activeTab, onTabChange }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const navigate = useNavigate()

  const handleLogout = () => {
    localStorage.removeItem('karavali_user')
    window.dispatchEvent(new Event('karavali_user_changed'))
    navigate('/login', { replace: true })
  }

  const getNavigationItems = () => {
    const commonItems = [
      { id: 'home', label: 'Home', icon: '🏠', action: () => navigate('/') }
    ];
    
    if (currentPage === 'user') {
      return [
        ...commonItems,
        { id: 'dashboard', label: 'Dashboard', icon: '📊', action: () => navigate('/dashboard') },
        { id: 'map', label: 'Interactive Map', icon: '🗺️', action: () => navigate('/user') },
        { id: 'activities', label: 'Activities', icon: '🏃', divider: true },
        { id: 'bin', label: 'Report Bin', icon: '🗑️', action: () => navigate('/user?tab=bin') },
        { id: 'cleanup', label: 'Beach Cleanup', icon: '🧹', action: () => navigate('/user?tab=cleanup') },
        { id: 'dispose', label: 'Dispose & Earn', icon: '♻️', action: () => navigate('/user?tab=dispose') },
        { id: 'safety', label: 'Safety Report', icon: '⚠️', action: () => navigate('/user?tab=safety') },
        { id: 'services', label: 'Services', icon: '🛍️', divider: true },
        { id: 'merchants', label: 'Local Merchants', icon: '🏪', action: () => navigate('/user?tab=merchants') },
        { id: 'wallet', label: 'My Wallet', icon: '💰', action: () => navigate('/user?tab=wallet') },
        { id: 'account', label: 'Account', icon: '⚙️', divider: true },
        { id: 'profile', label: 'Profile Settings', icon: '👤', action: () => navigate('/user?tab=profile') },
        { id: 'logout', label: 'Logout', icon: '🚪', action: handleLogout }
      ]
    } else if (currentPage === 'merchant') {
      const merchantItems = [
        ...commonItems,
        { id: 'business', label: 'Business', icon: '🏢', divider: true }
      ]
      
      // Add dynamic tabs from MerchantPortal
      if (tabs) {
        tabs.forEach(tab => {
          merchantItems.push({
            id: tab.id,
            label: tab.label,
            icon: tab.icon,
            action: () => onTabChange(tab.id),
            isActive: activeTab === tab.id
          })
        })
      }
      
      merchantItems.push(
        { id: 'account', label: 'Account', icon: '⚙️', divider: true },
        { id: 'logout', label: 'Logout', icon: '🚪', action: handleLogout }
      )
      
      return merchantItems
    } else if (currentPage === 'authority') {
      const authorityItems = [
        ...commonItems,
        { id: 'management', label: 'Management', icon: '🏛️', divider: true }
      ]
      
      // Add dynamic tabs from AuthorityPortal
      if (tabs) {
        tabs.forEach(tab => {
          authorityItems.push({
            id: tab.id,
            label: tab.label,
            icon: tab.icon,
            action: () => onTabChange(tab.id),
            isActive: activeTab === tab.id
          })
        })
      }
      
      authorityItems.push(
        { id: 'account', label: 'Account', icon: '⚙️', divider: true },
        { id: 'logout', label: 'Logout', icon: '🚪', action: handleLogout }
      )
      
      return authorityItems
    }
    
    return [
      ...commonItems,
      { id: 'profile', label: 'Profile Settings', icon: '👤', action: () => navigate('/profile') },
      { id: 'logout', label: 'Logout', icon: '🚪', action: handleLogout }
    ]
  }

  return (
    <>
      {/* Sidebar Toggle Button */}
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="sidebar-toggle"
        aria-label="Toggle navigation"
      >
        <span className="toggle-icon">{isSidebarOpen ? '✕' : '☰'}</span>
      </button>

      {/* Professional Sidebar */}
      <div className={`professional-sidebar ${isSidebarOpen ? 'open' : ''}`}>
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <button 
            className="sidebar-close"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            ✕
          </button>
          <div className="sidebar-logo">
            <div className="logo-icon">🌊</div>
            <div className="logo-text">
              <div className="logo-title">Karavali Connect</div>
              <div className="logo-subtitle">Coastal Management</div>
            </div>
          </div>
        </div>

        {/* User Profile Section */}
        <div className="sidebar-profile">
          <div className="profile-avatar">
            {currentPage === 'user' ? '👤' : 
             currentPage === 'merchant' ? '🏪' :
             currentPage === 'authority' ? '🏛️' : '👑'}
          </div>
          <div className="profile-info">
            <div className="profile-name">{user?.phone_number}</div>
            <div className="profile-role">{user?.role?.replace('_', ' ')}</div>
            <div className="profile-status">
              {currentPage === 'user' && (
                <><span className="status-icon">💰</span> {user?.coin_balance || 0} Coins</>
              )}
              {currentPage === 'merchant' && (
                <><span className="status-icon">💰</span> {user?.merchant_coins || 0} Coins</>
              )}
              {(currentPage === 'authority' || currentPage === 'admin') && (
                <><span className="status-icon">✅</span> Authorized</>
              )}
            </div>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="sidebar-nav">
          {getNavigationItems().map((item) => (
            <div key={item.id}>
              {item.divider && <div className="nav-divider">{item.label}</div>}
              {!item.divider && (
                <button
                  onClick={() => {
                    item.action()
                    setIsSidebarOpen(false)
                  }}
                  className={`nav-item ${item.isActive ? 'active' : ''}`}
                >
                  <span className="nav-icon">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </button>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Sidebar Overlay */}
      {isSidebarOpen && (
        <div 
          className="sidebar-overlay" 
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
    </>
  )
}