import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import Navigation from '../components/Navigation'

export default function HomePage({ user }) {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const steps = [
    { step: '1', title: 'Select Beach', description: 'Choose your beach location from the map', icon: '🏖️' },
    { step: '2', title: 'Report & Clean', description: 'Report bins, participate in cleanup activities', icon: '🧹' },
    { step: '3', title: 'Earn Coins', description: 'Get rewarded with coins for your contributions', icon: '💰' },
    { step: '4', title: 'Redeem Rewards', description: 'Use coins at local merchants for discounts', icon: '🏪' }
  ]

  return (
    <div style={{ minHeight: '100vh' }}>
      <Navigation user={user} currentPage="home" />
      
      <main className="app-main">
        <div className="content-container">
          {/* Hero Section */}
          <div className="text-center mb-12">
            <div className="text-6xl mb-4">🌊</div>
            <h1 className="text-4xl font-bold text-white mb-6">
              Karavali Connect
            </h1>
            {!user && (
              <div className="flex gap-4 justify-center mb-8">
                <button 
                  onClick={() => navigate('/login')}
                  className="btn btn-primary"
                >
                  Get Started
                </button>
                <button 
                  onClick={() => navigate('/register')}
                  className="btn btn-secondary"
                >
                  Sign Up
                </button>
              </div>
            )}
          </div>

          {/* App Description */}
          <div className="enhanced-card mb-8">
            <p className="text-gray-300 text-center text-lg leading-relaxed">
              A Progressive Web App for coastal civic engagement, rewards, and safety reporting. 
              Join the community making our beaches cleaner and safer through gamified environmental activities.
            </p>
          </div>

          {/* Problem & Solution Section */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div className="enhanced-card">
              <h2 className="text-lg font-bold text-white mb-3">
                🚨 The Problem
              </h2>
              <div className="space-y-2">
                <p className="text-gray-300 text-sm">• Coastal pollution affecting marine life</p>
                <p className="text-gray-300 text-sm">• Lack of community engagement</p>
                <p className="text-gray-300 text-sm">• Inefficient waste management</p>
              </div>
            </div>

            <div className="enhanced-card">
              <h2 className="text-lg font-bold text-white mb-3">
                ✅ Our Solution
              </h2>
              <div className="space-y-2">
                <p className="text-gray-300 text-sm">• Gamified reward system</p>
                <p className="text-gray-300 text-sm">• Real-time monitoring platform</p>
                <p className="text-gray-300 text-sm">• AI-powered waste detection</p>
              </div>
            </div>
          </div>

          {/* How to Use Guide */}
          <div className="enhanced-card">
            <h2 className="text-2xl font-bold text-white mb-6 text-center">How to Use</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {steps.map((step, index) => (
                <div key={index} className="text-center">
                  <div className="w-12 h-12 bg-red-600 rounded-full flex items-center justify-center text-white font-bold text-lg mx-auto mb-3">
                    {step.step}
                  </div>
                  <div className="text-3xl mb-3">{step.icon}</div>
                  <h3 className="text-lg font-semibold text-white mb-2">{step.title}</h3>
                  <p className="text-gray-300 text-sm">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}