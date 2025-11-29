import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import MapView from '../components/MapView'
import ReportList from '../components/ReportList'
import BinQRGenerator from '../components/BinQRGenerator'
import BinStatusManager from '../components/BinStatusManager'
import PaymentRequests from '../components/PaymentRequests'
import NetRescueManager from '../components/NetRescueManager'

export default function AuthorityPortal({ user }) {
  const authorityType = user?.role || 'municipality'
  const [activeTab, setActiveTab] = useState(
    authorityType === 'municipality' ? 'bins' :
    authorityType === 'beach_authority' ? 'payments' :
    authorityType === 'forest_department' ? 'nets' : 'map'
  )
  const [reports, setReports] = useState([])
  const [bins, setBins] = useState([])
  const [filterStatus, setFilterStatus] = useState('all')
  const [stats, setStats] = useState({
    pending: 0,
    verified: 0,
    cleared: 0
  })
  const navigate = useNavigate()

  useEffect(() => {
    if (authorityType === 'municipality') {
      loadBins()
      // Real-time subscription for bins
      const binsSubscription = supabase
        .channel('bins-changes')
        .on('postgres_changes', 
          { event: '*', schema: 'public', table: 'bins' },
          () => {
            loadBins()
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(binsSubscription)
      }
    } else {
      loadReports()
      loadStats()
      
      // Real-time subscription for reports
      const reportsSubscription = supabase
        .channel('reports-changes')
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'reports' },
          () => {
            loadReports()
            loadStats()
          }
        )
        .subscribe()

      return () => {
        supabase.removeChannel(reportsSubscription)
      }
    }
  }, [authorityType])

  const loadBins = async () => {
    const { data } = await supabase
      .from('bins')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      setBins(data)
    }
  }

  const loadReports = async () => {
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

  const loadStats = async () => {
    const { data } = await supabase
      .from('reports')
      .select('status')

    if (data) {
      setStats({
        pending: data.filter(r => r.status === 'pending').length,
        verified: data.filter(r => r.status === 'verified').length,
        cleared: data.filter(r => r.status === 'cleared').length
      })
    }
  }

  const handleStatusChange = async (reportId, newStatus, reportData) => {
    try {
      // Update report status
      const { error: updateError } = await supabase
        .from('reports')
        .update({ status: newStatus })
        .eq('report_id', reportId)

      if (updateError) throw updateError

      // Handle status-specific logic
      if (newStatus === 'verified') {
        // When verified, move pending coins to balance (for bin reports)
        if (reportData.type === 'bin' && reportData.coins_awarded > 0) {
          await supabase.rpc('move_pending_to_balance', {
            user_id_param: reportData.user_id,
            coins_param: reportData.coins_awarded
          })
        }
      } else if (newStatus === 'cleared') {
        // When cleared, handle bin status and final coin conversion
        if (reportData.type === 'bin' && reportData.bin_id) {
          // Update bin status to empty
          await supabase
            .from('bins')
            .update({ status: 'empty' })
            .eq('bin_id', reportData.bin_id)

          // Ensure coins are moved to balance if not already done
          if (reportData.coins_awarded > 0 && reportData.status === 'pending') {
            await supabase.rpc('move_pending_to_balance', {
              user_id_param: reportData.user_id,
              coins_param: reportData.coins_awarded
            })
          }
        }
      }

      // Refresh data
      loadReports()
      loadStats()
    } catch (error) {
      console.error('Failed to change status:', error)
      alert('Failed to update status. Please try again.')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('karavali_user')
    window.dispatchEvent(new Event('karavali_user_changed'))
    navigate('/login', { replace: true })
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <header className="header">
        <div className="header-content">
          <div>
            <h1>
              {authorityType === 'municipality' ? '🏛️ Municipality Portal' :
               authorityType === 'beach_authority' ? '🏖️ Beach Authority Portal' :
               authorityType === 'forest_department' ? '🌲 Forest Department Portal' :
               '🏛️ Authority Portal'}
            </h1>
            <p>
              {authorityType === 'municipality' ? 'Manage bins, QR codes, and bin status' :
               authorityType === 'beach_authority' ? 'Manage payments and beach reports' :
               authorityType === 'forest_department' ? 'Manage net rescues and forest reports' :
               'Monitor reports and manage cleanup'}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-secondary"
          >
            🚪 Logout
          </button>
        </div>
      </header>

      {/* Stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: '1rem',
        padding: '1rem',
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        <div style={{
          background: 'white',
          padding: '1rem',
          borderRadius: '8px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#f59e0b' }}>
            {stats.pending}
          </div>
          <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>Pending</div>
        </div>
        <div style={{
          background: 'white',
          padding: '1rem',
          borderRadius: '8px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#10b981' }}>
            {stats.verified}
          </div>
          <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>Verified</div>
        </div>
        <div style={{
          background: 'white',
          padding: '1rem',
          borderRadius: '8px',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
        }}>
          <div style={{ fontSize: '2rem', fontWeight: '700', color: '#1e40af' }}>
            {stats.cleared}
          </div>
          <div style={{ color: '#6b7280', fontSize: '0.875rem' }}>Cleared</div>
        </div>
      </div>

      {/* Tabs - Different for each authority type */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        padding: '0 1rem',
        maxWidth: '1200px',
        margin: '0 auto',
        marginBottom: '1rem',
        flexWrap: 'wrap'
      }}>
        {authorityType === 'municipality' && (
          <>
            <button
              onClick={() => setActiveTab('bins')}
              style={{
                padding: '0.75rem 1.5rem',
                background: activeTab === 'bins' ? '#8B0000' : 'white',
                color: activeTab === 'bins' ? 'white' : '#374151',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: activeTab === 'bins' ? '600' : '400'
              }}
            >
              🗑️ Create Bins & QR
            </button>
            <button
              onClick={() => setActiveTab('status')}
              style={{
                padding: '0.75rem 1.5rem',
                background: activeTab === 'status' ? '#8B0000' : 'white',
                color: activeTab === 'status' ? 'white' : '#374151',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: activeTab === 'status' ? '600' : '400'
              }}
            >
              📊 Bin Status
            </button>
            <button
              onClick={() => setActiveTab('map')}
              style={{
                padding: '0.75rem 1.5rem',
                background: activeTab === 'map' ? '#8B0000' : 'white',
                color: activeTab === 'map' ? 'white' : '#374151',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: activeTab === 'map' ? '600' : '400'
              }}
            >
              🗺️ Map View
            </button>
          </>
        )}

        {authorityType === 'beach_authority' && (
          <>
            <button
              onClick={() => setActiveTab('payments')}
              style={{
                padding: '0.75rem 1.5rem',
                background: activeTab === 'payments' ? '#8B0000' : 'white',
                color: activeTab === 'payments' ? 'white' : '#374151',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: activeTab === 'payments' ? '600' : '400'
              }}
            >
              💰 Payment Requests
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              style={{
                padding: '0.75rem 1.5rem',
                background: activeTab === 'reports' ? '#8B0000' : 'white',
                color: activeTab === 'reports' ? 'white' : '#374151',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: activeTab === 'reports' ? '600' : '400'
              }}
            >
              📋 Beach Reports
            </button>
            <button
              onClick={() => setActiveTab('map')}
              style={{
                padding: '0.75rem 1.5rem',
                background: activeTab === 'map' ? '#f59e0b' : 'white',
                color: activeTab === 'map' ? 'white' : '#374151',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: activeTab === 'map' ? '600' : '400'
              }}
            >
              🗺️ Map View
            </button>
          </>
        )}

        {authorityType === 'forest_department' && (
          <>
            <button
              onClick={() => setActiveTab('nets')}
              style={{
                padding: '0.75rem 1.5rem',
                background: activeTab === 'nets' ? '#8B0000' : 'white',
                color: activeTab === 'nets' ? 'white' : '#374151',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: activeTab === 'nets' ? '600' : '400'
              }}
            >
              🕸️ Net & Rescue
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              style={{
                padding: '0.75rem 1.5rem',
                background: activeTab === 'reports' ? '#059669' : 'white',
                color: activeTab === 'reports' ? 'white' : '#374151',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: activeTab === 'reports' ? '600' : '400'
              }}
            >
              📋 All Reports
            </button>
            <button
              onClick={() => setActiveTab('map')}
              style={{
                padding: '0.75rem 1.5rem',
                background: activeTab === 'map' ? '#059669' : 'white',
                color: activeTab === 'map' ? 'white' : '#374151',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: activeTab === 'map' ? '600' : '400'
              }}
            >
              🗺️ Map View
            </button>
          </>
        )}
      </div>

      {/* Content */}
      <main style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto' }}>
        {activeTab === 'map' && <MapView user={user} />}
        
        {authorityType === 'municipality' && (
          <>
            {activeTab === 'bins' && <BinQRGenerator />}
            {activeTab === 'status' && <BinStatusManager bins={bins} onUpdate={loadBins} />}
          </>
        )}

        {authorityType === 'beach_authority' && (
          <>
            {activeTab === 'payments' && <PaymentRequests user={user} />}
            {activeTab === 'reports' && (
              <>
                {/* Status Filter */}
                <div style={{
                  background: 'white',
                  padding: '1rem',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  display: 'flex',
                  gap: '0.5rem',
                  flexWrap: 'wrap',
                  alignItems: 'center'
                }}>
                  <span style={{ fontWeight: '500', marginRight: '0.5rem' }}>Filter by Status:</span>
              {['all', 'pending', 'verified', 'cleared', 'rejected'].map(status => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  style={{
                    padding: '0.5rem 1rem',
                    background: filterStatus === status ? '#8B0000' : '#f5f5dc',
                    color: filterStatus === status ? 'white' : '#374151',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.875rem',
                    fontWeight: filterStatus === status ? '600' : '400',
                    textTransform: 'capitalize'
                  }}
                >
                  {status === 'all' ? 'All Reports' : status}
                </button>
              ))}
            </div>
            
            <ReportList
              reports={filterStatus === 'all' 
                ? reports 
                : reports.filter(r => r.status === filterStatus)}
              onStatusChange={handleStatusChange}
            />
              </>
            )}
          </>
        )}

        {authorityType === 'forest_department' && (
          <>
            {activeTab === 'nets' && <NetRescueManager user={user} />}
            {activeTab === 'reports' && (
              <>
                {/* Status Filter */}
                <div style={{
                  background: 'white',
                  padding: '1rem',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  display: 'flex',
                  gap: '0.5rem',
                  flexWrap: 'wrap',
                  alignItems: 'center'
                }}>
                  <span style={{ fontWeight: '500', marginRight: '0.5rem' }}>Filter by Status:</span>
                  {['all', 'pending', 'verified', 'cleared', 'rejected'].map(status => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status)}
                      style={{
                        padding: '0.5rem 1rem',
                        background: filterStatus === status ? '#8B0000' : '#f5f5dc',
                        color: filterStatus === status ? 'white' : '#374151',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '0.875rem',
                        fontWeight: filterStatus === status ? '600' : '400',
                        textTransform: 'capitalize'
                      }}
                    >
                      {status === 'all' ? 'All Reports' : status}
                    </button>
                  ))}
                </div>
                
                <ReportList
                  reports={filterStatus === 'all' 
                    ? reports 
                    : reports.filter(r => r.status === filterStatus)}
                  onStatusChange={handleStatusChange}
                />
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}

