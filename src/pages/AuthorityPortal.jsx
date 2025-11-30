import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import Navigation from '../components/Navigation'
import LocationSearch from '../components/LocationSearch'
import BeachSelector from '../components/BeachSelector'

export default function AuthorityPortal({ user }) {
  const [activeTab, setActiveTab] = useState('reports')
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
  const navigate = useNavigate()

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
  }, [user])

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
    // Create proper QR code using QRious library
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
          status: 'empty'
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

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navigation user={user} currentPage="authority" />

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
        {error && (
          <div className="alert alert-error">
            {error}
          </div>
        )}

        {message && (
          <div className="alert alert-success">
            {message}
          </div>
        )}

        <div className="glass-card">
          {activeTab === 'beach' && (user?.role === 'beach_authority' || user?.role === 'municipality') && (
            <div>
              <h2>🏖️ {user?.role === 'municipality' ? 'Municipality' : 'Beach Authority'} Assignment</h2>
              {user.assigned_beach_id ? (
                <div style={{
                  padding: '1.5rem',
                  background: 'rgba(34, 197, 94, 0.2)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <h3 style={{ color: 'rgb(134, 239, 172)', margin: 0, marginBottom: '0.5rem' }}>
                    ✅ Assigned Beach: {user.assigned_beach_id.replace(/_/g, ' ')}
                  </h3>
                  <p style={{ color: 'rgba(134, 239, 172, 0.8)', fontSize: '0.875rem', margin: 0 }}>
                    Your beach assignment is permanent. You will receive all reports and manage payments for this beach.
                  </p>
                </div>
              ) : (
                <div>
                  <div style={{
                    padding: '1rem',
                    background: 'rgba(255, 193, 7, 0.15)',
                    border: '1px solid rgba(255, 193, 7, 0.3)',
                    borderRadius: '8px',
                    marginBottom: '1rem'
                  }}>
                    <p style={{ color: 'rgb(254, 240, 138)', margin: 0, fontSize: '0.875rem' }}>
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
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2>👥 User Management</h2>
                <button
                  onClick={() => setShowUserForm(!showUserForm)}
                  className="btn btn-primary"
                >
                  ➕ Create User
                </button>
              </div>

              {showUserForm && (
                <div style={{
                  background: 'var(--glass-bg)',
                  padding: '1rem',
                  borderRadius: '8px',
                  border: '1px solid var(--glass-border)',
                  marginBottom: '1.5rem'
                }}>
                  <h3 style={{ marginBottom: '1rem' }}>Create New User</h3>
                  <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Phone Number</label>
                      <input
                        type="tel"
                        value={newUser.phone_number}
                        onChange={(e) => setNewUser({...newUser, phone_number: e.target.value})}
                        placeholder="9876543210"
                        className="form-input"
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Role</label>
                      <select
                        value={newUser.role}
                        onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                        className="form-input"
                      >
                        <option value="beach_authority">Beach Authority</option>
                        <option value="municipality">Municipality</option>
                        <option value="fisheries_department">Department of Fisheries</option>
                        <option value="merchant">Merchant</option>
                        <option value="tourist">Tourist</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ marginTop: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>Password</label>
                    <input
                      type="password"
                      value={newUser.password}
                      onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                      placeholder="Enter password"
                      className="form-input"
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    <button
                      onClick={createUser}
                      disabled={loading}
                      className="btn btn-primary"
                    >
                      Create User
                    </button>
                    <button
                      onClick={() => setShowUserForm(false)}
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {users.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: '2rem' }}>
                  No users found
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {users.map(userItem => (
                    <div
                      key={userItem.id}
                      style={{
                        background: 'var(--glass-bg)',
                        padding: '1rem',
                        borderRadius: '8px',
                        border: '1px solid var(--glass-border)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                        <div>
                          <h4 style={{ margin: 0, color: 'white' }}>
                            📞 {userItem.phone_number}
                          </h4>
                          <p style={{ margin: '0.25rem 0', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>
                            Role: {userItem.role}
                          </p>
                          <p style={{ margin: '0.25rem 0', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>
                            Coins: {userItem.coin_balance || 0} | Pending: {userItem.pending_coins || 0}
                          </p>
                          <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                            📅 Joined: {new Date(userItem.created_at).toLocaleDateString()}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                          <select
                            value={userItem.role}
                            onChange={(e) => updateUserRole(userItem.id, e.target.value)}
                            disabled={loading || userItem.id === user.id}
                            style={{
                              padding: '0.25rem 0.5rem',
                              borderRadius: '4px',
                              border: '1px solid var(--glass-border)',
                              background: 'var(--glass-bg)',
                              color: 'white',
                              fontSize: '0.75rem'
                            }}
                          >
                            <option value="beach_authority">Beach Authority</option>
                            <option value="municipality">Municipality</option>
                            <option value="fisheries_department">Department of Fisheries</option>
                            <option value="merchant">Merchant</option>
                            <option value="tourist">Tourist</option>
                            <option value="admin">Admin</option>
                          </select>
                          {userItem.id !== user.id && (
                            <button
                              onClick={() => deleteUser(userItem.id)}
                              disabled={loading}
                              style={{
                                padding: '0.25rem 0.5rem',
                                background: 'rgba(239, 68, 68, 0.3)',
                                color: 'rgb(252, 165, 165)',
                                border: '1px solid rgba(239, 68, 68, 0.5)',
                                borderRadius: '4px',
                                fontSize: '0.75rem',
                                cursor: 'pointer'
                              }}
                            >
                              🗑️ Delete
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'reports' && (
            <div>
              <h2>📋 Cleanup Reports</h2>
              {reports.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: '2rem' }}>
                  No reports found
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {reports.map(report => (
                    <div
                      key={report.report_id}
                      style={{
                        background: 'var(--glass-bg)',
                        padding: '1rem',
                        borderRadius: '8px',
                        border: '1px solid var(--glass-border)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                        <div>
                          <h4 style={{ margin: 0, color: 'white' }}>
                            {report.type.toUpperCase()} Report
                          </h4>
                          <p style={{ margin: '0.25rem 0', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>
                            By: {report.users?.phone_number}
                          </p>
                        </div>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: report.status === 'verified' ? 'rgba(34, 197, 94, 0.3)' : 
                                     report.status === 'rejected' ? 'rgba(239, 68, 68, 0.3)' : 
                                     'rgba(255, 193, 7, 0.3)',
                          color: report.status === 'verified' ? 'rgb(134, 239, 172)' : 
                                 report.status === 'rejected' ? 'rgb(252, 165, 165)' : 
                                 'rgb(254, 240, 138)'
                        }}>
                          {report.status}
                        </span>
                      </div>
                      
                      {report.description && (
                        <p style={{ margin: '0.5rem 0', fontSize: '0.875rem', color: 'rgba(255,255,255,0.8)' }}>
                          {report.description}
                        </p>
                      )}
                      
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '1rem' }}>
                        📅 {new Date(report.created_at).toLocaleString()}
                        {report.gps_lat && (
                          <span style={{ marginLeft: '1rem' }}>
                            📍 {report.gps_lat.toFixed(4)}, {report.gps_lng.toFixed(4)}
                          </span>
                        )}
                      </div>

                      {report.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => updateReportStatus(report.report_id, 'verified')}
                            disabled={loading}
                            className="btn btn-primary"
                            style={{ fontSize: '0.875rem' }}
                          >
                            ✅ Verify
                          </button>
                          <button
                            onClick={() => updateReportStatus(report.report_id, 'rejected')}
                            disabled={loading}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.875rem' }}
                          >
                            ❌ Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'payments' && (
            <div>
              <h2>💳 Payment Requests</h2>
              {paymentRequests.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: '2rem' }}>
                  No payment requests found
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {paymentRequests.map(request => (
                    <div
                      key={request.request_id}
                      style={{
                        background: 'var(--glass-bg)',
                        padding: '1rem',
                        borderRadius: '8px',
                        border: '1px solid var(--glass-border)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                        <div>
                          <h4 style={{ margin: 0, color: 'white' }}>
                            ₹{request.amount_requested.toFixed(2)}
                          </h4>
                          <p style={{ margin: '0.25rem 0', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>
                            Merchant: {request.users?.phone_number}
                          </p>
                          <p style={{ margin: '0.25rem 0', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>
                            {request.coins_amount} coins @ ₹{request.conversion_rate}/coin
                          </p>
                        </div>
                        <span style={{
                          padding: '0.25rem 0.5rem',
                          borderRadius: '12px',
                          fontSize: '0.75rem',
                          fontWeight: '600',
                          background: request.status === 'paid' ? 'rgba(34, 197, 94, 0.3)' : 
                                     request.status === 'approved' ? 'rgba(59, 130, 246, 0.3)' :
                                     request.status === 'rejected' ? 'rgba(239, 68, 68, 0.3)' : 
                                     'rgba(255, 193, 7, 0.3)',
                          color: request.status === 'paid' ? 'rgb(134, 239, 172)' : 
                                 request.status === 'approved' ? 'rgb(147, 197, 253)' :
                                 request.status === 'rejected' ? 'rgb(252, 165, 165)' : 
                                 'rgb(254, 240, 138)'
                        }}>
                          {request.status}
                        </span>
                      </div>
                      
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)', marginBottom: '1rem' }}>
                        📅 {new Date(request.created_at).toLocaleString()}
                      </div>

                      {request.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button
                            onClick={() => updatePaymentRequest(request.request_id, 'approved')}
                            disabled={loading}
                            className="btn btn-primary"
                            style={{ fontSize: '0.875rem' }}
                          >
                            ✅ Approve
                          </button>
                          <button
                            onClick={() => updatePaymentRequest(request.request_id, 'rejected')}
                            disabled={loading}
                            className="btn btn-secondary"
                            style={{ fontSize: '0.875rem' }}
                          >
                            ❌ Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Beach Authority - Safety Issues */}
          {activeTab === 'safety' && user?.role === 'beach_authority' && (
            <div>
              <h2>⚠️ Safety Issues & Ghost Nets</h2>
              {safetyReports.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: '2rem' }}>
                  No safety or ghost net reports found
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {safetyReports.map(report => (
                    <div key={report.report_id} style={{
                      background: 'var(--glass-bg)',
                      padding: '1rem',
                      borderRadius: '8px',
                      border: '1px solid var(--glass-border)'
                    }}>
                      <h4 style={{ color: 'white', margin: 0 }}>
                        {report.type === 'net' ? '🕸️ GHOST NET Report' : '⚠️ ' + report.type.toUpperCase() + ' Safety Issue'}
                      </h4>
                      <p style={{ margin: '0.5rem 0', color: 'rgba(255,255,255,0.8)' }}>{report.description}</p>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                        📅 {new Date(report.created_at).toLocaleString()}
                        {report.gps_lat && <span style={{ marginLeft: '1rem' }}>📍 {report.gps_lat.toFixed(4)}, {report.gps_lng.toFixed(4)}</span>}
                      </div>
                      {report.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                          <button onClick={() => updateReportStatus(report.report_id, 'verified')} className="btn btn-primary" style={{ fontSize: '0.875rem' }}>✅ Resolve</button>
                          <button onClick={() => updateReportStatus(report.report_id, 'rejected')} className="btn btn-secondary" style={{ fontSize: '0.875rem' }}>❌ Dismiss</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Municipality - Bin Management */}
          {activeTab === 'bins' && (user?.role === 'municipality' || user?.role === 'admin') && (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2>🗑️ Bin Management</h2>
                <button onClick={() => setShowBinForm(!showBinForm)} className="btn btn-primary">➕ Create Bin</button>
              </div>

              {showBinForm && (
                <div style={{ background: 'var(--glass-bg)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)', marginBottom: '1.5rem' }}>
                  <h3 style={{ marginBottom: '1rem' }}>Create New Bin</h3>
                  <div style={{ display: 'grid', gap: '1rem' }}>
                    <input 
                      type="text" 
                      value={newBin.bin_id} 
                      onChange={(e) => setNewBin({...newBin, bin_id: e.target.value})} 
                      placeholder="Bin ID (e.g., BIN001)" 
                      className="form-input" 
                    />
                    
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', color: 'white', fontSize: '0.875rem' }}>
                        🔍 Search Bin Location
                      </label>
                      <LocationSearch
                        placeholder="Search bin location..."
                        onLocationSelect={(location) => {
                          setNewBin({
                            ...newBin,
                            gps_lat: location.lat.toString(),
                            gps_lng: location.lng.toString(),
                            location_name: location.name
                          })
                          setMessage(`📍 Location set: ${location.name}`)
                        }}
                      />
                    </div>
                    
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.2)' }}></div>
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>OR ENTER MANUALLY</span>
                      <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.2)' }}></div>
                    </div>
                    
                    <div style={{ display: 'grid', gap: '1rem', gridTemplateColumns: '1fr 1fr' }}>
                      <input 
                        type="number" 
                        step="0.000001" 
                        value={newBin.gps_lat} 
                        onChange={(e) => setNewBin({...newBin, gps_lat: e.target.value})} 
                        placeholder="Latitude" 
                        className="form-input" 
                      />
                      <input 
                        type="number" 
                        step="0.000001" 
                        value={newBin.gps_lng} 
                        onChange={(e) => setNewBin({...newBin, gps_lng: e.target.value})} 
                        placeholder="Longitude" 
                        className="form-input" 
                      />
                    </div>
                    
                    {newBin.location_name && (
                      <div style={{
                        padding: '0.5rem',
                        background: 'rgba(34, 197, 94, 0.2)',
                        border: '1px solid rgba(34, 197, 94, 0.3)',
                        borderRadius: '6px',
                        color: 'rgb(134, 239, 172)',
                        fontSize: '0.875rem'
                      }}>
                        📍 Selected: {newBin.location_name}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                    <button onClick={createBin} disabled={loading} className="btn btn-primary">Create Bin</button>
                    <button onClick={() => setShowBinForm(false)} className="btn btn-secondary">Cancel</button>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {bins.map(bin => (
                  <div key={bin.bin_id} style={{ background: 'var(--glass-bg)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <div>
                        <h4 style={{ color: 'white', margin: 0 }}>🗑️ {bin.bin_id}</h4>
                        <p style={{ margin: '0.25rem 0', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>QR: {bin.qr_code}</p>
                        <p style={{ margin: '0.25rem 0', fontSize: '0.875rem', color: 'rgba(255,255,255,0.7)' }}>📍 {bin.gps_lat}, {bin.gps_lng}</p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <span style={{ padding: '0.25rem 0.5rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: '600', background: bin.status === 'empty' ? 'rgba(34, 197, 94, 0.3)' : bin.status === 'full' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(255, 193, 7, 0.3)', color: bin.status === 'empty' ? 'rgb(134, 239, 172)' : bin.status === 'full' ? 'rgb(252, 165, 165)' : 'rgb(254, 240, 138)' }}>{bin.status}</span>
                        <button onClick={() => downloadQR(bin.bin_id, bin.qr_code)} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}>📥 Download QR</button>
                        <select value={bin.status} onChange={(e) => updateBinStatus(bin.bin_id, e.target.value)} style={{ padding: '0.25rem', borderRadius: '4px', border: '1px solid var(--glass-border)', background: 'var(--glass-bg)', color: 'white', fontSize: '0.75rem' }}>
                          <option value="empty">Empty</option>
                          <option value="full">Full</option>
                          <option value="cleared">Cleared</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Municipality - Bin Reports */}
          {activeTab === 'bin-reports' && user?.role === 'municipality' && (
            <div>
              <h2>📋 Bin Reports</h2>
              {reports.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: '2rem' }}>No bin reports found</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {reports.map(report => (
                    <div key={report.report_id} style={{ background: 'var(--glass-bg)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                      <h4 style={{ color: 'white', margin: 0 }}>🗑️ Bin Report - {report.bin_id}</h4>
                      <p style={{ margin: '0.5rem 0', color: 'rgba(255,255,255,0.8)' }}>{report.description}</p>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>📅 {new Date(report.created_at).toLocaleString()}</div>
                      {report.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                          <button onClick={() => updateReportStatus(report.report_id, 'verified')} className="btn btn-primary" style={{ fontSize: '0.875rem' }}>✅ Verify</button>
                          <button onClick={() => updateReportStatus(report.report_id, 'rejected')} className="btn btn-secondary" style={{ fontSize: '0.875rem' }}>❌ Reject</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Department of Fisheries - Ghost Nets */}
          {activeTab === 'ghost-nets' && user?.role === 'fisheries_department' && (
            <div>
              <h2>🕸️ Ghost Net Reports</h2>
              {reports.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: '2rem' }}>No ghost net reports found</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {reports.map(report => (
                    <div key={report.report_id} style={{ background: 'var(--glass-bg)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                      <h4 style={{ color: 'white', margin: 0 }}>🕸️ Ghost Net Report</h4>
                      <p style={{ margin: '0.5rem 0', color: 'rgba(255,255,255,0.8)' }}>{report.description}</p>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                        📅 {new Date(report.created_at).toLocaleString()}
                        {report.gps_lat && <span style={{ marginLeft: '1rem' }}>📍 {report.gps_lat.toFixed(4)}, {report.gps_lng.toFixed(4)}</span>}
                      </div>
                      {report.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                          <button onClick={() => updateReportStatus(report.report_id, 'verified')} className="btn btn-primary" style={{ fontSize: '0.875rem' }}>✅ Schedule Removal</button>
                          <button onClick={() => updateReportStatus(report.report_id, 'rejected')} className="btn btn-secondary" style={{ fontSize: '0.875rem' }}>❌ Mark Invalid</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Department of Fisheries - Marine Safety */}
          {activeTab === 'fisheries-safety' && user?.role === 'fisheries_department' && (
            <div>
              <h2>🐟 Marine Safety Issues</h2>
              {safetyReports.length === 0 ? (
                <p style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: '2rem' }}>No marine safety reports found</p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  {safetyReports.map(report => (
                    <div key={report.report_id} style={{ background: 'var(--glass-bg)', padding: '1rem', borderRadius: '8px', border: '1px solid var(--glass-border)' }}>
                      <h4 style={{ color: 'white', margin: 0 }}>🐟 {report.type.toUpperCase()} - Marine Safety</h4>
                      <p style={{ margin: '0.5rem 0', color: 'rgba(255,255,255,0.8)' }}>{report.description}</p>
                      <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>
                        📅 {new Date(report.created_at).toLocaleString()}
                        {report.gps_lat && <span style={{ marginLeft: '1rem' }}>📍 {report.gps_lat.toFixed(4)}, {report.gps_lng.toFixed(4)}</span>}
                      </div>
                      {report.status === 'pending' && (
                        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                          <button onClick={() => updateReportStatus(report.report_id, 'verified')} className="btn btn-primary" style={{ fontSize: '0.875rem' }}>✅ Address Issue</button>
                          <button onClick={() => updateReportStatus(report.report_id, 'rejected')} className="btn btn-secondary" style={{ fontSize: '0.875rem' }}>❌ Dismiss</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'analytics' && (
            <div>
              <h2>📊 Analytics Dashboard</h2>
              <div className="stats-grid">
                <div className="stat-card">
                  <span className="stat-number">{reports.length}</span>
                  <div className="stat-label">Total Reports</div>
                </div>
                <div className="stat-card">
                  <span className="stat-number">{reports.filter(r => r.status === 'verified').length}</span>
                  <div className="stat-label">Verified Reports</div>
                </div>
                {(user?.role === 'beach_authority' || user?.role === 'admin') && (
                  <div className="stat-card">
                    <span className="stat-number">{paymentRequests.length}</span>
                    <div className="stat-label">Payment Requests</div>
                  </div>
                )}
                {(user?.role === 'municipality' || user?.role === 'admin') && (
                  <div className="stat-card">
                    <span className="stat-number">{bins.length}</span>
                    <div className="stat-label">Total Bins</div>
                  </div>
                )}
                {user?.role === 'admin' && (
                  <div className="stat-card">
                    <span className="stat-number">{users.length}</span>
                    <div className="stat-label">Total Users</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}