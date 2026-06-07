import React, { useState } from 'react'
import { genders } from '../data/options'
import ConversationalRegister from './ConversationalRegister'

const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.PROD ? '' : 'http://localhost:4000')

export default function LoginPage({ onLogin, initialAction = 'login', prefill = {}, currentSession = null }) {
  const [action, setAction] = useState(initialAction) // 'login' or 'register'
  const [manualRegister, setManualRegister] = useState(false)
  const [form, setForm] = useState({
    // owner fields only
    telefono: '',
    contrsena: '',
    nombre: '',
    apellido_paterno: '',
    apellido_materno: '',
    fecha_nacimiento: '',
    genero: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // Apply any prefill values when provided
  React.useEffect(() => {
    if (prefill && Object.keys(prefill).length > 0) {
      setForm((prev) => ({ ...prev, ...prefill }))
    }
  }, [prefill])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm({ ...form, [name]: value })
  }

  const validateForm = () => {
    if (action === 'login') {
      // Teléfono: 10 dígitos
      if (!/^\d{10}$/.test(form.telefono)) {
        setError('Teléfono debe tener 10 dígitos')
        return false
      }
      // Contraseña: mínimo 6 caracteres
      if (form.contrsena.length < 6) {
        setError('Contraseña debe tener al menos 6 caracteres')
        return false
      }
    } else {
      // Register
      // Nombre: solo letras y espacios
      if (!/^[a-záéíóúñ\s]+$/i.test(form.nombre)) {
        setError('Nombre solo puede contener letras')
        return false
      }
      if (!/^[a-záéíóúñ\s]+$/i.test(form.apellido_paterno)) {
        setError('Apellido paterno solo puede contener letras')
        return false
      }
      if (form.apellido_materno && !/^[a-záéíóúñ\s]+$/i.test(form.apellido_materno)) {
        setError('Apellido materno solo puede contener letras')
        return false
      }
      // Fecha nacimiento: no puede ser en el futuro y mínimo 18 años
      const today = new Date('2026-06-06') // Referencia de fecha actual: 6 de junio de 2026
      const birthDate = new Date(form.fecha_nacimiento)
      if (birthDate > today) {
        setError('Fecha de nacimiento no puede ser posterior al 6 de junio de 2026')
        return false
      }
      let age = today.getFullYear() - birthDate.getFullYear()
      const m = today.getMonth() - birthDate.getMonth()
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--
      }
      if (age < 18) {
        setError('Debes tener al menos 18 años (nacido el 6 de junio de 2008 o antes)')
        return false
      }
      // Género: debe estar seleccionado
      if (!form.genero) {
        setError('Debes seleccionar un género')
        return false
      }
      // Teléfono: 10 dígitos
      if (!/^\d{10}$/.test(form.telefono)) {
        setError('Teléfono debe tener 10 dígitos')
        return false
      }
      // Contraseña: mínimo 6 caracteres
      if (form.contrsena.length < 6) {
        setError('Contraseña debe tener al menos 6 caracteres')
        return false
      }
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
      let url
      let body

      if (action === 'login') {
        url = `${API_BASE}/api/auth/owner`
        body = { telefono: form.telefono, contrsena: form.contrsena }
      } else {
        // register owner
        url = `${API_BASE}/api/auth/register-owner`
        body = { nombre: form.nombre, apellido_paterno: form.apellido_paterno, apellido_materno: form.apellido_materno, fecha_nacimiento: form.fecha_nacimiento, genero: form.genero, telefono: form.telefono, contrsena: form.contrsena }
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      const data = await response.json()
      if (!response.ok) {
        setError(data.error || 'Error de autenticación')
        return
      }

      if (action === 'register') {
        // auto-login owner after register
        const loginRes = await fetch(`${API_BASE}/api/auth/owner`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ telefono: form.telefono, contrsena: form.contrsena })
        })
        const loginData = await loginRes.json()
        if (loginRes.ok) {
          onLogin({ type: 'owner', profile: loginData.owner })
        } else {
          setError('Registrado, pero no se pudo iniciar sesión automáticamente')
        }
      } else {
        onLogin({ type: 'owner', profile: data.owner })
      }
    } catch (err) {
      setError('No se pudo conectar con el servidor')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-page" style={{ display: 'grid', gap: '1rem', maxWidth: '480px', margin: '0 auto', padding: '1rem' }}>
      <div style={{ display: 'flex', gap: '0.5rem' }}>
        <button type="button" onClick={() => setAction('login')} style={{ padding: '0.5rem 0.75rem', background: action === 'login' ? '#0ea5a6' : '#e2e8f0', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Login</button>
        <button type="button" onClick={() => setAction('register')} style={{ padding: '0.5rem 0.75rem', background: action === 'register' ? '#f59e0b' : '#e2e8f0', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>Register</button>
      </div>

      {action === 'register' && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>Tipo de registro:</span>
          <button
            type="button"
            onClick={() => setManualRegister(!manualRegister)}
            style={{
              padding: '0.35rem 0.60rem',
              background: '#0284c7',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            {manualRegister ? '💬 Usar registro por Chat' : '📝 Usar formulario manual'}
          </button>
        </div>
      )}

      {action === 'register' && !manualRegister ? (
        <ConversationalRegister
          onRegisterSuccess={onLogin}
          onConversationalComplete={(data) => {
            // Prellenar el formulario de registro manual con los datos de la IA
            setForm((prev) => ({
              ...prev,
              nombre: data.nombre || '',
              apellido_paterno: data.apellido_paterno || '',
              apellido_materno: data.apellido_materno === 'No proporcionado' ? '' : (data.apellido_materno || ''),
              fecha_nacimiento: data.fecha_nacimiento || '',
              genero: data.genero || '',
              telefono: data.telefono || '',
              contrsena: data.contrsena || ''
            }))
            // Cambiar la vista a manual para que el usuario confirme
            setManualRegister(true)
          }}
        />
      ) : (
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.75rem', background: '#ffffffcc', padding: '1rem', borderRadius: '12px', boxShadow: '0 10px 20px rgba(0,0,0,0.08)' }}>
          {action === 'login' && (
            <>
              <label>
                Teléfono
                <input name="telefono" value={form.telefono} onChange={handleChange} placeholder="8711234567" maxLength="10" required style={{ width: '100%', padding: '0.75rem', marginTop: '0.25rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                <small style={{ color: '#64748b', fontSize: '0.875rem' }}>10 dígitos</small>
              </label>
              <label>
                Contraseña
                <input type="password" name="contrsena" value={form.contrsena} onChange={handleChange} placeholder="Mínimo 6 caracteres" required style={{ width: '100%', padding: '0.75rem', marginTop: '0.25rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </label>
            </>
          )}

          {action === 'register' && (
            <>
              <label>
                Nombre
                <input name="nombre" value={form.nombre} onChange={handleChange} placeholder="Nombre" required style={{ width: '100%', padding: '0.75rem', marginTop: '0.25rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </label>
              <label>
                Apellido paterno
                <input name="apellido_paterno" value={form.apellido_paterno} onChange={handleChange} placeholder="Apellido paterno" required style={{ width: '100%', padding: '0.75rem', marginTop: '0.25rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </label>
              <label>
                Apellido materno (opcional)
                <input name="apellido_materno" value={form.apellido_materno} onChange={handleChange} placeholder="Apellido materno" style={{ width: '100%', padding: '0.75rem', marginTop: '0.25rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </label>
              <label>
                Fecha de nacimiento
                <input type="date" name="fecha_nacimiento" value={form.fecha_nacimiento} onChange={handleChange} required style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                <small style={{ color: '#64748b', fontSize: '0.875rem' }}>Mínimo 18 años</small>
              </label>
              <label>
                Género
                <select name="genero" value={form.genero} onChange={handleChange} required style={{ width: '100%', padding: '0.6rem', marginTop: '0.25rem', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
                  <option value="">Selecciona...</option>
                  {genders.map((g) => (
                    <option key={g.value} value={g.value}>{g.label}</option>
                  ))}
                </select>
              </label>
              <label>
                Teléfono
                <input name="telefono" value={form.telefono} onChange={handleChange} placeholder="8711234567" maxLength="10" required style={{ width: '100%', padding: '0.75rem', marginTop: '0.25rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
                <small style={{ color: '#64748b', fontSize: '0.875rem' }}>10 dígitos</small>
              </label>
              <label>
                Contraseña
                <input type="password" name="contrsena" value={form.contrsena} onChange={handleChange} placeholder="Mínimo 6 caracteres" required style={{ width: '100%', padding: '0.75rem', marginTop: '0.25rem', borderRadius: '8px', border: '1px solid #cbd5e1' }} />
              </label>
            </>
          )}

          {error && <div style={{ color: '#b91c1c', fontWeight: 600 }}>{error}</div>}

          <button type="submit" disabled={loading} style={{ padding: '0.9rem', background: '#00529b', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>
            {loading ? 'Conectando...' : (action === 'register' ? 'Registrar' : 'Ingresar')}
          </button>
        </form>
      ) }

      <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: '12px', color: '#475569' }}>
        <p style={{ margin: 0, fontWeight: 600 }}>Acceso para dueños</p>
        <p style={{ margin: '0.5rem 0 0' }}>Inicia sesión o registrate para agregar y gestionar tus negocios.</p>
      </div>
    </div>
  )
}
