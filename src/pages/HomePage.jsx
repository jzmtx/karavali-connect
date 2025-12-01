import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Navigation from '../components/Navigation'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'

export default function HomePage({ user }) {
  const navigate = useNavigate()

  const steps = [
    { step: '1', title: 'Select Beach', description: 'Choose your beach location from the map', icon: '🏖️' },
    { step: '2', title: 'Report & Clean', description: 'Report bins, participate in cleanup activities', icon: '🧹' },
    { step: '3', title: 'Earn Coins', description: 'Get rewarded with coins for your contributions', icon: '💰' },
    { step: '4', title: 'Redeem Rewards', description: 'Use coins at local merchants for discounts', icon: '🏪' }
  ]

  return (
    <div className="min-h-screen pb-20">
      <Navigation user={user} currentPage="home" />

      <main className="container pt-8 px-4">
        {/* Hero Section */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="text-7xl mb-6 animate-bounce-slow">🌊</div>
          <h1 className="text-5xl md:text-6xl font-bold text-white mb-6 tracking-tight">
            Karavali Connect
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-10 leading-relaxed">
            Join the community movement to keep our coastline pristine.
            Report issues, clean beaches, and earn rewards for your impact.
          </p>

          {!user && (
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={() => navigate('/login')}
                size="lg"
                className="w-full sm:w-auto"
              >
                Get Started
              </Button>
              <Button
                onClick={() => navigate('/register')}
                variant="secondary"
                size="lg"
                className="w-full sm:w-auto"
              >
                Create Account
              </Button>
            </div>
          )}
        </div>

        {/* Info Grid */}
        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <Card className="transform hover:-translate-y-1 transition-transform duration-300">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="text-3xl">🚨</span> The Challenge
            </h2>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-1">•</span>
                Coastal pollution threatening marine ecosystems
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-1">•</span>
                Limited community engagement in waste management
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-1">•</span>
                Inefficient reporting mechanisms for hazards
              </li>
            </ul>
          </Card>

          <Card className="transform hover:-translate-y-1 transition-transform duration-300">
            <h2 className="text-2xl font-bold text-white mb-4 flex items-center gap-3">
              <span className="text-3xl">✅</span> Our Solution
            </h2>
            <ul className="space-y-3 text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                Gamified rewards for civic action
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                AI-powered verification for cleanups
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-500 mt-1">•</span>
                Real-time connection with local authorities
              </li>
            </ul>
          </Card>
        </div>

        {/* How it Works */}
        <div className="mb-12">
          <h2 className="text-3xl font-bold text-center text-white mb-10">How It Works</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {steps.map((step, index) => (
              <Card key={index} className="text-center relative overflow-hidden group hover:border-red-500/50 transition-colors">
                <div className="absolute top-0 right-0 p-4 opacity-10 text-6xl font-black text-white select-none">
                  {step.step}
                </div>
                <div className="w-16 h-16 bg-gradient-to-br from-red-600 to-red-900 rounded-2xl flex items-center justify-center text-3xl mx-auto mb-6 shadow-lg group-hover:scale-110 transition-transform duration-300">
                  {step.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-3">{step.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed">{step.description}</p>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}