import React, { useState, useRef, useEffect } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
import { categories } from '../data/options'
import { getPostcodeFromCoords } from '../utils/geocoding'

// Fix marker icon paths for Vite
const iconRetinaUrl = new URL('leaflet/dist/images/marker-icon-2x.png', import.meta.url).href
const iconUrl = new URL('leaflet/dist/images/marker-icon.png', import.meta.url).href
const shadowUrl = new URL('leaflet/dist/images/marker-shadow.png', import.meta.url).href

const customIcon = L.icon({
  iconRetinaUrl,
  iconUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
})

const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.PROD ? '' : 'http://localhost:4000')

// Map event helper to handle clicks
function MapEvents({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng)
    }
  })
  return null
}

// Map helper to recenter when coordinates change
function MapRecenter({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) {
      const isDurango = center[0] === 24.0277 && center[1] === -104.6532
      map.setView(center, isDurango ? 14 : 17)
    }
  }, [center, map])
  return null
}

export default function RegisterBusinessForm({ ownerProfile, onSuccess, initialValues = {} }) {
  const [form, setForm] = useState({
    comercio_nombre: '',
    comercio_id_usuario: ownerProfile?.id_usuario || '',
    comercio_categoria: '',
    codigo_postal: '',
    comercio_latitud: '',
    comercio_longitud: '',
    comercio_hora_inicial: '',
    comercio_hora_final: '',
    comercio_descripcion: '',
  })

  // Apply initial values if pre-filled (from conversational register)
  useEffect(() => {
    if (initialValues && Object.keys(initialValues).length > 0) {
      setForm((prev) => ({
        ...prev,
        comercio_nombre: initialValues.nombre || prev.comercio_nombre,
        comercio_categoria: initialValues.categoria || prev.comercio_categoria,
        codigo_postal: initialValues.codigo_postal || prev.codigo_postal,
        comercio_latitud: initialValues.latitud || prev.comercio_latitud,
        comercio_longitud: initialValues.longitud || prev.comercio_longitud,
        comercio_hora_inicial: initialValues.hora_inicial || prev.comercio_hora_inicial,
        comercio_hora_final: initialValues.hora_final || prev.comercio_hora_final,
        comercio_descripcion: initialValues.descripcion || prev.comercio_descripcion,
      }))
    }
  }, [initialValues])

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [locating, setLocating] = useState(false)
  const [locError, setLocError] = useState('')
  const locatingRef = useRef(false)

  // Map state derived from form coords
  const durangoCenter = [24.0277, -104.6532]
  const latVal = parseFloat(form.comercio_latitud)
  const lngVal = parseFloat(form.comercio_longitud)
  const markerPosition = (!isNaN(latVal) && !isNaN(lngVal)) ? { lat: latVal, lng: lngVal } : null
  const [mapCenter, setMapCenter] = useState(durangoCenter)

  // Recenter map center if latitud/longitud coordinates change
  useEffect(() => {
    if (markerPosition) {
      setMapCenter([markerPosition.lat, markerPosition.lng])
    }
  }, [form.comercio_latitud, form.comercio_longitud])

  // Centrar el mapa en la ubicación real del usuario al cargar
  useEffect(() => {
    if (!markerPosition && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter([position.coords.latitude, position.coords.longitude])
        },
        (error) => {
          console.warn('Manual form map auto-center fallback:', error)
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 }
      )
    }
  }, [])

  const handleMapClick = async (lat, lng) => {
    setForm((prev) => ({
      ...prev,
      comercio_latitud: lat.toFixed(6),
      comercio_longitud: lng.toFixed(6),
    }))
    setLocError('')

    // Auto-fetch postcode from Nominatim reverse geocoding
    const pc = await getPostcodeFromCoords(lat, lng)
    if (pc) {
      setForm((prev) => ({ ...prev, codigo_postal: pc }))
    }
  }

  const handleGetLocation = () => {
    if (locatingRef.current) return

    if (!navigator.geolocation) {
      setLocError('La geolocalización no está soportada por tu navegador.')
      return
    }

    locatingRef.current = true
    setLocating(true)
    setLocError('')

    const options = { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }

    const successCallback = async (position) => {
      const lat = position.coords.latitude
      const lng = position.coords.longitude
      setForm((prev) => ({
        ...prev,
        comercio_latitud: lat.toFixed(6),
        comercio_longitud: lng.toFixed(6),
      }))
      setLocError('')
      locatingRef.current = false
      setLocating(false)

      // Auto-fetch postcode for current GPS coordinates
      const pc = await getPostcodeFromCoords(lat, lng)
      if (pc) {
        setForm((prev) => ({ ...prev, codigo_postal: pc }))
      }
    }

    const errorCallback = (err) => {
      console.warn(`Error GPS: ${err.message}`)
      if (err.code !== 1) {
        options.enableHighAccuracy = false
        navigator.geolocation.getCurrentPosition(successCallback, finalErrorCallback, options)
      } else {
        finalErrorCallback(err)
      }
    }

    const finalErrorCallback = (err) => {
      let msg = 'No se pudo obtener tu ubicación GPS.'
      if (err.code === 1) msg = 'Permiso de ubicación denegado.'
      else if (err.code === 3) msg = 'La solicitud expiró. Intenta de nuevo.'
      setLocError(msg)
      locatingRef.current = false
      setLocating(false)
    }

    navigator.geolocation.getCurrentPosition(successCallback, errorCallback, options)
  }

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  const validateForm = () => {
    if (!form.comercio_nombre || !/^[a-záéíóúñ\s0-9\-\.]+$/i.test(form.comercio_nombre)) {
      setError('Nombre del negocio inválido')
      return false
    }
    if (!form.comercio_categoria) {
      setError('Debes seleccionar una categoría')
      return false
    }
    if (form.codigo_postal && !/^\d{5}$/.test(form.codigo_postal)) {
      setError('Código postal debe tener 5 dígitos')
      return false
    }
    const lat = parseFloat(form.comercio_latitud)
    if (isNaN(lat) || lat < -90 || lat > 90) {
      setError('Latitud debe ser un número entre -90 y 90')
      return false
    }
    const lng = parseFloat(form.comercio_longitud)
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setError('Longitud debe ser un número entre -180 y 180')
      return false
    }
    if (form.comercio_hora_inicial && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(form.comercio_hora_inicial)) {
      setError('Hora inicial debe estar en formato HH:MM (ej: 08:00)')
      return false
    }
    if (form.comercio_hora_final && !/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/.test(form.comercio_hora_final)) {
      setError('Hora final debe estar en formato HH:MM (ej: 22:00)')
      return false
    }
    return true
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (!validateForm()) return

    setLoading(true)

    try {
      const response = await fetch(`${API_BASE}/api/auth/register-commerce`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: form.comercio_nombre,
          id_usuario: form.comercio_id_usuario,
          categoria: form.comercio_categoria,
          codigo_postal: form.codigo_postal,
          longitud: form.comercio_longitud,
          latitud: form.comercio_latitud,
          hora_inicial: form.comercio_hora_inicial,
          hora_final: form.comercio_hora_final,
          descripcion: form.comercio_descripcion,
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Error al registrar negocio')
        return
      }

      // Reset
      setForm({
        comercio_nombre: '',
        comercio_id_usuario: ownerProfile?.id_usuario || '',
        comercio_categoria: '',
        codigo_postal: '',
        comercio_latitud: '',
        comercio_longitud: '',
        comercio_hora_inicial: '',
        comercio_hora_final: '',
        comercio_descripcion: '',
      })
      onSuccess(data)
    } catch (err) {
      setError('No se pudo conectar con el servidor')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: '1.5rem',
      width: '100%',
      maxWidth: '860px',
      margin: '0 auto',
      padding: '0.5rem'
    }}>
      {/* Formulario en sí */}
      <form onSubmit={handleSubmit} style={{
        flex: '1 1 400px',
        display: 'grid',
        gap: '0.75rem',
        background: '#ffffffcc',
        padding: '1rem',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.06)'
      }}>
        <label>
          Nombre del negocio
          <input name="comercio_nombre" value={form.comercio_nombre} onChange={handleChange} placeholder="Ej: Café La Esquina" required style={{ width: '100%', padding: '0.75rem', marginTop: '0.25rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
        </label>

        <label>
          ID dueño
          <input name="comercio_id_usuario" value={form.comercio_id_usuario} onChange={handleChange} readOnly style={{ width: '100%', padding: '0.75rem', marginTop: '0.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f1f5f9' }} />
        </label>

        <label>
          Categoría
          <select name="comercio_categoria" value={form.comercio_categoria} onChange={handleChange} required style={{ width: '100%', padding: '0.6rem', marginTop: '0.25rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
            <option value="">Selecciona una categoría</option>
            {categories.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </label>

        <label>
          Descripción del negocio
          <textarea name="comercio_descripcion" value={form.comercio_descripcion} onChange={handleChange} placeholder="Ej: Café tradicional con repostería artesanal." required style={{ width: '100%', padding: '0.75rem', marginTop: '0.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontFamily: 'inherit', resize: 'vertical', minHeight: '60px' }} />
        </label>

        <label>
          Código postal
          <input name="codigo_postal" value={form.codigo_postal} onChange={handleChange} placeholder="34000" maxLength="5" style={{ width: '100%', padding: '0.75rem', marginTop: '0.25rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
        </label>

        <label>
          Latitud
          <input name="comercio_latitud" value={form.comercio_latitud} onChange={handleChange} placeholder="24.0279" required style={{ width: '100%', padding: '0.75rem', marginTop: '0.25rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
        </label>

        <label>
          Longitud
          <input name="comercio_longitud" value={form.comercio_longitud} onChange={handleChange} placeholder="-104.6523" required style={{ width: '100%', padding: '0.75rem', marginTop: '0.25rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
        </label>

        <label>
          Hora de apertura
          <input name="comercio_hora_inicial" value={form.comercio_hora_inicial} onChange={handleChange} placeholder="08:00" style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
        </label>

        <label>
          Hora de cierre
          <input name="comercio_hora_final" value={form.comercio_hora_final} onChange={handleChange} placeholder="22:00" style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
        </label>

        {error && <div style={{ color: '#b91c1c', fontWeight: 600 }}>{error}</div>}

        <button type="submit" disabled={loading} style={{ padding: '0.9rem', background: '#00529b', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', marginTop: '0.5rem' }}>
          {loading ? 'Registrando...' : 'Registrar negocio'}
        </button>
      </form>

      {/* Mapa de ubicación a la derecha */}
      <div style={{
        flex: '1 1 350px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        minHeight: '380px'
      }}>
        <div style={{ padding: '0.5rem 0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
          <h4 style={{ margin: '0 0 0.25rem', color: '#1e293b' }}>📍 Selector de Ubicación</h4>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
            Puedes hacer clic en el mapa para ubicar tu comercio. El código postal se seleccionará automáticamente según la latitud y longitud.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGetLocation}
          disabled={locating}
          style={{
            padding: '0.6rem 1rem',
            background: '#0ea5e9',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: locating ? 'not-allowed' : 'pointer',
            fontWeight: 'bold',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.5rem',
            opacity: locating ? 0.7 : 1
          }}
        >
          🌐 {locating ? 'Obteniendo GPS...' : 'Usar mi ubicación actual'}
        </button>

        {locError && <div style={{ color: '#ef4444', fontSize: '0.825rem', fontWeight: 600 }}>⚠️ {locError}</div>}

        <div style={{ flex: 1, borderRadius: '12px', overflow: 'hidden', border: '1px solid #cbd5e1', minHeight: '320px' }}>
          <MapContainer center={mapCenter} zoom={14} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapEvents onMapClick={handleMapClick} />
            <MapRecenter center={mapCenter} />

            {markerPosition && (
              <Marker position={[markerPosition.lat, markerPosition.lng]} icon={customIcon} />
            )}
          </MapContainer>
        </div>
      </div>
    </div>
  )
}
