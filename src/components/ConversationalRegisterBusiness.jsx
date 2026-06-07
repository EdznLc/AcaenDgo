import React, { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet'
import L from 'leaflet'
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

export default function ConversationalRegisterBusiness({ ownerProfile, onConversationalComplete }) {
  const [messages, setMessages] = useState([
    {
      role: 'model',
      content: '¡Hola! Qué gusto saludarte. Soy tu asistente de AcaenDgo. Te ayudaré a registrar tu negocio paso a paso. Para comenzar, ¿cuál es el nombre de tu negocio?'
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [isComplete, setIsComplete] = useState(false)

  // Map and Location States
  const durangoCenter = [24.0277, -104.6532]
  const [selectedCoords, setSelectedCoords] = useState(null)
  const [mapCenter, setMapCenter] = useState(durangoCenter)
  const [postcode, setPostcode] = useState('')
  const [locating, setLocating] = useState(false)
  const [locError, setLocError] = useState('')
  
  const chatEndRef = useRef(null)
  const inputRef = useRef(null)
  const locatingRef = useRef(false)

  // Desplazar automáticamente hacia abajo en nuevos mensajes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Mantener el focus en el input
  useEffect(() => {
    if (!isComplete) {
      inputRef.current?.focus()
    }
  }, [loading, isComplete, messages])

  // Centrar el mapa en la ubicación del dispositivo al cargar
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter([position.coords.latitude, position.coords.longitude])
        },
        (err) => {
          console.warn('GPS init auto-center fallback:', err)
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 }
      )
    }
  }, [])

  // Helper to send message to backend
  const sendMessageToBackend = async (updatedMessages) => {
    setLoading(true)
    setErrorMsg('')
    try {
      const response = await fetch(`${API_BASE}/api/registro-comercios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al conectar con la IA')
      }

      if (data.status === 'complete') {
        // Enlazar coordenadas si se seleccionaron en el mapa pero el JSON no las mapeó
        if (selectedCoords) {
          data.data.latitud = data.data.latitud || selectedCoords.lat.toFixed(6)
          data.data.longitud = data.data.longitud || selectedCoords.lng.toFixed(6)
          data.data.codigo_postal = data.data.codigo_postal || postcode
        }
        
        setMessages((prev) => [...prev, { role: 'model', content: data.message }])
        setIsComplete(true)
        
        // Redirigir al formulario manual después de 4.5 segundos
        setTimeout(() => {
          onConversationalComplete(data.data)
        }, 4500)

      } else {
        // Conversación sigue activa
        setMessages((prev) => [...prev, { role: 'model', content: data.message }])
      }

    } catch (err) {
      console.error(err)
      setErrorMsg('Tuvimos un problema de conexión con la IA. Intenta de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  // Handle standard user typing submit
  const handleSend = async (e) => {
    if (e) e.preventDefault()
    if (!inputValue.trim() || loading || isComplete) return

    const userMessage = { role: 'user', content: inputValue.trim() }
    const updatedMessages = [...messages, userMessage]

    setMessages(updatedMessages)
    setInputValue('')
    
    setTimeout(() => {
      inputRef.current?.focus()
    }, 50)

    await sendMessageToBackend(updatedMessages)
  }

  // Handle map interaction (click on map)
  const handleMapClick = async (lat, lng) => {
    if (isComplete) return
    
    setSelectedCoords({ lat, lng })
    setMapCenter([lat, lng])
    setLocError('')

    // Auto-fetch postal code
    const pc = await getPostcodeFromCoords(lat, lng)
    setPostcode(pc)

    // Send a system update message so the chatbot responds acknowledging the location
    const systemNotice = `[Ubicación seleccionada en el mapa: Latitud: ${lat.toFixed(6)}, Longitud: ${lng.toFixed(6)}, Código Postal: ${pc || 'No detectado'}]`
    const userMessage = { role: 'user', content: systemNotice }
    const updatedMessages = [...messages, userMessage]

    setMessages(updatedMessages)
    await sendMessageToBackend(updatedMessages)
  }

  // Handle GPS location click
  const handleGetLocation = () => {
    if (locatingRef.current || isComplete) return

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
      setSelectedCoords({ lat, lng })
      setMapCenter([lat, lng])
      
      locatingRef.current = false
      setLocating(false)

      // Auto-fetch postal code
      const pc = await getPostcodeFromCoords(lat, lng)
      setPostcode(pc)

      // Send a system update message so the chatbot responds
      const systemNotice = `[Ubicación seleccionada en el mapa (GPS): Latitud: ${lat.toFixed(6)}, Longitud: ${lng.toFixed(6)}, Código Postal: ${pc || 'No detectado'}]`
      const userMessage = { role: 'user', content: systemNotice }
      const updatedMessages = [...messages, userMessage]

      setMessages(updatedMessages)
      await sendMessageToBackend(updatedMessages)
    }

    const errorCallback = (err) => {
      console.warn(`Error GPS: ${err.message}`)
      if (err.code !== 1) { // No es denegado
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

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: '1.5rem',
      width: '100%',
      minHeight: '520px'
    }}>
      {/* Columna Izquierda: Chat */}
      <div style={{
        flex: '1 1 400px',
        display: 'flex',
        flexDirection: 'column',
        height: '520px',
        background: '#efeae2',
        borderRadius: '12px',
        overflow: 'hidden',
        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
        border: '1px solid #e2e8f0'
      }}>
        {/* Header del Chat */}
        <div style={{
          background: '#075e54',
          color: '#fff',
          padding: '0.75rem 1rem',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: '#128c7e',
            display: 'grid',
            placeItems: 'center',
            fontSize: '1.25rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            🏢
          </div>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Registro de Negocios</div>
            <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>En línea • Asistente Virtual</div>
          </div>
        </div>

        {/* Mensajes */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '1rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '0.75rem'
        }}>
          {messages.map((msg, index) => {
            const isUser = msg.role === 'user'
            // Ocultar los avisos del sistema del mapa para mantener limpio el chat del usuario
            if (isUser && msg.content.startsWith('[Ubicación seleccionada')) {
              return (
                <div key={index} style={{
                  alignSelf: 'center',
                  background: '#e2e8f0',
                  color: '#475569',
                  padding: '0.4rem 0.75rem',
                  borderRadius: '6px',
                  fontSize: '0.75rem',
                  fontWeight: 600,
                  textAlign: 'center',
                  maxWidth: '90%',
                  border: '1px dashed #cbd5e1'
                }}>
                  📍 Ubicación seleccionada en el mapa
                </div>
              )
            }
            
            return (
              <div
                key={index}
                style={{
                  alignSelf: isUser ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                  background: isUser ? '#d9fdd3' : '#fff',
                  color: '#303030',
                  padding: '0.6rem 0.85rem',
                  borderRadius: isUser ? '12px 0 12px 12px' : '0 12px 12px 12px',
                  fontSize: '0.925rem',
                  lineHeight: 1.4,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                  whiteSpace: 'pre-line'
                }}
              >
                {msg.content}
              </div>
            )
          })}

          {loading && (
            <div style={{
              alignSelf: 'flex-start',
              background: '#fff',
              padding: '0.6rem 1rem',
              borderRadius: '0 12px 12px 12px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem'
            }}>
              <span style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic' }}>Escribiendo...</span>
            </div>
          )}

          {isComplete && (
            <div style={{
              background: '#d1fae5',
              color: '#065f46',
              padding: '0.75rem',
              borderRadius: '8px',
              textAlign: 'center',
              fontSize: '0.875rem',
              fontWeight: 'bold',
              border: '1px solid #10b981'
            }}>
              🎉 ¡Datos del negocio recopilados! Redirigiendo al formulario real...
            </div>
          )}

          {errorMsg && (
            <div style={{
              background: '#fee2e2',
              color: '#991b1b',
              padding: '0.5rem 0.75rem',
              borderRadius: '8px',
              fontSize: '0.85rem',
              textAlign: 'center',
              border: '1px solid #f87171'
            }}>
              ⚠️ {errorMsg}
            </div>
          )}
          <div ref={chatEndRef} />
        </div>

        {/* Input Form */}
        <form onSubmit={handleSend} style={{
          background: '#f0f2f5',
          padding: '0.6rem 0.75rem',
          display: 'flex',
          gap: '0.5rem',
          alignItems: 'center',
          borderTop: '1px solid #e2e8f0'
        }}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder={isComplete ? 'Registro completado' : 'Escribe tu respuesta aquí...'}
            disabled={isComplete}
            readOnly={loading}
            style={{
              flex: 1,
              padding: '0.6rem 1rem',
              borderRadius: '20px',
              border: 'none',
              outline: 'none',
              fontSize: '0.9rem',
              background: '#fff',
              boxShadow: 'inset 0 1px 2px rgba(0,0,0,0.05)'
            }}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || loading || isComplete}
            style={{
              background: '#128c7e',
              color: '#fff',
              border: 'none',
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              cursor: (!inputValue.trim() || loading || isComplete) ? 'not-allowed' : 'pointer',
              display: 'grid',
              placeItems: 'center',
              fontSize: '1rem',
              boxShadow: '0 1px 3px rgba(0,0,0,0.2)'
            }}
          >
            ➤
          </button>
        </form>
      </div>

      {/* Columna Derecha: Mapa de ubicación */}
      <div style={{
        flex: '1 1 350px',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
        minHeight: '380px'
      }}>
        <div style={{ padding: '0.5rem 0.75rem', background: '#f8fafc', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
          <h4 style={{ margin: '0 0 0.25rem', color: '#1e293b' }}>📍 Ubicación del Negocio</h4>
          <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
            Haz clic en el mapa para posicionar tu negocio. Resolveremos las coordenadas y el código postal automáticamente.
          </p>
        </div>

        <button
          type="button"
          onClick={handleGetLocation}
          disabled={locating || isComplete}
          style={{
            padding: '0.6rem 1rem',
            background: '#0ea5e9',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: (locating || isComplete) ? 'not-allowed' : 'pointer',
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

        <div style={{ flex: 1, borderRadius: '12px', overflow: 'hidden', border: '1px solid #cbd5e1', minHeight: '320px', position: 'relative' }}>
          <MapContainer center={mapCenter} zoom={14} style={{ height: '100%', width: '100%' }}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <MapEvents onMapClick={handleMapClick} />
            <MapRecenter center={mapCenter} />

            {selectedCoords && (
              <Marker position={[selectedCoords.lat, selectedCoords.lng]} icon={customIcon}>
                <MarkerPopup lat={selectedCoords.lat} lng={selectedCoords.lng} postcode={postcode} />
              </Marker>
            )}
          </MapContainer>
        </div>

        {selectedCoords && (
          <div style={{ background: '#f1f5f9', padding: '0.6rem 0.75rem', borderRadius: '8px', fontSize: '0.825rem', display: 'grid', gap: '0.2rem' }}>
            <div><strong>Latitud:</strong> {selectedCoords.lat.toFixed(6)}</div>
            <div><strong>Longitud:</strong> {selectedCoords.lng.toFixed(6)}</div>
            <div><strong>Código Postal:</strong> {postcode || <span style={{ color: '#64748b', fontStyle: 'italic' }}>Buscando...</span>}</div>
          </div>
        )}
      </div>
    </div>
  )
}

function MarkerPopup({ lat, lng, postcode }) {
  return (
    <div style={{ fontSize: '0.8rem' }}>
      <strong>Ubicación Seleccionada</strong>
      <div>Lat: {lat.toFixed(5)}</div>
      <div>Lng: {lng.toFixed(5)}</div>
      <div>CP: {postcode || 'No obtenido'}</div>
    </div>
  )
}
