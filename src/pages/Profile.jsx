import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'

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
      <div className="min-h-screen flex items-center justify-center bg-black text-white">
        <div className="animate-pulse">Loading...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen pb-20 bg-gradient-to-br from-black via-red-950 to-black">
      <header className="bg-black/50 backdrop-blur-md border-b border-red-900/30 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              👤 My Profile
            </h1>
            <p className="text-sm text-gray-400">
              View your profile and activities
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate(-1)}
            >
              ← Back
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleLogout}
            >
              🚪 Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Profile Info */}
        <Card className="mb-6">
          <h2 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-2">Profile Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <p className="text-gray-400 text-sm mb-1">Name</p>
              <p className="text-white font-semibold text-lg">{userData?.name || 'Not set'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Phone Number</p>
              <p className="text-white font-semibold text-lg">{userData?.phone_number || 'N/A'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Email</p>
              <p className="text-white font-semibold text-lg">{userData?.email || 'Not set'}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Role</p>
              <p className="text-white font-semibold text-lg capitalize">{getRoleDisplay(userData?.role || 'tourist')}</p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Coin Balance</p>
              <p className="text-amber-400 font-bold text-lg">
                {userData?.coin_balance || 0} Coins
              </p>
            </div>
            <div>
              <p className="text-gray-400 text-sm mb-1">Pending Coins</p>
              <p className="text-yellow-600 font-bold text-lg">
                {userData?.pending_coins || 0} Coins
              </p>
            </div>
            {userData?.merchant_coins > 0 && (
              <div>
                <p className="text-gray-400 text-sm mb-1">Merchant Coins</p>
                <p className="text-green-400 font-bold text-lg">
                  {userData.merchant_coins} Coins
                </p>
              </div>
            )}
            <div>
              <p className="text-gray-400 text-sm mb-1">Member Since</p>
              <p className="text-white font-semibold text-lg">
                {userData?.created_at ? new Date(userData.created_at).toLocaleDateString() : 'N/A'}
              </p>
            </div>
          </div>
        </Card>

        {/* Recent Transactions */}
        <Card className="mb-6">
          <h2 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-2">Recent Transactions</h2>
          {transactions.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No transactions yet</p>
          ) : (
            <div className="space-y-3">
              {transactions.map(tx => (
                <div
                  key={tx.tx_id}
                  className="bg-white/5 p-4 rounded-lg border border-white/10 flex justify-between items-center hover:bg-white/10 transition-colors"
                >
                  <div>
                    <p className="text-white font-semibold mb-1">
                      {tx.description || `${tx.type} - ${tx.coins_amount} coins`}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(tx.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-lg ${tx.type === 'earned' ? 'text-green-400' : 'text-red-400'}`}>
                      {tx.type === 'earned' ? '+' : '-'}{tx.coins_amount} Coins
                    </p>
                    {tx.bill_amount && (
                      <p className="text-xs text-gray-400">
                        Bill: ₹{tx.bill_amount.toFixed(2)}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Recent Reports */}
        <Card>
          <h2 className="text-xl font-bold text-white mb-6 border-b border-white/10 pb-2">Recent Reports</h2>
          {reports.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No reports yet</p>
          ) : (
            <div className="space-y-3">
              {reports.map(report => (
                <div
                  key={report.report_id}
                  className="bg-white/5 p-4 rounded-lg border border-white/10 hover:bg-white/10 transition-colors"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-white font-semibold mb-1">
                        {report.type.charAt(0).toUpperCase() + report.type.slice(1)} Report
                      </p>
                      {report.description && (
                        <p className="text-sm text-gray-300 mb-1">
                          {report.description}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        {new Date(report.created_at).toLocaleString()}
                      </p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${report.status === 'verified' ? 'bg-green-500/20 text-green-300' :
                        report.status === 'cleared' ? 'bg-blue-500/20 text-blue-300' :
                          report.status === 'rejected' ? 'bg-red-500/20 text-red-300' :
                            'bg-yellow-500/20 text-yellow-300'
                      }`}>
                      {report.status}
                    </span>
                  </div>
                  {report.coins_awarded > 0 && (
                    <p className="text-green-400 text-sm font-medium mt-2">
                      +{report.coins_awarded} Coins Awarded
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </main>
    </div>
  )
}
