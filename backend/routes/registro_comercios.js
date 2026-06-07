import express from 'express'
import { GoogleGenAI } from '@google/genai'

const router = express.Router()

// Inicialización de Google Gen AI SDK usando la variable de entorno
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
const ai = new GoogleGenAI({ apiKey })

// Instrucciones del sistema para el registro conversacional de negocios
const SYSTEM_INSTRUCTION = `
Eres un asistente empático y amigable de la plataforma AcaenDgo. Tu objetivo es ayudar a los dueños de negocios a registrar su comercio o establecimiento de manera relajada y conversacional, como si estuvieran chateando por WhatsApp.

Debes solicitar exactamente estos datos para el negocio, guiando al usuario paso a paso (no pidas más de un dato a la vez para evitar abrumar al usuario):
1. Nombre del negocio (Ej: "Pastelería Susy")
2. Categoría (Debes mapearlo internamente a uno de estos valores: 
   '1' para Cafetería
   '2' para Panadería
   '3' para Restaurante
   '4' para Tienda
   '5' para Educación
   '6' para Servicios
   '7' para Otro.
   Pregúntale de forma clara a qué se dedica el negocio y recomiéndale o selecciona la categoría adecuada).
3. Ubicación: Latitud, Longitud y Código Postal de 5 dígitos (Indícales que pueden usar el mapa interactivo a la derecha o presionar "Usar mi ubicación actual" para ubicar su negocio fácilmente. Si en el historial ves un mensaje del sistema como '[Ubicación seleccionada en el mapa: Latitud: ..., Longitud: ..., Código Postal: ...]', agradéceles, acéptalo de inmediato y continúa con el siguiente paso sin pedir coordenadas manualmente).
4. Hora de apertura (Formato HH:MM, por ejemplo 08:30)
5. Hora de cierre (Formato HH:MM, por ejemplo 21:00)
6. Descripción del negocio (Un breve texto que describa lo que ofrece el negocio, por ejemplo: "Café artesanal y repostería recién horneada").

Reglas estrictas de comportamiento:
- Sé muy educado, servicial y habla con expresiones cálidas.
- Pide los datos uno por uno.
- Valida los formatos de horas (HH:MM). Si el formato es incorrecto, pídelo de nuevo amablemente.
- NUNCA menciones al usuario el formato JSON ni hables de variables técnicas.
- Cuando tengas todos los datos completos y válidos, agradécele al usuario, infórmale explícitamente que va a ser redirigido al formulario real para confirmar y registrar su negocio. Al final de tu respuesta, incluye OBLIGATORIAMENTE el siguiente objeto JSON estructurado exactamente en este formato (dentro de un bloque de código \`\`\`json):

\`\`\`json
{
  "status": "complete",
  "data": {
    "nombre": "[Nombre del negocio]",
    "categoria": "[Código de categoría: 1-7]",
    "codigo_postal": "[5 dígitos]",
    "latitud": "[Latitud obtenido]",
    "longitud": "[Longitud obtenido]",
    "hora_inicial": "[HH:MM]",
    "hora_final": "[HH:MM]",
    "descripcion": "[Descripción del negocio]"
  }
}
\`\`\`
`

// Función auxiliar con reintento y modelos de respaldo en caso de alta demanda (Error 503)
async function generateContentWithRetry(contents) {
  const modelsToTry = ['gemini-3.5-flash', 'gemini-2.5-flash-lite', 'gemini-flash-latest', 'gemini-2.5-flash']
  let lastError = null

  for (const model of modelsToTry) {
    try {
      console.log(`Intentando llamada a Gemini (Comercios) con modelo: ${model}`)
      const response = await ai.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
        },
      })
      return response
    } catch (err) {
      console.warn(`Error con modelo ${model}: ${err.message || err}`)
      lastError = err

      // Si es un error de autenticación (401), lanzar de inmediato
      if (err.status === 401) {
        throw err
      }

      // Si es un error de alta demanda (503) o límite de cuota (429), esperar brevemente antes del fallback
      if (err.status === 503 || err.status === 429) {
        console.log('Servidor con alta demanda. Esperando 500ms antes de reintentar con el siguiente modelo...')
        await new Promise((resolve) => setTimeout(resolve, 500))
      }
    }
  }
  throw lastError
}

router.post('/', async (req, res) => {
  const { messages } = req.body

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'El historial de mensajes es obligatorio.' })
  }

  try {
    // Formatear el historial para el SDK de Google Gen AI
    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : m.role,
      parts: [{ text: m.content || m.text }],
    }))

    const response = await generateContentWithRetry(contents)
    const textResponse = response.text || ''

    // Detectar si la IA devolvió el JSON de confirmación de registro completo
    const jsonMatch = textResponse.match(/\{[\s\S]*"status"\s*:\s*"complete"[\s\S]*\}/)

    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0])

        // Limpiar el JSON del mensaje final
        let cleanMessage = textResponse
          .replace(/```json[\s\S]*?```/g, '')
          .replace(/\{[\s\S]*"status"[\s\S]*\}/g, '')
          .trim()

        if (!cleanMessage.toLowerCase().includes('redirig') && !cleanMessage.toLowerCase().includes('confirm')) {
          cleanMessage += '\n\nExcelente, he recopilado todos los datos de tu negocio. En un momento serás redirigido al formulario real para que puedas confirmar los datos y finalizar tu registro.'
        } else if (!cleanMessage.toLowerCase().includes('formulario real')) {
          cleanMessage += '\n\nSerás redirigido al formulario real para confirmar los datos del negocio.'
        }

        return res.json({
          status: 'complete',
          message: cleanMessage,
          data: parsed.data
        })

      } catch (err) {
        console.error('Error al parsear el JSON:', err)
        return res.status(500).json({ error: 'Error al procesar el registro conversacional.' })
      }
    }

    // Si la conversación sigue activa
    return res.json({
      status: 'active',
      message: textResponse,
    })

  } catch (apiErr) {
    console.error('Error en Gemini API:', apiErr)
    return res.status(500).json({ error: 'Error de comunicación con el servicio de Inteligencia Artificial.' })
  }
})

export default router
