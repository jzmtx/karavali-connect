import { useState } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate, Link } from 'react-router-dom'

export default function Login() {
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [selectedRole, setSelectedRole] = useState('tourist')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    if (!phone || !password) {
      setError('Please enter phone number and password')
      setLoading(false)
      return
    }

    try {
      // Find user by phone number
      const { data: userData, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('phone_number', phone)
        .maybeSingle()

      if (fetchError) throw fetchError

      if (!userData) {
        setError('User not found. Please register first.')
        setLoading(false)
        return
      }

      // Simple password check (in production, use proper hashing)
      // For now, we'll check if password_hash exists and matches
      // If no password_hash, allow login (for existing users)
      if (userData.password_hash) {
        // In production, use bcrypt or similar to compare
        // For now, simple comparison (NOT SECURE - for demo only)
        if (userData.password_hash !== password) {
          setError('Invalid password')
          setLoading(false)
          return
        }
      } else {
        // If user has no password, set it now
        await supabase
          .from('users')
          .update({ password_hash: password })
          .eq('id', userData.id)
      }

      // Store user in localStorage
      const userSession = {
        id: userData.id,
        phone_number: userData.phone_number,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        coin_balance: userData.coin_balance || 0
      }
      
      localStorage.setItem('karavali_user', JSON.stringify(userSession))
      
      // Dispatch event to notify other components
      window.dispatchEvent(new Event('karavali_user_changed'))

      // Check if role matches selection
      if (selectedRole === 'authority' && !['municipality', 'beach_authority', 'fisheries_department', 'admin'].includes(userData.role)) {
        setError('Invalid credentials for authority login')
        setLoading(false)
        return
      }
      
      if (selectedRole === 'tourist' && ['municipality', 'beach_authority', 'fisheries_department', 'admin'].includes(userData.role)) {
        setError('Invalid credentials for tourist login')
        setLoading(false)
        return
      }

      // Navigate based on role with replace to prevent back navigation
      if (userData.role === 'merchant') {
        navigate('/merchant', { replace: true })
      } else if (userData.role === 'admin') {
        navigate('/authority', { replace: true })
      } else if (['municipality', 'beach_authority', 'fisheries_department'].includes(userData.role)) {
        navigate('/authority', { replace: true })
      } else {
        navigate('/user', { replace: true })
      }
    } catch (err) {
      console.error('Login error:', err)
      setError(err.message || 'Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: '400px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-red)', marginBottom: '0.5rem' }}>
            🌊 Karavali Connect
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.8)' }}>Clean. Earn. Stay Safe.</p>
        </div>

        {/* Role Selection */}
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontWeight: '500' }}>
            Login As:
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              type="button"
              onClick={() => setSelectedRole('tourist')}
              className={`btn ${selectedRole === 'tourist' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, fontSize: '0.875rem' }}
            >
              🏖️ Tourist
            </button>
            <button
              type="button"
              onClick={() => setSelectedRole('authority')}
              className={`btn ${selectedRole === 'authority' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ flex: 1, fontSize: '0.875rem' }}
            >
              🏛️ Authority
            </button>
          </div>
        </div>

        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ marginBottom: '1.5rem' }}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontWeight: '500' }}>
              Phone Number
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 9876543210"
              required
              className="form-input"
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontWeight: '500' }}>
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="form-input"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary"
            style={{
              width: '100%',
              background: loading ? '#9ca3af' : undefined,
              cursor: loading ? 'not-allowed' : 'pointer'
            }}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <p style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.875rem' }}>
            Don't have an account?{' '}
            <Link to="/register" style={{ color: 'var(--accent-red)', fontWeight: '600', textDecoration: 'none' }}>
              Create Account
            </Link>
          </p>
        </div>


      </div>
    </div>
  )
}
