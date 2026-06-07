import React, { useEffect, useState, useRef } from 'react'
import { MapContainer, TileLayer, Marker, useMap, Polyline } from 'react-leaflet'
import L from 'leaflet'
import { categories } from '../data/options'

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

// Map helper to recenter when coordinates change
function MapRecenter({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) {
      const isDurango = center[0] === 24.0277 && center[1] === -104.6532
      map.setView(center, isDurango ? 13 : 16)
    }
  }, [center, map])
  return null
}

// Custom user location GPS marker icon
const userIcon = L.divIcon({
  html: `<div class="user-position-marker">
           <div class="pulse"></div>
           <div class="dot"></div>
         </div>`,
  className: '',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
})

export default function MapView({ session, mapRefreshKey }) {
  const [comercios, setComercios] = useState([])
  const [error, setError] = useState(null)
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedComercio, setSelectedComercio] = useState(null)
  const durangoCenter = [24.0277, -104.6532]
  const [mapCenter, setMapCenter] = useState(durangoCenter)
  const [userCoords, setUserCoords] = useState(null) // GPS user position

  // Route state
  const [routeCoords, setRouteCoords] = useState(null)
  const [routeLoading, setRouteLoading] = useState(false)

  // Chatbot state
  const [chatbotMessages, setChatbotMessages] = useState([
    {
      role: 'assistant',
      content: '¡Hola! 🤠 Soy tu guía turístico de Durango. ¿Qué tipo de lugares te gustaría descubrir hoy? Puedo recomendarte museos, restaurantes, cafeterías o atracciones históricas en la ciudad.'
    }
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef(null)

  // Autodetectar ubicación actual para centrar el mapa y setear userCoords
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = [position.coords.latitude, position.coords.longitude]
          setMapCenter(coords)
          setUserCoords(coords)
        },
        (error) => {
          console.warn('Auto-center MapView fallback:', error)
        },
        { enableHighAccuracy: false, timeout: 5000, maximumAge: 600000 }
      )
    }
  }, [])

  // Cargar comercios del backend
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
          descripcion: item.descripcion || '',
        }))
        setComercios(cleaned)
      } catch (err) {
        console.error(err)
        setError('No se pudieron cargar los comercios. Revisa el backend.')
      }
    }
    loadComercios()
  }, [mapRefreshKey])

  // Desplazar chat hacia abajo
  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [chatbotMessages, chatLoading])

  const categoryEmojis = {
    '1': '☕', // Cafetería
    '2': '🥐', // Panadería
    '3': '🍽️', // Restaurante
    '4': '🛍️', // Tienda
    '5': '🏫', // Educación
    '6': '🛠️', // Servicios
    '7': '📦', // Otro
  }

  const categoryIcons = {
    '1': '/icons/cafe.png',
    '2': '/icons/pan.png',
    '3': '/icons/restaurante.png',
    '4': '/icons/tienda.png',
    '5': '/icons/educacion.png',
    '6': '/icons/servicios.png',
    '7': '/icons/otro.png',
  }

  function getIcon(category) {
    const iconUrl = categoryIcons[String(category)]
    if (iconUrl) {
      return L.divIcon({
        html: `<div class="category-marker" style="display: flex; align-items: center; justify-content: center;"><img src="${iconUrl}" style="width: 22px; height: 22px; object-fit: contain;" alt="icon" /></div>`,
        className: '',
        iconSize: [36, 36],
        iconAnchor: [18, 36],
      })
    }
    const emoji = categoryEmojis[String(category)] || '📍'
    return L.divIcon({
      html: `<div class="category-marker">${emoji}</div>`,
      className: '',
      iconSize: [36, 36],
      iconAnchor: [18, 36],
    })
  }

  const handleSendChat = async (e) => {
    e.preventDefault()
    if (!chatInput.trim() || chatLoading) return

    const userMessage = { role: 'user', content: chatInput.trim() }
    const updatedMessages = [...chatbotMessages, userMessage]
    setChatbotMessages(updatedMessages)
    setChatInput('')
    setChatLoading(true)

    try {
      const res = await fetch(`${API_BASE}/api/recomendaciones`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages })
      })

      if (!res.ok) {
        throw new Error(`Error: ${res.status}`)
      }

      const data = await res.json()
      setChatbotMessages((prev) => [...prev, { role: 'assistant', content: data.message }])
    } catch (err) {
      console.error(err)
      setChatbotMessages((prev) => [...prev, {
        role: 'assistant',
        content: 'Lo siento, ocurrió un error al consultar mis recomendaciones turísticas. Inténtalo de nuevo más tarde.'
      }])
    } finally {
      setChatLoading(false)
    }
  }

  // Centrar en GPS actualizando coordenadas frescas
  const handleRecenterGPS = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const coords = [position.coords.latitude, position.coords.longitude]
          setUserCoords(coords)
          setMapCenter(coords)
        },
        (error) => {
          console.warn('GPS location request error (silent):', error)
        },
        { enableHighAccuracy: true, timeout: 5000 }
      )
    } else {
      console.warn('La geolocalización no está soportada por este navegador.')
    }
  }

  // Cerrar detalle de negocio y borrar ruta
  const handleCloseDetail = () => {
    setSelectedComercio(null)
    setRouteCoords(null)
  }

  // Seleccionar comercio desde el chatbot (recentrar mapa y abrir detalle)
  const handleSelectCommerceFromChat = (commerceId) => {
    const found = comercios.find((c) => Number(c.id) === Number(commerceId))
    if (found) {
      setSelectedComercio(found)
      setMapCenter([found.lat, found.lng])
      setRouteCoords(null) // Limpiar ruta anterior
    } else {
      console.warn(`Comercio con ID ${commerceId} no encontrado en la lista local.`)
    }
  }

  // Parsear texto del chat para convertir [Texto](commerce:ID) en botones interactivos
  const renderMessageContent = (content, isUser) => {
    if (isUser) return content
    if (!content) return ''

    const regex = /\[([^\]]+)\]\(commerce:(\d+)\)/g
    const parts = []
    let lastIndex = 0
    let match

    while ((match = regex.exec(content)) !== null) {
      const matchIndex = match.index
      // Añadir texto previo al match
      if (matchIndex > lastIndex) {
        parts.push(content.substring(lastIndex, matchIndex))
      }

      const buttonText = match[1]
      const commerceId = match[2]

      parts.push(
        <button
          key={matchIndex}
          onClick={() => handleSelectCommerceFromChat(commerceId)}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.25rem',
            background: '#eff6ff',
            color: '#2563eb',
            border: '1px solid #bfdbfe',
            borderRadius: '6px',
            padding: '2px 8px',
            margin: '2px 4px',
            fontSize: '0.8rem',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'all 0.2s',
            verticalAlign: 'middle',
            boxShadow: '0 1px 2px rgba(37, 99, 235, 0.05)',
            fontFamily: 'inherit'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#dbeafe'
            e.currentTarget.style.borderColor = '#93c5fd'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#eff6ff'
            e.currentTarget.style.borderColor = '#bfdbfe'
          }}
        >
          📍 {buttonText}
        </button>
      )

      lastIndex = regex.lastIndex
    }

    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex))
    }

    return parts.length > 0 ? parts : content
  }

  // Trazar ruta usando API de OSRM
  const handleTraceRoute = async () => {
    if (!userCoords || !selectedComercio) return
    setRouteLoading(true)
    try {
      const [userLat, userLng] = userCoords
      const { lat: bizLat, lng: bizLng } = selectedComercio
      const url = `https://router.project-osrm.org/route/v1/driving/${userLng},${userLat};${bizLng},${bizLat}?overview=full&geometries=geojson`

      const res = await fetch(url)
      if (!res.ok) {
        throw new Error('Error al obtener la ruta de OSRM')
      }
      const data = await res.json()
      if (data.routes && data.routes.length > 0) {
        const coords = data.routes[0].geometry.coordinates.map((p) => [p[1], p[0]])
        setRouteCoords(coords)
      } else {
        alert('No se pudo encontrar una ruta viable para llegar a este lugar.')
      }
    } catch (err) {
      console.error('Routing error:', err)
      alert('Hubo un problema de conexión con el servicio de mapas para trazar la ruta.')
    } finally {
      setRouteLoading(false)
    }
  }

  return (
    <div className="map-view-layout" style={{ display: 'flex', height: '100%', width: '100%', overflow: 'hidden', background: '#f8fafc' }}>
      {/* 1. COLUMNA IZQUIERDA: Detalle de Comercio */}
      <div style={{
        width: selectedComercio ? '360px' : '0px',
        minWidth: selectedComercio ? '360px' : '0px',
        overflow: 'hidden',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        background: '#ffffff',
        boxShadow: selectedComercio ? '4px 0 15px rgba(0,0,0,0.08)' : 'none',
        borderRight: selectedComercio ? '1px solid #e2e8f0' : 'none',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 15
      }}>
        {selectedComercio && (
          <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
              <span style={{
                background: '#e0f2fe',
                color: '#0369a1',
                padding: '0.3rem 0.75rem',
                borderRadius: '20px',
                fontSize: '0.75rem',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}>
                {categoryIcons[String(selectedComercio.categoria)] ? (
                  <img
                    src={categoryIcons[String(selectedComercio.categoria)]}
                    style={{ width: '14px', height: '14px', objectFit: 'contain' }}
                    alt="icon"
                  />
                ) : (
                  categoryEmojis[String(selectedComercio.categoria)] || '📍'
                )}
                {categories.find(c => String(c.value) === String(selectedComercio.categoria))?.label || 'Otro'}
              </span>
              <button
                onClick={handleCloseDetail}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '1.2rem',
                  cursor: 'pointer',
                  padding: '0.25rem',
                  borderRadius: '50%',
                  display: 'grid',
                  placeItems: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#f1f5f9'
                  e.currentTarget.style.color = '#1e293b'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = 'transparent'
                  e.currentTarget.style.color = '#64748b'
                }}
              >
                ✕
              </button>
            </div>

            <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.4rem', fontWeight: '800', color: '#0f172a', lineHeight: '1.2' }}>
              {selectedComercio.name}
            </h2>

            <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '1.25rem' }}>
              <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.8rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: '700' }}>
                Descripción del Negocio
              </h4>
              <p style={{ margin: 0, fontSize: '0.9rem', color: '#334155', lineHeight: '1.5', whiteSpace: 'pre-line' }}>
                {selectedComercio.descripcion || 'Este negocio no cuenta con una descripción detallada en este momento.'}
              </p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>⏰</div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '500' }}>Horario de Atención</div>
                  <div style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: '600' }}>
                    {selectedComercio.hora_inicial} — {selectedComercio.hora_final}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>📮</div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '500' }}>Código Postal</div>
                  <div style={{ fontSize: '0.85rem', color: '#1e293b', fontWeight: '600' }}>
                    C.P. {selectedComercio.codigo_postal}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem' }}>📍</div>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '500' }}>Coordenadas</div>
                  <div style={{ fontSize: '0.8rem', color: '#334155', fontFamily: 'monospace' }}>
                    {selectedComercio.lat.toFixed(6)}, {selectedComercio.lng.toFixed(6)}
                  </div>
                </div>
              </div>
            </div>

            {/* Panel de Botones de Acción */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1.5rem' }}>
              <button
                onClick={() => setMapCenter([selectedComercio.lat, selectedComercio.lng])}
                style={{
                  padding: '0.7rem',
                  borderRadius: '8px',
                  border: 'none',
                  background: '#f1f5f9',
                  color: '#1e293b',
                  fontWeight: '600',
                  fontSize: '0.85rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = '#e2e8f0'}
                onMouseLeave={(e) => e.currentTarget.style.background = '#f1f5f9'}
              >
                🎯 Centrar en mapa
              </button>

              {userCoords && (
                <button
                  onClick={routeCoords ? () => setRouteCoords(null) : handleTraceRoute}
                  disabled={routeLoading}
                  style={{
                    padding: '0.7rem',
                    borderRadius: '8px',
                    border: 'none',
                    background: routeCoords 
                      ? '#ef4444' 
                      : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    color: '#ffffff',
                    fontWeight: '600',
                    fontSize: '0.85rem',
                    cursor: routeLoading ? 'default' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.5rem',
                    transition: 'all 0.2s',
                    boxShadow: routeCoords ? 'none' : '0 2px 4px rgba(37,99,235,0.2)'
                  }}
                  onMouseEnter={(e) => {
                    if (!routeLoading) {
                      e.currentTarget.style.filter = 'brightness(1.1)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.filter = 'brightness(1)'
                  }}
                >
                  {routeLoading ? '🚗 Calculando...' : routeCoords ? '🗑️ Borrar Ruta' : '🚗 Cómo llegar (Ruta)'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. COLUMNA CENTRAL: Mapa */}
      <div style={{ flex: 1, height: '100%', position: 'relative' }}>
        {error && (
          <div className="map-error" style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 1000, background: 'rgba(255,255,255,0.95)', padding: '0.75rem 1rem', borderRadius: '8px', borderLeft: '4px solid #ef4444', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: '0.85rem', color: '#991b1b', fontWeight: '600' }}>
            ⚠️ {error}
          </div>
        )}

        {/* GPS Recenter Floating Button */}
        <button
          onClick={handleRecenterGPS}
          title="Centrar en mi ubicación actual"
          style={{
            position: 'absolute',
            bottom: '24px',
            right: '24px',
            zIndex: 1000,
            width: '48px',
            height: '48px',
            borderRadius: '50%',
            background: '#ffffff',
            border: 'none',
            boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.4rem',
            transition: 'all 0.2s',
            color: '#2563eb',
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'scale(1.1)'
            e.currentTarget.style.background = '#f8fafc'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)'
            e.currentTarget.style.background = '#ffffff'
          }}
        >
          🎯
        </button>

        <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapRecenter center={mapCenter} />

          {/* Marcador de Ubicación del Usuario (GPS) */}
          {userCoords && (
            <Marker position={userCoords} icon={userIcon} />
          )}

          {/* Dibujo de la ruta trazada */}
          {routeCoords && (
            <Polyline positions={routeCoords} color="#2563eb" weight={5} opacity={0.75} />
          )}

          {comercios
            .filter((b) => session?.type !== 'commerce' || b.id === Number(session.profile.id_comercio))
            .filter((b) => !selectedCategory || String(b.categoria) === String(selectedCategory))
            .map((b) => (
              <Marker
                key={b.id}
                position={[b.lat, b.lng]}
                icon={getIcon(b.categoria)}
                eventHandlers={{
                  click: () => {
                    setSelectedComercio(b)
                    setMapCenter([b.lat, b.lng])
                    setRouteCoords(null) // Reset route when selecting new shop
                  }
                }}
              />
            ))}
        </MapContainer>
      </div>

      {/* 3. COLUMNA DERECHA: Filtros + Chatbot Turístico */}
      <div style={{
        width: '380px',
        minWidth: '380px',
        background: '#ffffff',
        borderLeft: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 15
      }}>
        {/* Filtros de Categorías en una cuadrícula moderna con íconos */}
        <div style={{
          padding: '1.25rem',
          borderBottom: '1px solid #e2e8f0',
          background: '#f8fafc'
        }}>
          <h3 style={{ margin: '0 0 0.85rem 0', fontSize: '0.85rem', color: '#475569', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            🔍 Filtrar Categoría
          </h3>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '0.5rem',
            maxHeight: '190px',
            overflowY: 'auto',
            paddingRight: '4px'
          }}>
            {/* Botón de "Todas" */}
            <button
              onClick={() => setSelectedCategory('')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.5rem 0.75rem',
                borderRadius: '8px',
                border: selectedCategory === '' ? '2px solid #2563eb' : '1px solid #cbd5e1',
                background: selectedCategory === '' ? '#eff6ff' : '#ffffff',
                color: selectedCategory === '' ? '#1d4ed8' : '#1e293b',
                fontSize: '0.8rem',
                fontWeight: selectedCategory === '' ? '700' : '500',
                cursor: 'pointer',
                transition: 'all 0.2s',
                outline: 'none',
                boxShadow: selectedCategory === '' ? '0 2px 4px rgba(37,99,235,0.1)' : '0 1px 2px rgba(0,0,0,0.05)'
              }}
              onMouseEnter={(e) => {
                if (selectedCategory !== '') {
                  e.currentTarget.style.background = '#f1f5f9'
                  e.currentTarget.style.borderColor = '#94a3b8'
                }
              }}
              onMouseLeave={(e) => {
                if (selectedCategory !== '') {
                  e.currentTarget.style.background = '#ffffff'
                  e.currentTarget.style.borderColor = '#cbd5e1'
                }
              }}
            >
              <span style={{ fontSize: '1rem' }}>🗺️</span>
              Todas
            </button>

            {/* Listado de Categorías */}
            {categories.map((cat) => {
              const isSelected = String(selectedCategory) === String(cat.value)
              const iconUrl = categoryIcons[cat.value]
              const emoji = categoryEmojis[cat.value] || '📍'

              return (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    border: isSelected ? '2px solid #2563eb' : '1px solid #cbd5e1',
                    background: isSelected ? '#eff6ff' : '#ffffff',
                    color: isSelected ? '#1d4ed8' : '#1e293b',
                    fontSize: '0.8rem',
                    fontWeight: isSelected ? '700' : '500',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    outline: 'none',
                    boxShadow: isSelected ? '0 2px 4px rgba(37,99,235,0.1)' : '0 1px 2px rgba(0,0,0,0.05)',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = '#f1f5f9'
                      e.currentTarget.style.borderColor = '#94a3b8'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.background = '#ffffff'
                      e.currentTarget.style.borderColor = '#cbd5e1'
                    }
                  }}
                >
                  {iconUrl ? (
                    <img
                      src={iconUrl}
                      style={{ width: '16px', height: '16px', objectFit: 'contain' }}
                      alt={cat.label}
                    />
                  ) : (
                    <span style={{ fontSize: '1rem' }}>{emoji}</span>
                  )}
                  <span style={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {cat.label}
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* Chatbot Turístico */}
        <div style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: '#f8fafc'
        }}>
          <div style={{
            padding: '1rem 1.25rem',
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            gap: '0.6rem',
            boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
          }}>
            <span style={{ fontSize: '1.35rem' }}>🤠</span>
            <div>
              <div style={{ fontWeight: '700', fontSize: '0.9rem' }}>Guía Durango AI</div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Pregúntame lugares o comida</div>
            </div>
          </div>

          {/* Lista de mensajes */}
          <div style={{
            flex: 1,
            padding: '1rem',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}>
            {chatbotMessages.map((m, idx) => {
              const isUser = m.role === 'user'
              return (
                <div
                  key={idx}
                  style={{
                    alignSelf: isUser ? 'flex-end' : 'flex-start',
                    maxWidth: '85%',
                    background: isUser ? '#2563eb' : '#ffffff',
                    color: isUser ? '#ffffff' : '#1e293b',
                    padding: '0.75rem 0.9rem',
                    borderRadius: isUser ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                    fontSize: '0.85rem',
                    lineHeight: '1.4',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                    border: isUser ? 'none' : '1px solid #e2e8f0',
                    whiteSpace: 'pre-line'
                  }}
                >
                  {renderMessageContent(m.content, isUser)}
                </div>
              )
            })}
            {chatLoading && (
              <div
                style={{
                  alignSelf: 'flex-start',
                  background: '#ffffff',
                  color: '#64748b',
                  padding: '0.75rem 0.9rem',
                  borderRadius: '16px 16px 16px 2px',
                  fontSize: '0.85rem',
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <div style={{ display: 'flex', gap: '3px' }}>
                  <span className="thinking-dot-pulse" style={{ animation: 'bounce 1.4s infinite ease-in-out both' }}>●</span>
                  <span className="thinking-dot-pulse" style={{ animation: 'bounce 1.4s infinite ease-in-out both 0.2s' }}>●</span>
                  <span className="thinking-dot-pulse" style={{ animation: 'bounce 1.4s infinite ease-in-out both 0.4s' }}>●</span>
                </div>
                <span style={{ fontSize: '0.75rem', marginLeft: '0.25rem' }}>Buscando sugerencias...</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Formulario de entrada */}
          <form
            onSubmit={handleSendChat}
            style={{
              padding: '0.75rem 1rem',
              background: '#ffffff',
              borderTop: '1px solid #e2e8f0',
              display: 'flex',
              gap: '0.5rem',
              alignItems: 'center'
            }}
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Pregunta sobre turismo o comida..."
              disabled={chatLoading}
              style={{
                flex: 1,
                padding: '0.6rem 0.9rem',
                borderRadius: '20px',
                border: '1px solid #cbd5e1',
                fontSize: '0.85rem',
                outline: 'none',
                transition: 'all 0.2s'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = '#2563eb'}
              onBlur={(e) => e.currentTarget.style.borderColor = '#cbd5e1'}
            />
            <button
              type="submit"
              disabled={chatLoading || !chatInput.trim()}
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '50%',
                border: 'none',
                background: chatInput.trim() ? '#2563eb' : '#cbd5e1',
                color: '#ffffff',
                cursor: chatInput.trim() ? 'pointer' : 'default',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1rem',
                transition: 'all 0.2s',
                boxShadow: chatInput.trim() ? '0 2px 4px rgba(37,99,235,0.2)' : 'none'
              }}
            >
              ➔
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
