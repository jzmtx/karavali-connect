import { useState, useEffect } from 'react'
import Card from './ui/Card'

export default function BeachConditions({ selectedBeach, compact = false }) {
    const [conditions, setConditions] = useState(null)
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (selectedBeach) {
            fetchConditions(selectedBeach)
        } else {
            setConditions(null)
        }
    }, [selectedBeach])

    const fetchConditions = async (beach) => {
        setLoading(true)
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 800))

        // Mock data generation based on beach name hash to be consistent but random-looking
        const hash = beach.name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
        const temps = [27, 28, 29, 30, 31, 32]
        const weathers = ['Sunny', 'Partly Cloudy', 'Clear', 'Breezy']
        const flags = ['Green', 'Yellow', 'Red']
        const crowds = ['Low', 'Moderate', 'High']
        const waterQualities = ['Excellent', 'Good', 'Fair']

        setConditions({
            temp: temps[hash % temps.length],
            weather: weathers[hash % weathers.length],
            flag: flags[hash % flags.length],
            crowd: crowds[hash % crowds.length],
            water: waterQualities[hash % waterQualities.length],
            wind: (hash % 15) + 5 // 5-20 km/h
        })
        setLoading(false)
    }

    if (!selectedBeach) return null

    if (loading) {
        return (
            <div className={`grid ${compact ? 'grid-cols-2 gap-2' : 'grid-cols-2 md:grid-cols-4 gap-4'} animate-pulse`}>
                {[1, 2, 3, 4].map(i => (
                    <div key={i} className={`${compact ? 'h-16' : 'h-24'} bg-white/5 rounded-xl border border-white/5`}></div>
                ))}
            </div>
        )
    }

    if (!conditions) return null

    const getFlagColor = (flag) => {
        switch (flag) {
            case 'Green': return 'text-green-500 bg-green-500/10 border-green-500/20'
            case 'Yellow': return 'text-yellow-500 bg-yellow-500/10 border-yellow-500/20'
            case 'Red': return 'text-red-500 bg-red-500/10 border-red-500/20'
            default: return 'text-gray-500'
        }
    }

    const containerClass = compact
        ? "p-2 rounded-lg bg-black/40 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center text-center"
        : "p-4 rounded-xl bg-black/40 backdrop-blur-md border border-white/10 flex flex-col items-center justify-center text-center group hover:bg-white/5 transition-colors"

    const iconClass = compact ? "text-xl mb-1" : "text-3xl mb-2"
    const valueClass = compact ? "text-sm font-bold text-white" : "text-2xl font-bold text-white"
    const labelClass = compact ? "text-[10px] text-gray-400 uppercase tracking-wider" : "text-xs text-gray-400 uppercase tracking-wider"

    return (
        <div className={`grid ${compact ? 'grid-cols-2 gap-2' : 'grid-cols-2 md:grid-cols-4 gap-4'} animate-fade-in`}>
            {/* Weather & Temp */}
            <div className={containerClass}>
                <div className={iconClass}>
                    {conditions.weather === 'Sunny' ? '☀️' :
                        conditions.weather === 'Partly Cloudy' ? '⛅' :
                            conditions.weather === 'Breezy' ? '💨' : '🌤️'}
                </div>
                <div className={valueClass}>{conditions.temp}°C</div>
                <div className={labelClass}>{conditions.weather}</div>
            </div>

            {/* Safety Flag */}
            <div className={`${compact ? 'p-2 rounded-lg' : 'p-4 rounded-xl'} border flex flex-col items-center justify-center text-center transition-colors ${getFlagColor(conditions.flag)}`}>
                <div className={iconClass}>🚩</div>
                <div className={compact ? "text-sm font-bold" : "text-xl font-bold"}>{conditions.flag}</div>
                <div className={compact ? "text-[10px] opacity-80 uppercase" : "text-xs opacity-80 uppercase tracking-wider"}>Safety</div>
            </div>

            {/* Crowd Level */}
            <div className={containerClass}>
                <div className={iconClass}>👥</div>
                <div className={valueClass}>{conditions.crowd}</div>
                <div className={labelClass}>Crowd</div>
            </div>

            {/* Water Quality */}
            <div className={containerClass}>
                <div className={iconClass}>💧</div>
                <div className={valueClass}>{conditions.water}</div>
                <div className={labelClass}>Water</div>
            </div>
        </div>
    )
}
