import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'

export default function AdminPanel({ user }) {
  const [activeTab, setActiveTab] = useState('users')
  const [users, setUsers] = useState([])
  const [newUser, setNewUser] = useState({
    name: '',
    phone: '',
    email: '',
    role: 'tourist'
  })
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    if (user?.role !== 'admin') {
      navigate('/login')
      return
    }
    loadUsers()
  }, [user])

  const loadUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (data) {
      setUsers(data)
    }
  }

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.phone || !newUser.role) {
      setError('Please fill all required fields')
      return
    }

    setLoading(true)
    setError('')
    setMessage('')

    try {
      // Check if phone exists
      const { data: existing } = await supabase
        .from('users')
        .select('*')
        .eq('phone_number', newUser.phone)
        .maybeSingle()

      if (existing) {
        setError('Phone number already exists')
        setLoading(false)
        return
      }

      // Create user
      const { data: createdUser, error: createError } = await supabase
        .from('users')
        .insert({
          phone_number: newUser.phone,
          name: newUser.name,
          email: newUser.email || null,
          role: newUser.role,
          coin_balance: 0,
          pending_coins: 0,
          merchant_coins: newUser.role === 'merchant' ? 0 : null
        })
        .select()
        .single()

      if (createError) throw createError

      // If authority type, create authority record
      if (['municipality', 'beach_authority', 'forest_department'].includes(newUser.role)) {
        await supabase
          .from('authority_types')
          .insert({
            user_id: createdUser.id,
            authority_type: newUser.role,
            department_name: newUser.name
          })
      }

      // Log admin action
      await supabase
        .from('admin_actions')
        .insert({
          admin_id: user.id,
          action_type: 'create_user',
          target_user_id: createdUser.id,
          details: { role: newUser.role, name: newUser.name }
        })

      setMessage(`✅ ${newUser.role} created successfully!`)
      setNewUser({ name: '', phone: '', email: '', role: 'tourist' })
      loadUsers()
    } catch (err) {
      setError(err.message || 'Failed to create user')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteUser = async (userId, userName) => {
    if (!confirm(`Delete user ${userName}? This action cannot be undone.`)) {
      return
    }

    try {
      await supabase
        .from('users')
        .delete()
        .eq('id', userId)

      // Log admin action
      await supabase
        .from('admin_actions')
        .insert({
          admin_id: user.id,
          action_type: 'delete_user',
          target_user_id: userId,
          details: { name: userName }
        })

      setMessage('User deleted successfully')
      loadUsers()
    } catch (err) {
      setError(err.message || 'Failed to delete user')
    }
  }

  const handleLogout = () => {
    localStorage.removeItem('karavali_user')
    window.dispatchEvent(new Event('karavali_user_changed'))
    navigate('/login', { replace: true })
  }

  const getRoleBadgeColor = (role) => {
    const colors = {
      tourist: '#1e40af',
      merchant: '#10b981',
      municipality: '#dc2626',
      beach_authority: '#f59e0b',
      forest_department: '#059669',
      admin: '#7c3aed'
    }
    return colors[role] || '#6b7280'
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6' }}>
      <header style={{
        background: 'linear-gradient(135deg, #000000 0%, #1a0000 50%, #8B0000 100%)',
        color: 'white',
        padding: '1rem',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', margin: 0 }}>👑 Admin Panel</h1>
            <p style={{ margin: 0, opacity: 0.9, fontSize: '0.875rem' }}>
              Manage users, merchants, and authorities
            </p>
          </div>
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
      </header>

      {/* Tabs */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        padding: '0 1rem',
        maxWidth: '1200px',
        margin: '0 auto',
        marginTop: '1rem',
        marginBottom: '1rem'
      }}>
        <button
          onClick={() => setActiveTab('users')}
          style={{
            padding: '0.75rem 1.5rem',
            background: activeTab === 'users' ? '#8B0000' : 'white',
            color: activeTab === 'users' ? 'white' : '#374151',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: activeTab === 'users' ? '600' : '400'
          }}
        >
          👥 Manage Users
        </button>
        <button
          onClick={() => setActiveTab('create')}
          style={{
            padding: '0.75rem 1.5rem',
            background: activeTab === 'create' ? '#8B0000' : 'white',
            color: activeTab === 'create' ? 'white' : '#374151',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: activeTab === 'create' ? '600' : '400'
          }}
        >
          ➕ Create User
        </button>
      </div>

      <main style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto' }}>
        {error && (
          <div style={{
            background: '#fee2e2',
            color: '#dc2626',
            padding: '0.75rem',
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            {error}
          </div>
        )}

        {message && (
          <div style={{
            background: '#d1fae5',
            color: '#065f46',
            padding: '0.75rem',
            borderRadius: '8px',
            marginBottom: '1rem'
          }}>
            {message}
          </div>
        )}

        {activeTab === 'create' && (
          <div style={{
            background: 'white',
            padding: '1.5rem',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            marginBottom: '1rem'
          }}>
            <h2 style={{ marginBottom: '1rem' }}>Create New User</h2>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Name *
              </label>
              <input
                type="text"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="User name"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Phone Number *
              </label>
              <input
                type="tel"
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                placeholder="+91 9876543210"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Email (Optional)
              </label>
              <input
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="user@example.com"
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                Role *
              </label>
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '1rem'
                }}
              >
                <option value="tourist">Tourist/User</option>
                <option value="merchant">Merchant</option>
                <option value="municipality">Municipality</option>
                <option value="beach_authority">Beach Authority</option>
                <option value="forest_department">Forest Department</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <button
              onClick={handleCreateUser}
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.75rem',
                background: loading ? '#9ca3af' : '#8B0000',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer'
              }}
            >
              {loading ? 'Creating...' : 'Create User'}
            </button>
          </div>
        )}

        {activeTab === 'users' && (
          <div style={{
            background: 'white',
            borderRadius: '12px',
            boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <div style={{ padding: '1rem', borderBottom: '1px solid #e5e7eb' }}>
              <h2>All Users ({users.length})</h2>
            </div>

            {users.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: '#6b7280' }}>
                No users found
              </div>
            ) : (
              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {users.map(u => (
                  <div
                    key={u.id}
                    style={{
                      padding: '1rem',
                      borderBottom: '1px solid #e5e7eb',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>
                        {u.name || 'No name'} {u.phone_number}
                      </div>
                      <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                        {u.email || 'No email'} • Coins: {u.coin_balance || 0}
                        {u.merchant_coins > 0 && ` • Merchant Coins: ${u.merchant_coins}`}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '0.25rem' }}>
                        Created: {new Date(u.created_at).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span style={{
                        padding: '0.25rem 0.5rem',
                        background: getRoleBadgeColor(u.role),
                        color: 'white',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: '600',
                        textTransform: 'capitalize'
                      }}>
                        {u.role.replace('_', ' ')}
                      </span>
                      {u.role !== 'admin' && (
                        <button
                          onClick={() => handleDeleteUser(u.id, u.name || u.phone_number)}
                          style={{
                            padding: '0.25rem 0.5rem',
                            background: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '0.75rem'
                          }}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}

