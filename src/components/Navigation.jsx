import { useState } from 'react'
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

    if (!user) {
      return [
        ...commonItems,
        { id: 'login', label: 'Login', icon: '🔑', action: () => navigate('/login') },
        { id: 'register', label: 'Register', icon: '📝', action: () => navigate('/register') }
      ]
    }

    // Role-based navigation
    const isMerchant = user.role === 'merchant';
    const isAuthority = ['municipality', 'beach_authority', 'forest_department'].includes(user.role);
    const isAdmin = user.role === 'admin';
    const isUser = !isMerchant && !isAuthority && !isAdmin;

    let roleItems = [];

    if (isUser) {
      roleItems = [
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
      ];
    } else if (isMerchant) {
      roleItems = [
        { id: 'business', label: 'Business', icon: '🏢', divider: true },
        // Default Merchant Items (if tabs not provided)
        { id: 'register', label: 'Beach Registration', icon: '🏖️', action: () => navigate('/merchant?tab=register') },
        { id: 'scan', label: 'Scan Customer QR', icon: '📷', action: () => navigate('/merchant?tab=scan') },
        { id: 'payments', label: 'Payment Requests', icon: '💳', action: () => navigate('/merchant?tab=payments') },
      ];
    } else if (isAuthority) {
      roleItems = [
        { id: 'management', label: 'Management', icon: '🏛️', divider: true },
        // Default Authority Items
        { id: 'reports', label: 'Reports', icon: '📋', action: () => navigate('/authority?tab=reports') },
        { id: 'analytics', label: 'Analytics', icon: '📊', action: () => navigate('/authority?tab=analytics') },
      ];

      // Role specific additions
      if (user.role === 'beach_authority' || user.role === 'municipality') {
        roleItems.splice(1, 0, { id: 'beach', label: 'Beach Selection', icon: '🏖️', action: () => navigate('/authority?tab=beach') });
      }
      if (user.role === 'municipality') {
        roleItems.push({ id: 'bins', label: 'Bin Management', icon: '🗑️', action: () => navigate('/authority?tab=bins') });
      }
    } else if (isAdmin) {
      roleItems = [
        { id: 'admin', label: 'Admin Panel', icon: '👑', divider: true },
        { id: 'users', label: 'Users', icon: '👥', action: () => navigate('/admin?tab=users') },
        { id: 'reports', label: 'All Reports', icon: '📋', action: () => navigate('/admin?tab=reports') },
        { id: 'payments', label: 'Payments', icon: '💳', action: () => navigate('/admin?tab=payments') },
      ];
    }

    // If tabs are explicitly provided (we are on the portal page), override the default role items
    // Actually, we should probably merge them or just use the tabs if available for better state management?
    // The issue is that 'tabs' prop usually comes with 'onTabChange' which is better than navigating.
    // But for the sidebar, navigating is fine.
    // Let's stick to the defaults for consistency across pages, unless we want to highlight the active tab.

    // If we are on the specific portal page (currentPage matches role), we can use the passed tabs to highlight or ensure exact match.
    // But for simplicity and to fix the "Home" issue, let's use the static list we just built, 
    // and maybe map the 'activeTab' to highlight the correct item.

    // Wait, if we are on the portal, we want `onTabChange` to be called instead of `navigate`.
    // So we should map the static items to use `onTabChange` if available and if the item ID matches a passed tab.

    if (tabs && onTabChange) {
      // If tabs are provided, use them as the source of truth for navigation
      // This ensures the sidebar matches the portal's available tabs
      const divider = roleItems.find(item => item.divider);

      roleItems = tabs.map(tab => ({
        id: tab.id,
        label: tab.label,
        icon: tab.icon,
        action: () => onTabChange(tab.id),
        isActive: activeTab === tab.id
      }));

      // Re-add the divider if it existed
      if (divider) {
        roleItems.unshift(divider);
      }
    }

    return [
      ...commonItems,
      ...roleItems,
      { id: 'account', label: 'Account', icon: '⚙️', divider: true },
      { id: 'profile', label: 'Profile Settings', icon: '👤', action: () => navigate('/profile') },
      { id: 'logout', label: 'Logout', icon: '🚪', action: handleLogout }
    ]
  }

  return (
    <>
      <button
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
        className="sidebar-toggle hidden md:flex"
        aria-label="Toggle navigation"
      >
        <span className="toggle-icon">{isSidebarOpen ? '✕' : '☰'}</span>
      </button>

      <div className={`professional-sidebar ${isSidebarOpen ? 'open' : ''}`}>
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

        <div className="sidebar-profile">
          <div className="profile-avatar">
            {user?.role === 'merchant' ? '🏪' :
              ['municipality', 'beach_authority', 'forest_department'].includes(user?.role) ? '🏛️' :
                user?.role === 'admin' ? '👑' : '👤'}
          </div>
          <div className="profile-info">
            <div className="profile-name">{user?.phone_number || 'Guest'}</div>
            <div className="profile-role">{user?.role?.replace('_', ' ') || 'Visitor'}</div>
            {user && (
              <div className="text-xs text-amber-400 mt-1">
                {user.role === 'merchant' && `💰 ${user.merchant_coins || 0} Coins`}
                {(!user.role || user.role === 'tourist') && `💰 ${user.coin_balance || 0} Coins`}
                {(['municipality', 'beach_authority', 'forest_department', 'admin'].includes(user.role)) && '✅ Authorized'}
              </div>
            )}
          </div>
        </div>

        <nav className="sidebar-nav">
          {getNavigationItems().map((item, index) => (
            <div key={item.id || index}>
              {item.divider && <div className="nav-divider">{item.label}</div>}
              {!item.divider && (
                <button
                  onClick={() => {
                    item.action()
                    setIsSidebarOpen(false)
                  }}
                  className={`nav-item ${item.isActive || (currentPage === 'home' && item.id === 'home') ? 'active' : ''}`}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </button>
              )}
            </div>
          ))}
        </nav>
      </div>

      {isSidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setIsSidebarOpen(false)}
        ></div>
      )}
      {/* Bottom Navigation for Mobile */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-lg border-t border-white/10 z-50 pb-safe">
        <div className="flex justify-around items-center h-16">
          {user && !['admin', 'merchant', 'municipality', 'beach_authority', 'fisheries_department'].includes(user.role) ? (
            <>
              <button
                onClick={() => navigate('/user')}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${currentPage === 'user' && (!activeTab || activeTab === 'map') ? 'text-blue-400' : 'text-gray-400'}`}
              >
                <span className="text-xl">🗺️</span>
                <span className="text-[10px] font-medium">Map</span>
              </button>
              <button
                onClick={() => navigate('/user?tab=bin')}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'bin' ? 'text-blue-400' : 'text-gray-400'}`}
              >
                <span className="text-xl">🗑️</span>
                <span className="text-[10px] font-medium">Bin</span>
              </button>
              <button
                onClick={() => navigate('/user?tab=cleanup')}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'cleanup' ? 'text-blue-400' : 'text-gray-400'}`}
              >
                <span className="text-xl">🧹</span>
                <span className="text-[10px] font-medium">Cleanup</span>
              </button>
              <button
                onClick={() => navigate('/user?tab=wallet')}
                className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${activeTab === 'wallet' ? 'text-blue-400' : 'text-gray-400'}`}
              >
                <span className="text-xl">💰</span>
                <span className="text-[10px] font-medium">Wallet</span>
              </button>
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="flex flex-col items-center justify-center w-full h-full space-y-1 text-gray-400"
              >
                <span className="text-xl">☰</span>
                <span className="text-[10px] font-medium">Menu</span>
              </button>
            </>
          ) : (
            // Fallback for other roles or guests - simpler nav
            <>
              <button
                onClick={() => navigate('/')}
                className="flex flex-col items-center justify-center w-full h-full space-y-1 text-gray-400"
              >
                <span className="text-xl">🏠</span>
                <span className="text-[10px] font-medium">Home</span>
              </button>
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="flex flex-col items-center justify-center w-full h-full space-y-1 text-gray-400"
              >
                <span className="text-xl">☰</span>
                <span className="text-[10px] font-medium">Menu</span>
              </button>
            </>
          )}
        </div>
      </div>
    </>
  )
}