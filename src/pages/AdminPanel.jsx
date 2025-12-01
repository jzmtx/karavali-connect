import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useNavigate } from 'react-router-dom'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'

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
      tourist: 'bg-blue-600',
      merchant: 'bg-green-600',
      municipality: 'bg-red-600',
      beach_authority: 'bg-amber-600',
      forest_department: 'bg-emerald-600',
      admin: 'bg-purple-600'
    }
    return colors[role] || 'bg-gray-600'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-red-950 to-black pb-20">
      <header className="bg-black/50 backdrop-blur-md border-b border-red-900/30 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              👑 Admin Panel
            </h1>
            <p className="text-sm text-gray-400">
              Manage users, merchants, and authorities
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleLogout}
            icon="🚪"
          >
            Logout
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          <button
            onClick={() => setActiveTab('users')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 whitespace-nowrap ${activeTab === 'users'
                ? 'bg-red-600 text-white shadow-lg shadow-red-900/50'
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
          >
            👥 Manage Users
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`px-6 py-3 rounded-lg font-semibold transition-all duration-200 whitespace-nowrap ${activeTab === 'create'
                ? 'bg-red-600 text-white shadow-lg shadow-red-900/50'
                : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
          >
            ➕ Create User
          </button>
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

        {activeTab === 'create' && (
          <Card className="max-w-2xl mx-auto">
            <h2 className="text-xl font-bold text-white mb-6">Create New User</h2>
            <div className="space-y-4">
              <Input
                label="Name *"
                value={newUser.name}
                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                placeholder="User name"
              />
              <Input
                label="Phone Number *"
                type="tel"
                value={newUser.phone}
                onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })}
                placeholder="+91 9876543210"
              />
              <Input
                label="Email (Optional)"
                type="email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                placeholder="user@example.com"
              />
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-2">Role *</label>
                <select
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                  className="form-input w-full"
                >
                  <option value="tourist">Tourist/User</option>
                  <option value="merchant">Merchant</option>
                  <option value="municipality">Municipality</option>
                  <option value="beach_authority">Beach Authority</option>
                  <option value="forest_department">Forest Department</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <Button
                onClick={handleCreateUser}
                isLoading={loading}
                className="w-full mt-4"
              >
                Create User
              </Button>
            </div>
          </Card>
        )}

        {activeTab === 'users' && (
          <Card className="overflow-hidden p-0">
            <div className="p-4 border-b border-white/10 bg-white/5">
              <h2 className="text-lg font-bold text-white">All Users ({users.length})</h2>
            </div>

            {users.length === 0 ? (
              <div className="p-8 text-center text-gray-400">
                No users found
              </div>
            ) : (
              <div className="max-h-[600px] overflow-y-auto divide-y divide-white/10">
                {users.map(u => (
                  <div key={u.id} className="p-4 hover:bg-white/5 transition-colors flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                    <div>
                      <div className="font-semibold text-white mb-1">
                        {u.name || 'No name'} <span className="text-gray-400 text-sm ml-2">{u.phone_number}</span>
                      </div>
                      <div className="text-sm text-gray-400">
                        {u.email && <span>{u.email} • </span>}
                        <span className="text-yellow-500">Coins: {u.coin_balance || 0}</span>
                        {u.merchant_coins > 0 && <span className="text-green-400 ml-2">• Merchant: {u.merchant_coins}</span>}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Created: {new Date(u.created_at).toLocaleDateString()}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold text-white uppercase tracking-wider ${getRoleBadgeColor(u.role)}`}>
                        {u.role.replace('_', ' ')}
                      </span>
                      {u.role !== 'admin' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteUser(u.id, u.name || u.phone_number)}
                          className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                        >
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
