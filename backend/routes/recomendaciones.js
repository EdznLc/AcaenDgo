import express from 'express'
import { GoogleGenAI } from '@google/genai'
import pool from '../db.js'

const router = express.Router()

// Inicialización de Google Gen AI SDK usando la variable de entorno
const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY
const ai = new GoogleGenAI({ apiKey })

router.post('/', async (req, res) => {
  const { messages } = req.body

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'El historial de mensajes es requerido.' })
  }

  try {
    // 1. Obtener hasta 150 comercios reales para alimentar la base de conocimientos de Gemini
    const [rows] = await pool.query('SELECT nombre, categoria, codigo_postal, descripcion FROM `comercios` LIMIT 150')
    
    const catLabels = {
      '1': 'Cafetería',
      '2': 'Panadería',
      '3': 'Restaurante',
      '4': 'Tienda',
      '5': 'Educación',
      '6': 'Servicios',
      '7': 'Otro'
    }

    const businessList = rows.map(r => {
      const catLabel = catLabels[r.categoria] || 'Otro'
      return `- Nombre: "${r.nombre}", Categoría: "${catLabel}", C.P.: "${r.codigo_postal}", Descripción: "${r.descripcion || 'Sin descripción'}"`
    }).join('\n')

    const SYSTEM_INSTRUCTION = `
Eres un guía local experto y amigable de la ciudad de Victoria de Durango, Durango, México. Tu objetivo es sugerir y recomendar lugares de interés, atracciones y todo tipo de negocios locales registrados en nuestra plataforma "AcaenDgo". Habla con un lenguaje cálido, entusiasta y norteño.

Aquí tienes la lista completa de comercios reales en Durango registrados en "AcaenDgo":

${businessList}

REGLAS DE RECOMENDACIÓN CRÍTICAS:
1. Analiza con cuidado qué está pidiendo el usuario. Si el usuario te pide una recomendación sobre un tema específico (por ejemplo: aprender matemáticas, regularización de materias, comprar pan, reparar un carro, servicios de plomería, estudiar inglés, etc.), debes buscar de manera meticulosa en la lista de comercios de arriba aquellos negocios que coincidan directamente (por ejemplo, escuelas en la categoría "Educación", panaderías en "Panadería", talleres en "Servicios", o cualquier negocio que tenga palabras relacionadas en su nombre o descripción como "matemáticas", "regularización", "aprender", etc.).
2. Si existe un comercio en la lista que satisfaga exactamente la necesidad del usuario, es OBLIGATORIO que lo recomiendes prioritariamente por su Nombre, Categoría y Descripción, explicándole que es un negocio real local registrado en nuestra plataforma.
3. Si el usuario te pide recomendaciones de turismo general (ej. Paseo del Viejo Oeste, la Catedral de Durango, el Teleférico, etc.), cuéntale datos interesantes del lugar y sugiérele negocios de nuestra lista (cafeterías, restaurantes, panaderías) para ir a desayunar, comer o pasar el rato cerca de esa zona.
`

    // Formatear historial para el SDK
    const contents = messages.map((m) => ({
      role: m.role === 'assistant' ? 'model' : m.role,
      parts: [{ text: m.content || m.text }],
    }))

    // Intentar llamadas a Gemini en cadena de fallback
    const modelsToTry = ['gemini-3.5-flash', 'gemini-2.5-flash-lite', 'gemini-flash-latest', 'gemini-2.5-flash']
    let response = null
    let lastError = null

    for (const model of modelsToTry) {
      try {
        console.log(`Intentando Gemini (Recomendador Turístico) con modelo: ${model}`)
        const resGen = await ai.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: SYSTEM_INSTRUCTION,
          },
        })
        response = resGen
        break
      } catch (err) {
        console.warn(`Error recomendador con ${model}:`, err.message || err)
        lastError = err

        if (err.status === 401) {
          throw err
        }

        if (err.status === 503 || err.status === 429) {
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      }
    }

    if (!response) {
      throw lastError
    }

    return res.json({ message: response.text })

  } catch (error) {
    console.error('Error en recomendador:', error)
    return res.status(500).json({ error: 'Error de comunicación con el servicio de Inteligencia Artificial.' })
  }
})

export default router
