import React, { useState } from 'react'
import MapView from './components/MapView'
import LoginPage from './components/LoginPage'
import RegisterBusinessForm from './components/RegisterBusinessForm'
import ConversationalRegisterBusiness from './components/ConversationalRegisterBusiness'

export default function App() {
  const [session, setSession] = useState(null)
  const [showLogin, setShowLogin] = useState(false)
  const [postAuthAction, setPostAuthAction] = useState(null) // e.g. 'addBusiness'
  const [showRegisterBusiness, setShowRegisterBusiness] = useState(false)
  const [mapRefreshKey, setMapRefreshKey] = useState(0)
  const [manualBusinessRegister, setManualBusinessRegister] = useState(false)
  const [businessPrefill, setBusinessPrefill] = useState({})

  const handleLogout = () => {
    setSession(null)
  }

  const handleAddBusinessClick = () => {
    if (!session || session.type !== 'owner') {
      // require login as owner
      setPostAuthAction('addBusiness')
      setShowLogin(true)
      return
    }
    // Reset business register states
    setManualBusinessRegister(false)
    setBusinessPrefill({})
    // If logged in as owner, open register business modal
    setShowRegisterBusiness(true)
  }

  const handleLogin = (s) => {
    setSession(s)
    setShowLogin(false)
    if (postAuthAction === 'addBusiness') {
      if (s.type === 'owner') {
        // Reset states
        setManualBusinessRegister(false)
        setBusinessPrefill({})
        // open register business modal
        setPostAuthAction(null)
        setShowRegisterBusiness(true)
      }
    }
  }

  const handleBusinessRegistered = () => {
    // Close modal after successful registration
    setShowRegisterBusiness(false)
    setMapRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="app-root" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <header style={{
        height: '95px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '0 1.5rem',
        background: '#000000',
        borderBottom: '1px solid #1e293b',
        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <img
            src="/logo_cropped.png"
            alt="Logo Acá en Durango"
            style={{
              height: '65px',
              width: 'auto',
              objectFit: 'contain',
              display: 'block',
              userSelect: 'none'
            }}
          />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {session && (
            <span style={{ marginRight: '0.5rem', fontSize: '0.9rem', color: '#cbd5e1' }}>
              <strong>{session.type === 'owner' ? 'Dueño:' : 'Comercio:'}</strong> {session.profile.nombre}
            </span>
          )}
          {session?.type === 'owner' && (
            <button
              onClick={handleAddBusinessClick}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#fff',
                fontWeight: '600',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
              onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}
            >
              Agregar negocio
            </button>
          )}
          {session ? (
            <button
              onClick={handleLogout}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: '1px solid #475569',
                background: 'transparent',
                color: '#f1f5f9',
                fontWeight: '600',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                e.currentTarget.style.borderColor = '#94a3b8'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.borderColor = '#475569'
              }}
            >
              Cerrar sesión
            </button>
          ) : (
            <button
              onClick={handleAddBusinessClick}
              style={{
                padding: '0.5rem 1rem',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#fff',
                fontWeight: '600',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
              }}
              onMouseEnter={(e) => e.currentTarget.style.filter = 'brightness(1.1)'}
              onMouseLeave={(e) => e.currentTarget.style.filter = 'brightness(1)'}
            >
              Agregar negocio
            </button>
          )}
        </div>
      </header>

      <main style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
        <MapView mapRefreshKey={mapRefreshKey} session={session} />
      </main>

      {showLogin && (
        <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.4)', zIndex: 2000 }}>
          <div style={{ width: 'min(720px, 96%)', maxHeight: '90vh', overflow: 'auto', background: '#fff', borderRadius: '12px', padding: '1rem' }}>
            <button onClick={() => setShowLogin(false)} style={{ float: 'right', border: 'none', background: 'transparent', fontSize: '1.1rem', cursor: 'pointer' }}>✕</button>
            <LoginPage onLogin={handleLogin} />
          </div>
        </div>
      )}

      {showRegisterBusiness && session?.type === 'owner' && (
        <div style={{ position: 'fixed', inset: 0, display: 'grid', placeItems: 'center', background: 'rgba(0,0,0,0.4)', zIndex: 2000 }}>
          <div style={{ width: 'min(920px, 96%)', maxHeight: '95vh', overflow: 'auto', background: '#fff', borderRadius: '12px', padding: '1.5rem' }}>
            <button onClick={() => setShowRegisterBusiness(false)} style={{ float: 'right', border: 'none', background: 'transparent', fontSize: '1.25rem', cursor: 'pointer', fontWeight: 'bold' }}>✕</button>
            <h3 style={{ marginTop: 0, color: '#00529b' }}>Registrar nuevo negocio</h3>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.85rem', color: '#475569', fontWeight: 600 }}>Tipo de registro:</span>
              <button
                type="button"
                onClick={() => setManualBusinessRegister(!manualBusinessRegister)}
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
                {manualBusinessRegister ? '💬 Usar registro por Chat' : '📝 Usar formulario manual'}
              </button>
            </div>

            {manualBusinessRegister ? (
              <RegisterBusinessForm
                ownerProfile={session.profile}
                initialValues={businessPrefill}
                onSuccess={handleBusinessRegistered}
              />
            ) : (
              <ConversationalRegisterBusiness
                ownerProfile={session.profile}
                onConversationalComplete={(data) => {
                  setBusinessPrefill(data)
                  setManualBusinessRegister(true)
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
