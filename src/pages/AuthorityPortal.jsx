import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Navigation from '../components/Navigation'
import LocationSearch from '../components/LocationSearch'
import BeachSelector from '../components/BeachSelector'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import QRious from 'qrious'
import { notificationService } from '../services/notificationService'
import NotificationBell from '../components/NotificationBell'
import NotificationToast from '../components/NotificationToast'

export default function AuthorityPortal({ user }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'reports')
  const [reports, setReports] = useState([])
  const [paymentRequests, setPaymentRequests] = useState([])
  const [users, setUsers] = useState([])
  const [bins, setBins] = useState([])
  const [safetyReports, setSafetyReports] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [showUserForm, setShowUserForm] = useState(false)
  const [showBinForm, setShowBinForm] = useState(false)
  const [newUser, setNewUser] = useState({ phone_number: '', role: 'beach_authority', password: '' })
  const [newBin, setNewBin] = useState({ bin_id: '', gps_lat: '', gps_lng: '', location_name: '' })
  const [selectedBeach, setSelectedBeach] = useState(null)
  const [foregroundNotification, setForegroundNotification] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const tab = searchParams.get('tab') || 'reports'
    setActiveTab(tab)
  }, [searchParams])

  useEffect(() => {
    if (user?.role === 'admin') {
      loadUsers()
      loadReports()
      loadPaymentRequests()
      loadBins()
    } else if (user?.role === 'beach_authority') {
      loadPaymentRequests()
      loadSafetyReports()
    } else if (user?.role === 'municipality') {
      loadBins()
      loadBinReports()
    } else if (user?.role === 'fisheries_department') {
      loadGhostNetReports()
      loadFisheriesSafetyReports()
    } else {
      loadReports()
    }

    // Request notification permission
    if (user) {
      notificationService.requestPermission(user.id)
    }
  }, [user])

  // Listen for foreground notifications
  useEffect(() => {
    const setupForegroundListener = async () => {
      try {
        notificationService.onMessageListener().then(payload => {
          console.log('Received foreground notification:', payload)
          setForegroundNotification(payload)

          // Refresh data based on notification type
          const notifType = payload.data?.type
          if (notifType === 'payment_request') {
            loadPaymentRequests()
          } else if (notifType === 'safety_report') {
            loadSafetyReports()
          } else if (notifType === 'bin_overflow') {
            loadBins()
          } else {
            loadReports()
          }
        })
      } catch (error) {
        console.error('Error setting up foreground listener:', error)
      }
    }

    setupForegroundListener()
  }, [])

  const loadReports = async () => {
    if (!user) return
    const { data } = await supabase
      .from('reports')
      .select(`
        *,
        users!reports_user_id_fkey(phone_number)
      `)
      .order('created_at', { ascending: false })
      .limit(50)

    if (data) {
      setReports(data)
    }
  }

  const loadPaymentRequests = async () => {
    if (!user) return

    if (user.role === 'beach_authority') {
      const { data } = await supabase
        .rpc('get_beach_payment_requests', {
          authority_id: user.id
        })

      if (data) {
        setPaymentRequests(data)
      }
    } else {
      const { data } = await supabase
        .from('payment_requests')
        .select(`
          *,
          users!payment_requests_merchant_id_fkey(phone_number)
        `)
        .order('created_at', { ascending: false })

      if (data) {
        setPaymentRequests(data)
      }
    }
  }

  const loadUsers = async () => {
    if (!user || user.role !== 'admin') return
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      setUsers(data)
    }
  }

  const updateReportStatus = async (reportId, status) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('reports')
        .update({ status })
        .eq('report_id', reportId)

      if (error) throw error

      setMessage(`Report ${status} successfully`)
      loadReports()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleBeachAssignment = async (beach) => {
    if (user.assigned_beach_id) {
      setError('You already have a beach assigned')
      return
    }

    setLoading(true)
    try {
      const { data, error } = await supabase
        .rpc('assign_beach_to_authority', {
          authority_id: user.id,
          beach_id_param: beach.beach_id
        })

      if (error) throw error

      if (!data.success) {
        throw new Error(data.error)
      }

      setMessage(`✅ Beach assigned successfully: ${data.beach_name}`)
      // Update user object
      user.assigned_beach_id = beach.beach_id
      setSelectedBeach(beach)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const updatePaymentRequest = async (requestId, status) => {
    setLoading(true)
    try {
      const updates = {
        status,
        approved_by: user.id,
        approved_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('payment_requests')
        .update(updates)
        .eq('request_id', requestId)

      if (error) throw error

      setMessage(`Payment request ${status} successfully`)
      loadPaymentRequests()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const createUser = async () => {
    if (!newUser.phone_number || !newUser.password) {
      setError('Phone number and password are required')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase
        .from('users')
        .insert({
          phone_number: newUser.phone_number,
          role: newUser.role,
          password_hash: newUser.password, // In production, hash this
          coin_balance: 0,
          pending_coins: 0
        })

      if (error) throw error

      setMessage(`User created successfully with role: ${newUser.role}`)
      setNewUser({ phone_number: '', role: 'beach_authority', password: '' })
      setShowUserForm(false)
      loadUsers()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const updateUserRole = async (userId, newRole) => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error

      setMessage(`User role updated to ${newRole}`)
      loadUsers()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const deleteUser = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return

    setLoading(true)
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      if (error) throw error

      setMessage('User deleted successfully')
      loadUsers()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const loadBins = async () => {
    if (user?.role === 'municipality') {
      const { data } = await supabase
        .rpc('get_municipality_bins', {
          municipality_id: user.id
        })

      if (data) setBins(data)
    } else {
      const { data } = await supabase
        .from('bins')
        .select('*')
        .order('created_at', { ascending: false })

      if (data) setBins(data)
    }
  }

  const loadBinReports = async () => {
    if (user?.role === 'municipality') {
      const { data } = await supabase
        .rpc('get_beach_authority_reports', {
          authority_id: user.id
        })

      if (data) {
        const binData = data.filter(report => report.type === 'bin')
        setReports(binData)
      }
    } else {
      const { data } = await supabase
        .from('reports')
        .select(`*, users!reports_user_id_fkey(phone_number)`)
        .eq('type', 'bin')
        .order('created_at', { ascending: false })

      if (data) setReports(data)
    }
  }

  const loadSafetyReports = async () => {
    if (user?.role === 'beach_authority') {
      const { data } = await supabase
        .rpc('get_beach_authority_reports', {
          authority_id: user.id
        })

      if (data) {
        const safetyData = data.filter(report => ['danger', 'net'].includes(report.type))
        setSafetyReports(safetyData)
      }
    } else {
      const { data } = await supabase
        .from('reports')
        .select(`*, users!reports_user_id_fkey(phone_number)`)
        .in('type', ['danger', 'net'])
        .order('created_at', { ascending: false })

      if (data) setSafetyReports(data)
    }
  }

  const loadGhostNetReports = async () => {
    const { data } = await supabase
      .from('reports')
      .select(`*, users!reports_user_id_fkey(phone_number)`)
      .eq('type', 'net')
      .order('created_at', { ascending: false })

    if (data) setReports(data)
  }

  const loadFisheriesSafetyReports = async () => {
    const { data } = await supabase
      .from('reports')
      .select(`*, users!reports_user_id_fkey(phone_number)`)
      .in('type', ['danger', 'dispose', 'net'])
      .order('created_at', { ascending: false })

    if (data) setSafetyReports(data)
  }

  const generateQRCode = (text) => {
    const canvas = document.createElement('canvas')
    const qr = new QRious({
      element: canvas,
      value: text,
      size: 300,
      background: 'white',
      foreground: 'black',
      level: 'M'
    })
    return canvas.toDataURL()
  }

  const downloadQR = (binId, qrCode) => {
    const qrDataUrl = generateQRCode(qrCode)
    const link = document.createElement('a')
    link.download = `bin-${binId}-qr.png`
    link.href = qrDataUrl
    link.click()
  }

  const createBin = async () => {
    if (!newBin.bin_id || !newBin.gps_lat || !newBin.gps_lng) {
      setError('All fields are required')
      return
    }

    setLoading(true)
    try {
      const qrCode = `karavali-bin-${newBin.bin_id}-${Date.now()}`

      const { error } = await supabase
        .from('bins')
        .insert({
          bin_id: newBin.bin_id,
          qr_code: qrCode,
          gps_lat: parseFloat(newBin.gps_lat),
          gps_lng: parseFloat(newBin.gps_lng),
          status: 'empty',
          beach_id: user.assigned_beach_id
        })

      if (error) throw error

      setMessage(`Bin created successfully! QR code ready for download.`)
      setNewBin({ bin_id: '', gps_lat: '', gps_lng: '', location_name: '' })
      setShowBinForm(false)
      loadBins()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const updateBinStatus = async (binId, status) => {
    setLoading(true)
    try {
      const updates = {
        status,
        last_reported_time: new Date().toISOString(),
        last_reported_by: user.id
      }

      const { error } = await supabase
        .from('bins')
        .update(updates)
        .eq('bin_id', binId)

      if (error) throw error

      setMessage(`Bin status updated to ${status}`)
      loadBins()
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const getTabsForRole = () => {
    switch (user?.role) {
      case 'admin':
        return [
          { id: 'users', label: '👥 Users', icon: '👥' },
          { id: 'reports', label: '📋 All Reports', icon: '📋' },
          { id: 'payments', label: '💳 Payments', icon: '💳' },
          { id: 'bins', label: '🗑️ Bin Management', icon: '🗑️' },
          { id: 'analytics', label: '📊 Analytics', icon: '📊' }
        ]
      case 'beach_authority':
        return [
          { id: 'beach', label: '🏖️ Beach Selection', icon: '🏖️' },
          { id: 'payments', label: '💳 Payments', icon: '💳' },
          { id: 'safety', label: '⚠️ Safety & Ghost Nets', icon: '⚠️' },
          { id: 'analytics', label: '📊 Analytics', icon: '📊' }
        ]
      case 'municipality':
        return [
          { id: 'beach', label: '🏖️ Beach Selection', icon: '🏖️' },
          { id: 'bins', label: '🗑️ Bin Management', icon: '🗑️' },
          { id: 'bin-reports', label: '📋 Bin Reports', icon: '📋' },
          { id: 'analytics', label: '📊 Analytics', icon: '📊' }
        ]
      case 'fisheries_department':
        return [
          { id: 'ghost-nets', label: '🕸️ Ghost Nets', icon: '🕸️' },
          { id: 'fisheries-safety', label: '🐟 Marine Safety', icon: '🐟' },
          { id: 'analytics', label: '📊 Analytics', icon: '📊' }
        ]
      default:
        return [
          { id: 'reports', label: '📋 Reports', icon: '📋' },
          { id: 'analytics', label: '📊 Analytics', icon: '📊' }
        ]
    }
  }

  const tabs = getTabsForRole()

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    setSearchParams({ tab: tabId })
  }

  const getRoleTitle = () => {
    switch (user?.role) {
      case 'admin': return 'Admin Dashboard'
      case 'beach_authority': return 'Beach Authority Dashboard'
      case 'municipality': return 'Municipality Dashboard'
      case 'fisheries_department': return 'Fisheries Department Dashboard'
      default: return 'Authority Dashboard'
    }
  }

  return (
    <div className="min-h-screen pb-20">
      <Navigation
        user={user}
        currentPage="authority"
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        rightContent={<NotificationBell userId={user?.id} />}
      />

      {/* Foreground Notification Toast */}
      {foregroundNotification && (
        <NotificationToast
          notification={foregroundNotification}
          onClose={() => setForegroundNotification(null)}
        />
      )}

      <main className="container pt-20">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white">{getRoleTitle()}</h1>
        </div>

        {error && (
          <div className="alert alert-error mb-6">
            {error}
          </div>
        )}

        {message && (
          <div className="alert alert-success mb-6">
            {message}
          </div>
        )}

        <Card>
          {activeTab === 'beach' && (user?.role === 'beach_authority' || user?.role === 'municipality') && (
            <div>
              <h2 className="text-xl font-bold text-white mb-4">🏖️ {user?.role === 'municipality' ? 'Municipality' : 'Beach Authority'} Assignment</h2>
              {user.assigned_beach_id ? (
                <div className="bg-green-500/20 border border-green-500/30 rounded-xl p-6 text-center">
                  <h3 className="text-green-300 font-bold mb-2">
                    ✅ Assigned Beach: {user.assigned_beach_id.replace(/_/g, ' ')}
                  </h3>
                  <p className="text-green-300/80 text-sm">
                    Your beach assignment is permanent. You will receive all reports and manage payments for this beach.
                  </p>
                </div>
              ) : (
                <div>
                  <div className="bg-amber-500/15 border border-amber-500/30 rounded-lg p-4 mb-4">
                    <p className="text-amber-200 text-sm">
                      ⚠️ <strong>One-time Assignment:</strong> Once you select a beach, it becomes your permanent assignment.
                    </p>
                  </div>
                  <BeachSelector
                    user={user}
                    onBeachSelect={handleBeachAssignment}
                    selectedBeach={selectedBeach}
                  />
                </div>
              )}
            </div>
          )}

          {activeTab === 'users' && user?.role === 'admin' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">👥 User Management</h2>
                <Button onClick={() => setShowUserForm(!showUserForm)}>
                  ➕ Create User
                </Button>
              </div>

              {showUserForm && (
                <div className="bg-white/5 p-4 rounded-lg border border-white/10 mb-6">
                  <h3 className="text-lg font-bold text-white mb-4">Create New User</h3>
                  <div className="grid gap-4 md:grid-cols-2 mb-4">
                    <Input
                      label="Phone Number"
                      type="tel"
                      value={newUser.phone_number}
                      onChange={(e) => setNewUser({ ...newUser, phone_number: e.target.value })}
                      placeholder="9876543210"
                    />
                    <div>
                      <label className="block text-gray-300 text-sm font-medium mb-2">Role</label>
                      <select
                        value={newUser.role}
                        onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                        className="form-input w-full"
                      >
                        <option value="beach_authority">Beach Authority</option>
                        <option value="municipality">Municipality</option>
                        <option value="fisheries_department">Department of Fisheries</option>
                        <option value="merchant">Merchant</option>
                        <option value="tourist">Tourist</option>
                      </select>
                    </div>
                  </div>
                  <Input
                    label="Password"
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    placeholder="Enter password"
                  />
                  <div className="flex gap-2 mt-4">
                    <Button onClick={createUser} disabled={loading}>
                      Create User
                    </Button>
                    <Button variant="secondary" onClick={() => setShowUserForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {users.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No users found</p>
              ) : (
                <div className="space-y-4">
                  {users.map(userItem => (
                    <div key={userItem.id} className="bg-white/5 p-4 rounded-lg border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <h4 className="text-white font-semibold">📞 {userItem.phone_number}</h4>
                        <p className="text-sm text-gray-400">Role: {userItem.role}</p>
                        <p className="text-sm text-gray-400">Coins: {userItem.coin_balance || 0} | Pending: {userItem.pending_coins || 0}</p>
                        <div className="text-xs text-gray-500 mt-1">
                          📅 Joined: {new Date(userItem.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 items-end w-full md:w-auto">
                        <select
                          value={userItem.role}
                          onChange={(e) => updateUserRole(userItem.id, e.target.value)}
                          disabled={loading || userItem.id === user.id}
                          className="bg-black/30 border border-white/10 rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-red-500"
                        >
                          <option value="beach_authority">Beach Authority</option>
                          <option value="municipality">Municipality</option>
                          <option value="fisheries_department">Fisheries Dept</option>
                          <option value="merchant">Merchant</option>
                          <option value="tourist">Tourist</option>
                          <option value="admin">Admin</option>
                        </select>
                        {userItem.id !== user.id && (
                          <button
                            onClick={() => deleteUser(userItem.id)}
                            disabled={loading}
                            className="text-red-400 hover:text-red-300 text-xs font-medium px-2 py-1 rounded bg-red-900/20 border border-red-900/30 transition-colors"
                          >
                            🗑️ Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'payments' && (
            <div>
              <h2 className="text-xl font-bold text-white mb-6">💳 Payment Requests</h2>
              {paymentRequests.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No payment requests found</p>
              ) : (
                <div className="space-y-4">
                  {paymentRequests.map(request => (
                    <div key={request.request_id} className="bg-white/5 p-4 rounded-lg border border-white/10">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                        <div>
                          <h4 className="text-white font-bold">Request from {request.users?.phone_number}</h4>
                          <p className="text-lg font-semibold text-green-400">₹{request.amount_requested.toFixed(2)}</p>
                          <p className="text-sm text-gray-400">{request.coins_amount} coins @ ₹{request.conversion_rate}/coin</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${request.status === 'paid' ? 'bg-green-500/20 text-green-300' :
                          request.status === 'approved' ? 'bg-blue-500/20 text-blue-300' :
                            request.status === 'rejected' ? 'bg-red-500/20 text-red-300' :
                              'bg-yellow-500/20 text-yellow-300'
                          }`}>
                          {request.status}
                        </span>
                      </div>

                      <div className="text-xs text-gray-500 mb-4">
                        📅 {new Date(request.created_at).toLocaleString()}
                      </div>

                      {request.upi_id && (
                        <div className="mb-4">
                          <div
                            className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 rounded px-3 py-2 cursor-pointer hover:bg-blue-500/20 transition-colors"
                            onClick={() => {
                              navigator.clipboard.writeText(request.upi_id)
                              alert('UPI ID copied: ' + request.upi_id)
                            }}
                            title="Click to copy UPI ID"
                          >
                            <span className="text-blue-300 font-medium">UPI ID:</span>
                            <strong className="text-white">{request.upi_id}</strong>
                            <span className="text-blue-300 text-xs ml-1">📋 Copy</span>
                          </div>
                        </div>
                      )}

                      {request.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => updatePaymentRequest(request.request_id, 'approved')}
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            ✅ Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => updatePaymentRequest(request.request_id, 'rejected')}
                            disabled={loading}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          >
                            ❌ Reject
                          </Button>
                        </div>
                      )}

                      {request.status === 'approved' && (
                        <Button
                          size="sm"
                          onClick={() => updatePaymentRequest(request.request_id, 'paid')}
                          disabled={loading}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          💸 Mark as Paid
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {activeTab === 'bins' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-white">🗑️ Bin Management</h2>
                <Button onClick={() => setShowBinForm(!showBinForm)}>
                  ➕ Add New Bin
                </Button>
              </div>

              {showBinForm && (
                <div className="bg-white/5 p-4 rounded-lg border border-white/10 mb-6 animate-fade-in">
                  <h3 className="text-lg font-bold text-white mb-4">Register New Bin</h3>
                  <div className="grid gap-4 md:grid-cols-2 mb-4">
                    <Input
                      label="Bin ID / Number"
                      value={newBin.bin_id}
                      onChange={(e) => setNewBin({ ...newBin, bin_id: e.target.value })}
                      placeholder="BIN-001"
                    />
                    <Input
                      label="Location Name"
                      value={newBin.location_name}
                      onChange={(e) => setNewBin({ ...newBin, location_name: e.target.value })}
                      placeholder="Main Entrance"
                    />
                    <Input
                      label="GPS Latitude"
                      value={newBin.gps_lat}
                      onChange={(e) => setNewBin({ ...newBin, gps_lat: e.target.value })}
                      placeholder="13.3525"
                    />
                    <Input
                      label="GPS Longitude"
                      value={newBin.gps_lng}
                      onChange={(e) => setNewBin({ ...newBin, gps_lng: e.target.value })}
                      placeholder="74.7928"
                    />
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button onClick={createBin} disabled={loading}>
                      Create Bin
                    </Button>
                    <Button variant="secondary" onClick={() => setShowBinForm(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

              {bins.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No bins registered yet</p>
              ) : (
                <div className="space-y-4">
                  {bins.map(bin => (
                    <div key={bin.bin_id} className="bg-white/5 p-4 rounded-lg border border-white/10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-white font-bold text-lg">🗑️ {bin.bin_id}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${bin.status === 'empty' ? 'bg-green-500/20 text-green-300' :
                            bin.status === 'full' ? 'bg-red-500/20 text-red-300' :
                              'bg-yellow-500/20 text-yellow-300'
                            }`}>
                            {bin.status}
                          </span>
                        </div>
                        <p className="text-sm text-gray-400">📍 {bin.gps_lat}, {bin.gps_lng}</p>
                        {bin.last_reported_time && (
                          <p className="text-xs text-gray-500 mt-1">
                            Last update: {new Date(bin.last_reported_time).toLocaleString()}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 items-end w-full md:w-auto">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => downloadQR(bin.bin_id, bin.qr_code)}
                        >
                          ⬇️ QR Code
                        </Button>
                        {bin.status === 'full' && (
                          <Button
                            size="sm"
                            onClick={() => updateBinStatus(bin.bin_id, 'cleared')}
                            disabled={loading}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            ✅ Mark Cleared
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {(activeTab === 'reports' || activeTab === 'bin-reports' || activeTab === 'ghost-nets' || activeTab === 'fisheries-safety') && (
            <div>
              <h2 className="text-xl font-bold text-white mb-6">📋 {activeTab === 'bin-reports' ? 'Bin Reports' : 'Reports'}</h2>
              {reports.length === 0 ? (
                <p className="text-gray-400 text-center py-8">No reports found</p>
              ) : (
                <div className="space-y-4">
                  {reports.map(report => (
                    <div key={report.report_id} className="bg-white/5 p-4 rounded-lg border border-white/10">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2">
                        <div>
                          <h4 className="text-white font-bold uppercase">{report.type} Report</h4>
                          <p className="text-sm text-gray-400">By: {report.users?.phone_number}</p>
                        </div>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${report.status === 'verified' ? 'bg-green-500/20 text-green-300' :
                          report.status === 'rejected' ? 'bg-red-500/20 text-red-300' :
                            'bg-yellow-500/20 text-yellow-300'
                          }`}>
                          {report.status}
                        </span>
                      </div>

                      {report.description && (
                        <p className="text-gray-300 text-sm mb-2">{report.description}</p>
                      )}

                      <div className="text-xs text-gray-500 mb-4">
                        📅 {new Date(report.created_at).toLocaleString()}
                        {report.gps_lat && (
                          <span className="ml-4">📍 {report.gps_lat.toFixed(4)}, {report.gps_lng.toFixed(4)}</span>
                        )}
                      </div>

                      {report.status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => updateReportStatus(report.report_id, 'verified')}
                            disabled={loading}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            ✅ Verify
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() => updateReportStatus(report.report_id, 'rejected')}
                            disabled={loading}
                            className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                          >
                            ❌ Reject
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-bold text-white mb-2">Analytics Dashboard</h3>
              <p className="text-gray-400">Coming soon: Detailed insights and statistics.</p>
            </div>
          )}
        </Card>
      </main>
    </div>
  )
}