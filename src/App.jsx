import React, { useState } from 'react'
import MapView from './components/MapView'
import LoginPage from './components/LoginPage'
import RegisterBusinessForm from './components/RegisterBusinessForm'

export default function App() {
  const [session, setSession] = useState(null)
  const [showLogin, setShowLogin] = useState(false)
  const [postAuthAction, setPostAuthAction] = useState(null) // e.g. 'addBusiness'
  const [showRegisterBusiness, setShowRegisterBusiness] = useState(false)

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
    // If logged in as owner, open register business modal
    setShowRegisterBusiness(true)
  }

  const handleLogin = (s) => {
    setSession(s)
    setShowLogin(false)
    if (postAuthAction === 'addBusiness') {
      if (s.type === 'owner') {
        // open register business modal
        setPostAuthAction(null)
        setShowRegisterBusiness(true)
      }
    }
  }

  const handleBusinessRegistered = () => {
    // Close modal after successful registration
    setShowRegisterBusiness(false)
    // TODO: Optionally refresh the map/comercios list
  }

  return (
    <div className="app-root" style={{ height: '100%' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', background: '#00529b', color: '#fff' }}>
        <h1 style={{ margin: 0, fontSize: '1rem' }}>AcaenDgo — Negocios de Durango</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {session && (
            <span style={{ marginRight: '0.5rem' }}><strong>{session.type === 'owner' ? 'Dueño:' : 'Comercio:'}</strong> {session.profile.nombre || session.profile.nombre}</span>
          )}
          {session?.type === 'owner' && (
            <button onClick={handleAddBusinessClick} style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: 'none', cursor: 'pointer', marginRight: '0.25rem' }}>Agregar negocio</button>
          )}
          {session ? (
            <button onClick={handleLogout} style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>Cerrar sesión</button>
          ) : (
            <button onClick={handleAddBusinessClick} style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', border: 'none', cursor: 'pointer' }}>Agregar negocio</button>
          )}
        </div>
      </header>

      <main style={{ height: 'calc(100% - 56px)' }}>
        <MapView session={session} />
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
          <div style={{ width: 'min(720px, 96%)', maxHeight: '90vh', overflow: 'auto', background: '#fff', borderRadius: '12px', padding: '1rem' }}>
            <button onClick={() => setShowRegisterBusiness(false)} style={{ float: 'right', border: 'none', background: 'transparent', fontSize: '1.1rem', cursor: 'pointer' }}>✕</button>
            <h3 style={{ marginTop: 0 }}>Registrar nuevo negocio</h3>
            <RegisterBusinessForm
              ownerProfile={session.profile}
              onSuccess={handleBusinessRegistered}
            />
          </div>
        </div>
      )}
    </div>
  )
}
