import express from 'express'
import { GoogleGenAI } from '@google/genai'
import pool from '../db.js'

const router = express.Router()

// Inicialización de Google Gen AI SDK usando la variable de entorno
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
const ai = new GoogleGenAI({ apiKey })

// Instrucciones del sistema para el asistente virtual
const SYSTEM_INSTRUCTION = `
Eres un asistente empático y amigable de la plataforma AcaenDgo. Tu objetivo es ayudar a los dueños de negocios a registrarse en el sistema de manera relajada y conversacional, como si estuvieran chateando por WhatsApp.

Debes solicitar exactamente estos 7 datos, UNO POR UNO (no pidas más de un dato a la vez para evitar abrumar al usuario):
1. Nombre
2. Apellido Paterno
3. Apellido Materno (si no tiene o no quiere darlo, escribe una cadena vacía "" o "No proporcionado")
4. Fecha de nacimiento (en formato YYYY-MM-DD. Valida que el usuario sea mayor de edad, es decir, al menos 18 años. Ten en cuenta que la fecha actual es 6 de junio de 2026. Por lo tanto, el usuario debe haber nacido el 6 de junio de 2008 o antes para tener 18 años. Cualquier persona nacida en 2007 o antes ya tiene 18 o 19 años de edad y es perfectamente elegible para registrarse. ¡Realiza esta validación con total precisión basándote en la fecha del 6 de junio de 2026!)
5. Género (debe ser M para Masculino, F para Femenino, o O para Otro)
6. Teléfono (debe ser un número de exactamente 10 dígitos)
7. Contraseña (debe ser de al menos 6 caracteres)

Reglas estrictas de comportamiento:
- Sé muy educado, servicial, cálido y habla con expresiones naturales del español de México de forma respetuosa.
- Valida de manera amigable cada respuesta. Por ejemplo:
  * Si el teléfono no tiene 10 dígitos, explícaselo amablemente y pídelo de nuevo.
  * Si la contraseña tiene menos de 6 caracteres, pídele una más larga por seguridad.
  * Si la fecha de nacimiento no cumple la mayoría de edad (18 años en base a la fecha actual del 6 de junio de 2026, es decir, haber nacido después del 6 de junio de 2008), explícaselo con tacto ya que es un requisito de ley.
- NUNCA menciones al usuario el formato JSON ni hables de variables técnicas de programación.
- Cuando hayas obtenido los 7 datos completos y válidos, agradécele al usuario de forma muy cálida e infórmale explícitamente que va a ser redirigido al formulario real de confirmación para que valide y guarde sus datos. Al final de tu respuesta, incluye OBLIGATORIAMENTE el siguiente objeto JSON estructurado exactamente en este formato (dentro de un bloque de código \`\`\`json):

\`\`\`json
{
  "status": "complete",
  "data": {
    "nombre": "[Nombre obtenido]",
    "apellido_paterno": "[Apellido Paterno obtenido]",
    "apellido_materno": "[Apellido Materno obtenido]",
    "fecha_nacimiento": "[YYYY-MM-DD]",
    "genero": "[M, F o O]",
    "telefono": "[10 dígitos]",
    "contrsena": "[Contraseña obtenida]"
  }
}
\`\`\`
`;

// Función auxiliar con reintento y modelos de respaldo en caso de alta demanda (Error 503)
async function generateContentWithRetry(contents) {
  const modelsToTry = ['gemini-3.5-flash', 'gemini-2.5-flash-lite', 'gemini-flash-latest', 'gemini-2.5-flash']
  let lastError = null

  for (const model of modelsToTry) {
    try {
      console.log(`Intentando llamada a Gemini con modelo: ${model}`)
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
    return res.status(400).json({ error: 'El historial de mensajes es obligatorio y debe ser un arreglo.' })
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

        // Limpiar el JSON del mensaje final para que no se muestre al usuario final
        let cleanMessage = textResponse
          .replace(/```json[\s\S]*?```/g, '')
          .replace(/\{[\s\S]*"status"[\s\S]*\}/g, '')
          .trim()

        if (!cleanMessage.toLowerCase().includes('redirig') && !cleanMessage.toLowerCase().includes('confirm')) {
          cleanMessage += '\n\nExcelente, he recopilado todos tus datos. En un momento serás redirigido al formulario real para que puedas confirmar los datos y finalizar tu registro.'
        } else if (!cleanMessage.toLowerCase().includes('formulario real')) {
          cleanMessage += '\n\nSerás redirigido al formulario real para confirmar tus datos.'
        }

        return res.json({
          status: 'complete',
          message: cleanMessage,
          data: parsed.data
        })

      } catch (dbErr) {
        console.error('Error al parsear el JSON:', dbErr)
        return res.status(500).json({ error: 'Error al procesar el registro.' })
      }
    }

    // Si la conversación sigue activa, devolvemos la respuesta conversacional normal
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
