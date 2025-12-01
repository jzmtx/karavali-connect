import { config } from '../lib/config'
import MapViewLeaflet from './MapViewLeaflet'
import MapViewMapbox from './MapViewMapbox'

export default function MapView({ user, selectedBeach, onBeachSelect }) {
  // Check if Mapbox token is available and valid
  const hasMapboxToken = config.mapboxToken &&
    config.mapboxToken !== 'YOUR_MAPBOX_TOKEN' &&
    config.mapboxToken.startsWith('pk.')

  // Use Leaflet (free, no API key) if no Mapbox token
  if (!hasMapboxToken) {
    return (
      <MapViewLeaflet
        user={user}
        selectedBeach={selectedBeach}
        onBeachSelect={onBeachSelect}
      />
    )
  }

  // Use Mapbox if token is available
  return (
    <MapViewMapbox
      user={user}
      selectedBeach={selectedBeach}
      onBeachSelect={onBeachSelect}
    />
  )
}
