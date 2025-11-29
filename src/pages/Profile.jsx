import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function Profile({ user }) {
  const [userData, setUserData] = useState(null)
  const [transactions, setTransactions] = useState([])
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    if (!user) {
      navigate('/login')
      return
    }
    loadProfileData()
  }, [user])

  const loadProfileData = async () => {
    try {
      // Load user data
      const { data: userInfo } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (userInfo) {
        setUserData(userInfo)
      }

      // Load transactions
      const { data: txData } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (txData) {
        setTransactions(txData)
      }

      // Load reports
      const { data: reportData } = await supabase
        .from('reports')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20)

      if (reportData) {
        setReports(reportData)
      }
    } catch (err) {
      console.error('Error loading profile:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('karavali_user')
    window.dispatchEvent(new Event('karavali_user_changed'))
    navigate('/login')
    window.location.reload()
  }

  const getRoleDisplay = (role) => {
    const roles = {
      tourist: '👤 Tourist/User',
      merchant: '🏪 Merchant',
      municipality: '🏛️ Municipality',
      beach_authority: '🏖️ Beach Authority',
      forest_department: '🌲 Forest Department',
      admin: '👑 Admin'
    }
    return roles[role] || role
  }

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div>Loading...</div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <header style={{
        background: 'linear-gradient(135deg, #000000 0%, #1a0000 50%, #8B0000 100%)',
        color: 'white',
        padding: '1rem',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', margin: 0 }}>👤 My Profile</h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '0.875rem' }}>
              View your profile and activities
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => navigate('/user')}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '0.875rem'
              }}
            >
              ← Back
            </button>
            <button
              onClick={handleLogout}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: '1px solid rgba(255,255,255,0.3)',
                color: 'white',
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: '500',
                fontSize: '0.875rem'
              }}
            >
              🚪 Logout
            </button>
          </div>
        </div>
      </header>

      <main style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto' }}>
        {/* Profile Info */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '1rem'
        }}>
          <h2 style={{ marginBottom: '1rem', color: '#8B0000' }}>Profile Information</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <div>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Name</p>
              <p style={{ fontWeight: '600', fontSize: '1.125rem' }}>{userData?.name || 'Not set'}</p>
            </div>
            <div>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Phone Number</p>
              <p style={{ fontWeight: '600', fontSize: '1.125rem' }}>{userData?.phone_number || 'N/A'}</p>
            </div>
            <div>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Email</p>
              <p style={{ fontWeight: '600', fontSize: '1.125rem' }}>{userData?.email || 'Not set'}</p>
            </div>
            <div>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Role</p>
              <p style={{ fontWeight: '600', fontSize: '1.125rem' }}>{getRoleDisplay(userData?.role || 'tourist')}</p>
            </div>
            <div>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Coin Balance</p>
              <p style={{ fontWeight: '600', fontSize: '1.125rem', color: '#8B0000' }}>
                {userData?.coin_balance || 0} Coins
              </p>
            </div>
            <div>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Pending Coins</p>
              <p style={{ fontWeight: '600', fontSize: '1.125rem', color: '#f59e0b' }}>
                {userData?.pending_coins || 0} Coins
              </p>
            </div>
            {userData?.merchant_coins > 0 && (
              <div>
                <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Merchant Coins</p>
                <p style={{ fontWeight: '600', fontSize: '1.125rem', color: '#10b981' }}>
                  {userData.merchant_coins} Coins
                </p>
              </div>
            )}
            <div>
              <p style={{ color: '#6b7280', fontSize: '0.875rem', marginBottom: '0.25rem' }}>Member Since</p>
              <p style={{ fontWeight: '600', fontSize: '1.125rem' }}>
                {userData?.created_at ? new Date(userData.created_at).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
          marginBottom: '1rem'
        }}>
          <h2 style={{ marginBottom: '1rem', color: '#8B0000' }}>Recent Transactions</h2>
          {transactions.length === 0 ? (
            <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>No transactions yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {transactions.map(tx => (
                <div
                  key={tx.tx_id}
                  style={{
                    padding: '1rem',
                    background: '#f9fafb',
                    borderRadius: '8px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <p style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                      {tx.description || `${tx.type} - ${tx.coins_amount} coins`}
                    </p>
                    <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                      {new Date(tx.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{
                      fontWeight: '600',
                      fontSize: '1.125rem',
                      color: tx.type === 'earned' ? '#10b981' : '#ef4444'
                    }}>
                      {tx.type === 'earned' ? '+' : '-'}{tx.coins_amount} Coins
                    </p>
                    {tx.bill_amount && (
                      <p style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        Bill: ₹{tx.bill_amount.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Reports */}
        <div style={{
          background: 'white',
          borderRadius: '12px',
          padding: '1.5rem',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <h2 style={{ marginBottom: '1rem', color: '#8B0000' }}>Recent Reports</h2>
          {reports.length === 0 ? (
            <p style={{ color: '#6b7280', textAlign: 'center', padding: '2rem' }}>No reports yet</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {reports.map(report => (
                <div
                  key={report.report_id}
                  style={{
                    padding: '1rem',
                    background: '#f9fafb',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                    <div>
                      <p style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                        {report.type.charAt(0).toUpperCase() + report.type.slice(1)} Report
                      </p>
                      {report.description && (
                        <p style={{ fontSize: '0.875rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                          {report.description}
                        </p>
                      )}
                      <p style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                        {new Date(report.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span style={{
                      padding: '0.25rem 0.5rem',
                      background: report.status === 'verified' ? '#10b981' :
                                 report.status === 'cleared' ? '#1e40af' :
                                 report.status === 'rejected' ? '#ef4444' : '#f59e0b',
                      color: 'white',
                      borderRadius: '4px',
                      fontSize: '0.75rem',
                      fontWeight: '600',
                      textTransform: 'capitalize'
                    }}>
                      {report.status}
                    </span>
                  </div>
                  {report.coins_awarded > 0 && (
                    <p style={{ fontSize: '0.875rem', color: '#10b981', marginTop: '0.5rem' }}>
                      +{report.coins_awarded} Coins Awarded
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}

