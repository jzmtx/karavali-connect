import { config } from '../lib/config'
import axios from 'axios'

/**
 * Get marine weather data for a location
 * @param {number} lat - Latitude
 * @param {number} lng - Longitude
 * @returns {Promise<object>} Weather data
 */
export async function getMarineWeather(lat, lng) {
  try {
    const response = await axios.get(config.openMeteoUrl, {
      params: {
        latitude: lat,
        longitude: lng,
        hourly: 'wave_height,wave_direction,wind_speed_10m,wind_direction_10m',
        timezone: 'Asia/Kolkata',
        forecast_days: 1
      }
    })

    const data = response.data
    const hourly = data.hourly

    // Get current hour's data
    const now = new Date()
    const currentHour = now.getHours()
    const index = currentHour

    return {
      waveHeight: hourly.wave_height?.[index] || 0,
      waveDirection: hourly.wave_direction?.[index] || 0,
      windSpeed: hourly.wind_speed_10m?.[index] || 0,
      windDirection: hourly.wind_direction_10m?.[index] || 0,
      isSafe: (hourly.wave_height?.[index] || 0) < 2.5 && (hourly.wind_speed_10m?.[index] || 0) < 30
    }
  } catch (error) {
    console.error('Weather API error:', error)
    return {
      waveHeight: 0,
      waveDirection: 0,
      windSpeed: 0,
      windDirection: 0,
      isSafe: true,
      error: 'Weather data unavailable'
    }
  }
}

