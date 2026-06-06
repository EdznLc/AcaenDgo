import React, { useState } from 'react'
import { categories } from '../data/options'

const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.PROD ? '' : 'http://localhost:4000')

export default function RegisterBusinessForm({ ownerProfile, onSuccess }) {
  const [form, setForm] = useState({
    comercio_nombre: '',
    comercio_id_usuario: ownerProfile?.id_usuario || '',
    comercio_categoria: '',
    codigo_postal: '',
    comercio_latitud: '',
    comercio_longitud: '',
    comercio_hora_inicial: '',
    comercio_hora_final: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (event) => {
    setForm({ ...form, [event.target.name]: event.target.value })
  }

  const validateForm = () => {
    // Nombre: solo letras y espacios
    if (!form.comercio_nombre || !/^[a-záéíóúñ\s0-9\-\.]+$/i.test(form.comercio_nombre)) {
      setError('Nombre del negocio inválido')
      return false
    }
    // Categoría: debe estar seleccionada
    if (!form.comercio_categoria) {
      setError('Debes seleccionar una categoría')
      return false
    }
    // Código postal: 5 dígitos (opcional pero si se ingresa debe ser válido)
    if (form.codigo_postal && !/^\d{5}$/.test(form.codigo_postal)) {
      setError('Código postal debe tener 5 dígitos')
      return false
    }
    // Latitud: entre -90 y 90
    const lat = parseFloat(form.comercio_latitud)
    if (isNaN(lat) || lat < -90 || lat > 90) {
      setError('Latitud debe ser un número entre -90 y 90')
      return false
    }
    // Longitud: entre -180 y 180
    const lng = parseFloat(form.comercio_longitud)
    if (isNaN(lng) || lng < -180 || lng > 180) {
      setError('Longitud debe ser un número entre -180 y 180')
      return false
    }
    // Horas: formato válido (opcional pero si se ingresa debe ser válido)
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

    // Validate before submitting
    if (!validateForm()) {
      return
    }

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
        }),
      })

      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Error al registrar negocio')
        return
      }

      // Success
      setForm({
        comercio_nombre: '',
        comercio_id_usuario: ownerProfile?.id_usuario || '',
        comercio_categoria: '',
        codigo_postal: '',
        comercio_latitud: '',
        comercio_longitud: '',
        comercio_hora_inicial: '',
        comercio_hora_final: '',
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
    <div className="register-business-form" style={{ display: 'grid', gap: '1rem', maxWidth: '480px', margin: '0 auto', padding: '1rem' }}>
      <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.75rem', background: '#ffffffcc', padding: '1rem', borderRadius: '12px', boxShadow: '0 10px 20px rgba(0,0,0,0.08)' }}>
        <label>
          Nombre del negocio
          <input name="comercio_nombre" value={form.comercio_nombre} onChange={handleChange} placeholder="Ej: Café La Esquina" required style={{ width: '100%', padding: '0.75rem', marginTop: '0.25rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
          <small style={{ color: '#64748b', fontSize: '0.875rem' }}>Letras, números, guiones y puntos</small>
        </label>

        <label>
          ID dueño
          <input name="comercio_id_usuario" value={form.comercio_id_usuario} onChange={handleChange} placeholder="Tu ID" readOnly style={{ width: '100%', padding: '0.75rem', marginTop: '0.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#f1f5f9' }} />
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
          Código postal
          <input name="codigo_postal" value={form.codigo_postal} onChange={handleChange} placeholder="34000" maxLength="5" style={{ width: '100%', padding: '0.75rem', marginTop: '0.25rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
          <small style={{ color: '#64748b', fontSize: '0.875rem' }}>5 dígitos (opcional)</small>
        </label>

        <label>
          Latitud
          <input name="comercio_latitud" value={form.comercio_latitud} onChange={handleChange} placeholder="24.0279" required style={{ width: '100%', padding: '0.75rem', marginTop: '0.25rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
          <small style={{ color: '#64748b', fontSize: '0.875rem' }}>Entre -90 y 90</small>
        </label>

        <label>
          Longitud
          <input name="comercio_longitud" value={form.comercio_longitud} onChange={handleChange} placeholder="-104.6523" required style={{ width: '100%', padding: '0.75rem', marginTop: '0.25rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
          <small style={{ color: '#64748b', fontSize: '0.875rem' }}>Entre -180 y 180</small>
        </label>

        <label>
          Hora de apertura
          <input name="comercio_hora_inicial" value={form.comercio_hora_inicial} onChange={handleChange} placeholder="08:00" style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
          <small style={{ color: '#64748b', fontSize: '0.875rem' }}>Formato HH:MM (ej: 08:00)</small>
        </label>

        <label>
          Hora de cierre
          <input name="comercio_hora_final" value={form.comercio_hora_final} onChange={handleChange} placeholder="22:00" style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
          <small style={{ color: '#64748b', fontSize: '0.875rem' }}>Formato HH:MM (ej: 22:00)</small>
        </label>

        {error && <div style={{ color: '#b91c1c', fontWeight: 600 }}>{error}</div>}

        <button type="submit" disabled={loading} style={{ padding: '0.9rem', background: '#00529b', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
          {loading ? 'Registrando...' : 'Registrar negocio'}
        </button>
      </form>

      <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '12px', color: '#475569' }}>
        <p style={{ margin: 0, fontWeight: 600 }}>Ubicación en el mapa</p>
        <p style={{ margin: '0.5rem 0 0', fontSize: '0.875rem' }}>Ingresa la latitud y longitud de tu negocio. Puedes usar Google Maps para encontrarlo.</p>
      </div>
    </div>
  )
}
