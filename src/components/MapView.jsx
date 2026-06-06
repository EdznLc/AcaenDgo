import React, { useEffect, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'

// Fix marker icon paths for Vite
const iconRetinaUrl = new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href
const iconUrl = new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href
const shadowUrl = new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href

L.Icon.Default.mergeOptions({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
})

const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.PROD ? '' : 'http://localhost:4000')

export default function MapView({ session }) {
  const [comercios, setComercios] = useState([])
  const [error, setError] = useState(null)
  const center = [24.0277, -104.6532]

  useEffect(() => {
    async function loadComercios() {
      try {
        const response = await fetch(`${API_BASE}/api/comercios`)
        if (!response.ok) {
          throw new Error(`Error ${response.status}`)
        }
        const data = await response.json()
        const cleaned = data.comercios.map((item) => ({
          id: item.id_comercio,
          name: item.nombre,
          categoria: item.categoria,
          lat: parseFloat(item.latitud),
          lng: parseFloat(item.longitud),
          codigo_postal: item.codigo_postal,
          hora_inicial: item.hora_inicial,
          hora_final: item.hora_final,
        }))
        setComercios(cleaned)
      } catch (err) {
        console.error(err)
        setError('No se pudieron cargar los comercios. Revisa el backend.')
      }
    }
    loadComercios()
  }, [])

  const categoryEmojis = {
    '1': '☕', // Cafetería
    '2': '🥐', // Panadería
    '3': '🛍️', // Tienda
    '4': '🍽️', // Restaurante
    '5': '🛠️', // Servicios
    '6': '⚕️', // Salud
    '7': '🏫', // Educación
    '8': '📦', // Otro
  }

  function getIcon(category) {
    const emoji = categoryEmojis[String(category)] || '📍'
    return L.divIcon({
      html: `<div class="category-marker">${emoji}</div>`,
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -36],
    })
  }

  return (
    <div className="map-wrapper" style={{ height: '100%', width: '100%' }}>
      {error && (
        <div className="map-error" style={{ position: 'absolute', zIndex: 1000, background: 'rgba(255,255,255,0.95)', padding: '1rem', margin: '1rem', borderRadius: '8px' }}>
          {error}
        </div>
      )}
      <MapContainer center={center} zoom={13} style={{ height: '100%', width: '100%' }}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {comercios
          .filter((b) => session?.type !== 'commerce' || b.id === Number(session.profile.id_comercio))
          .map((b) => (
          <Marker key={b.id} position={[b.lat, b.lng]} icon={getIcon(b.categoria)}>
            <Popup>
              <strong>{b.name}</strong>
              <div>{b.categoria}</div>
              <div>C.P. {b.codigo_postal}</div>
              <div>
                Horario: {b.hora_inicial} - {b.hora_final}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  )
}
