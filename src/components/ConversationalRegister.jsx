import React, { useState, useEffect, useRef } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE || (import.meta.env.PROD ? '' : 'http://localhost:4000')

export default function ConversationalRegister({ onRegisterSuccess, onConversationalComplete }) {
  const [messages, setMessages] = useState([
    {
      role: 'model',
      content: '¡Hola! Qué gusto saludarte. Soy tu asistente de AcaenDgo. Te ayudaré a crear tu cuenta de dueño de negocio paso a paso de forma rápida y amigable. Para iniciar, ¿cuál es tu nombre?'
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [isComplete, setIsComplete] = useState(false)

  const chatEndRef = useRef(null)
  const inputRef = useRef(null)

  // Desplazar automáticamente hacia abajo cuando se añadan nuevos mensajes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  // Mantener el focus en el input
  useEffect(() => {
    if (!isComplete) {
      inputRef.current?.focus()
    }
  }, [loading, isComplete, messages])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!inputValue.trim() || loading || isComplete) return

    const userMessage = { role: 'user', content: inputValue.trim() }
    const updatedMessages = [...messages, userMessage]

    setMessages(updatedMessages)
    setInputValue('')
    setLoading(true)
    setErrorMsg('')

    // Mantener el foco en la caja de texto de forma continua tras el envío
    setTimeout(() => {
      inputRef.current?.focus()
    }, 50)

    try {
      const response = await fetch(`${API_BASE}/api/registro-duenos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updatedMessages }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al conectar con la IA')
      }

      if (data.status === 'complete') {
        // Registro exitoso completado por la IA
        setMessages((prev) => [...prev, { role: 'model', content: data.message }])
        setIsComplete(true)
        
        // Redirigir al formulario manual después de 4.5 segundos para que puedan leer el mensaje
        setTimeout(() => {
          onConversationalComplete(data.data)
        }, 4500)

      } else if (data.status === 'error') {
        // La IA o el backend detectaron un problema (ej: teléfono duplicado)
        setMessages((prev) => [...prev, { role: 'model', content: data.message }])
      } else {
        // Conversación sigue activa
        setMessages((prev) => [...prev, { role: 'model', content: data.message }])
      }

    } catch (err) {
      console.error(err)
      setErrorMsg('Tuvimos un problema de conexión. Intenta enviar tu mensaje de nuevo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '500px',
      background: '#efeae2', // Color de fondo típico de WhatsApp
      borderRadius: '12px',
      overflow: 'hidden',
      boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
      border: '1px solid #e2e8f0'
    }}>
      {/* Header del Chat */}
      <div style={{
        background: '#075e54', // Verde WhatsApp
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
          🤖
        </div>
        <div>
          <div style={{ fontWeight: 'bold', fontSize: '0.95rem' }}>Asistente AcaenDgo</div>
          <div style={{ fontSize: '0.75rem', opacity: 0.85 }}>En línea • Registro Inteligente</div>
        </div>
      </div>

      {/* Cuerpo del Chat (Mensajes) */}
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
          return (
            <div
              key={index}
              style={{
                alignSelf: isUser ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                background: isUser ? '#d9fdd3' : '#fff', // Colores de WhatsApp (verde claro para usuario, blanco para IA)
                color: '#303030',
                padding: '0.6rem 0.85rem',
                borderRadius: isUser ? '12px 0 12px 12px' : '0 12px 12px 12px',
                fontSize: '0.925rem',
                lineHeight: 1.4,
                boxShadow: '0 1px 2px rgba(0,0,0,0.15)',
                whiteSpace: 'pre-line',
                position: 'relative'
              }}
            >
              {msg.content}
            </div>
          )
        })}

        {/* Indicador de carga / Escribiendo */}
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
            <div className="typing-dots" style={{ display: 'flex', gap: '3px' }}>
              <span style={{ width: '4px', height: '4px', background: '#94a3b8', borderRadius: '50%', animation: 'bounce 1.4s infinite' }}></span>
              <span style={{ width: '4px', height: '4px', background: '#94a3b8', borderRadius: '50%', animation: 'bounce 1.4s infinite 0.2s' }}></span>
              <span style={{ width: '4px', height: '4px', background: '#94a3b8', borderRadius: '50%', animation: 'bounce 1.4s infinite 0.4s' }}></span>
            </div>
          </div>
        )}

        {/* Notificación de Éxito en Pantalla */}
        {isComplete && (
          <div style={{
            background: '#d1fae5',
            color: '#065f46',
            padding: '0.75rem',
            borderRadius: '8px',
            textAlign: 'center',
            fontSize: '0.875rem',
            fontWeight: 'bold',
            marginTop: '0.5rem',
            border: '1px solid #10b981',
            boxShadow: '0 4px 6px rgba(0,0,0,0.05)'
          }}>
            🎉 ¡Datos recopilados! Redirigiendo al formulario real para confirmar tus datos...
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

      {/* Formulario de Entrada */}
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
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            transition: 'background 0.2s'
          }}
        >
          ➤
        </button>
      </form>
    </div>
  )
}
