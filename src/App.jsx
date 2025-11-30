import { Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Login from './pages/Login'
import Register from './pages/Register'
import HomePage from './pages/HomePage'
import UserPortal from './pages/UserPortal'
import MerchantPortal from './pages/MerchantPortal'
import AuthorityPortal from './pages/AuthorityPortal'
import AdminPanel from './pages/AdminPanel'
import Profile from './pages/Profile'
import Loading from './components/Loading'
import ResponsiveLayout from './components/ResponsiveLayout'
// import LocationHelper from './components/LocationHelper'

function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for user in localStorage
    const loadUser = () => {
      const storedUser = localStorage.getItem('karavali_user')
      if (storedUser) {
        try {
          const userData = JSON.parse(storedUser)
          setUser(userData)
        } catch (e) {
          console.error('Failed to parse user data:', e)
          localStorage.removeItem('karavali_user')
          setUser(null)
        }
      } else {
        setUser(null)
      }
      setLoading(false)
    }

    loadUser()

    // Listen for storage changes (for logout from other tabs)
    const handleStorageChange = (e) => {
      if (e.key === 'karavali_user') {
        loadUser()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    
    // Also listen for custom event for same-tab logout
    const handleUserChange = () => {
      loadUser()
    }
    window.addEventListener('karavali_user_changed', handleUserChange)

    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('karavali_user_changed', handleUserChange)
    }
  }, [])

  if (loading) {
    return <Loading />
  }

  return (
    <ResponsiveLayout>
      {/* Temporary test helper - remove in production */}
      {/* {process.env.NODE_ENV === 'development' && <LocationHelper />} */}
      <Routes>
      <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
      <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
      <Route
        path="/"
        element={<HomePage user={user} />}
      />
      <Route
        path="/dashboard"
        element={
          user ? (
            <Navigate to={
              user.role === 'merchant' ? '/merchant' : 
              user.role === 'admin' ? '/admin' : 
              ['municipality', 'beach_authority', 'forest_department'].includes(user.role) ? '/authority' : 
              '/user'
            } />
          ) : (
            <Navigate to="/login" />
          )
        }
      />
      <Route
        path="/user"
        element={user ? <UserPortal user={user} /> : <Navigate to="/login" />}
      />
      <Route
        path="/merchant"
        element={user ? <MerchantPortal user={user} /> : <Navigate to="/login" />}
      />
      <Route
        path="/authority"
        element={user && ['municipality', 'beach_authority', 'forest_department', 'admin'].includes(user.role) ? <AuthorityPortal user={user} /> : <Navigate to="/login" />}
      />
      <Route
        path="/admin"
        element={user && user.role === 'admin' ? <AdminPanel user={user} /> : <Navigate to="/login" />}
      />
      <Route
        path="/profile"
        element={user ? <Profile user={user} /> : <Navigate to="/login" />}
      />
      </Routes>
    </ResponsiveLayout>
  )
}

export default App

