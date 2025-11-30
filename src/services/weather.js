import { config } from '../lib/config'
import axios from 'axios'

/**
 * Get comprehensive beach conditions and safety assessment
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<object>} Beach conditions data
 */
export async function getBeachConditions(lat, lng) {
  try {
    const response = await axios.get('https://marine-api.open-meteo.com/v1/marine', {
      params: {
        latitude: lat,
        longitude: lng,
        hourly: 'wave_height,wave_direction,wave_period,wind_speed_10m,wind_direction_10m,wind_gusts_10m',
        daily: 'wave_height_max,wind_speed_10m_max,wind_gusts_10m_max',
        current: 'wave_height,wave_direction,wind_speed_10m,wind_direction_10m',
        timezone: 'Asia/Kolkata',
        forecast_days: 1
      }
    })

    const data = response.data
    const current = data.current || {}
    const daily = data.daily || {}
    
    const waveHeight = current.wave_height || 0
    const windSpeed = current.wind_speed_10m || 0
    const windGusts = daily.wind_gusts_10m_max?.[0] || windSpeed
    const maxWaveHeight = daily.wave_height_max?.[0] || waveHeight
    
    // Enhanced safety assessment
    const conditions = assessBeachSafety({
      waveHeight,
      windSpeed,
      windGusts,
      maxWaveHeight,
      windDirection: current.wind_direction_10m || 0,
      waveDirection: current.wave_direction || 0
    })

    return {
      ...conditions,
      waveHeight,
      windSpeed,
      windGusts,
      maxWaveHeight,
      windDirection: current.wind_direction_10m || 0,
      waveDirection: current.wave_direction || 0,
      timestamp: new Date().toISOString()
    }
  } catch (error) {
    console.error('Weather API error:', error)
    return {
      safetyLevel: 'unknown',
      safetyColor: '#6b7280',
      safetyText: 'Weather data unavailable',
      conditions: ['Weather service unavailable'],
      waveHeight: 0,
      windSpeed: 0,
      isSafe: false,
      error: 'Weather data unavailable'
    }
  }
}

/**
 * Assess beach safety based on weather conditions
 */
function assessBeachSafety({ waveHeight, windSpeed, windGusts, maxWaveHeight }) {
  const conditions = []
  let safetyLevel = 'safe'
  let safetyColor = '#10b981'
  let safetyText = 'Good conditions'
  let isSafe = true

  // Wave height assessment
  if (waveHeight >= 3.0) {
    conditions.push(`High waves (${waveHeight.toFixed(1)}m) - Very dangerous`)
    safetyLevel = 'dangerous'
    safetyColor = '#dc2626'
    safetyText = 'Dangerous conditions'
    isSafe = false
  } else if (waveHeight >= 2.0) {
    conditions.push(`Moderate waves (${waveHeight.toFixed(1)}m) - Caution advised`)
    safetyLevel = 'caution'
    safetyColor = '#f59e0b'
    safetyText = 'Moderate conditions'
    isSafe = false
  } else if (waveHeight >= 1.0) {
    conditions.push(`Small waves (${waveHeight.toFixed(1)}m) - Generally safe`)
  } else {
    conditions.push(`Calm waters (${waveHeight.toFixed(1)}m) - Ideal conditions`)
  }

  // Wind speed assessment
  if (windSpeed >= 40) {
    conditions.push(`Very strong winds (${windSpeed.toFixed(0)} km/h) - Extremely dangerous`)
    safetyLevel = 'dangerous'
    safetyColor = '#dc2626'
    safetyText = 'Very windy conditions'
    isSafe = false
  } else if (windSpeed >= 25) {
    conditions.push(`Strong winds (${windSpeed.toFixed(0)} km/h) - Difficult conditions`)
    if (safetyLevel === 'safe') {
      safetyLevel = 'caution'
      safetyColor = '#f59e0b'
      safetyText = 'Windy conditions'
      isSafe = false
    }
  } else if (windSpeed >= 15) {
    conditions.push(`Moderate winds (${windSpeed.toFixed(0)} km/h) - Breezy`)
  } else {
    conditions.push(`Light winds (${windSpeed.toFixed(0)} km/h) - Pleasant`)
  }

  // Wind gusts warning
  if (windGusts > windSpeed + 10) {
    conditions.push(`Wind gusts up to ${windGusts.toFixed(0)} km/h - Sudden strong winds possible`)
    if (safetyLevel === 'safe') {
      safetyLevel = 'caution'
      safetyColor = '#f59e0b'
      safetyText = 'Gusty conditions'
      isSafe = false
    }
  }

  // Maximum wave height warning
  if (maxWaveHeight > waveHeight + 0.5) {
    conditions.push(`Wave heights may reach ${maxWaveHeight.toFixed(1)}m today`)
  }

  // Time-based recommendations
  const hour = new Date().getHours()
  if (hour >= 6 && hour <= 10) {
    conditions.push('🌅 Morning - Pleasant weather')
  } else if (hour >= 16 && hour <= 18) {
    conditions.push('🌅 Evening - Pleasant weather')
  } else if (hour >= 11 && hour <= 15) {
    conditions.push('☀️ Midday - Hot and sunny')
  } else {
    conditions.push('🌙 Night time - Limited visibility')
    if (safetyLevel === 'safe') {
      safetyLevel = 'caution'
      safetyColor = '#f59e0b'
      safetyText = 'Limited visibility'
    }
  }

  return {
    safetyLevel,
    safetyColor,
    safetyText,
    conditions,
    isSafe
  }
}

// Legacy function for backward compatibility
export async function getMarineWeather(lat, lng) {
  const conditions = await getBeachConditions(lat, lng)
  return {
    waveHeight: conditions.waveHeight,
    windSpeed: conditions.windSpeed,
    isSafe: conditions.isSafe,
    ...conditions
  }
}

