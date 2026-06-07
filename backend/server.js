import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import ownersRoutes from './routes/owners.js'
import comerciosRoutes from './routes/comercios.js'
import authRoutes from './routes/auth.js'
import registroDuenosRoutes from './routes/registro_dueños.js'
import registroComerciosRoutes from './routes/registro_comercios.js'
import recomendacionesRoutes from './routes/recomendaciones.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.use(cors())
app.use(express.json())

// API routes
app.use('/api/owners', ownersRoutes)
app.use('/api/comercios', comerciosRoutes)
app.use('/api/auth', authRoutes)
app.use('/api/registro-duenos', registroDuenosRoutes)
app.use('/api/registro-comercios', registroComerciosRoutes)
app.use('/api/recomendaciones', recomendacionesRoutes)

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' })
})

// Serve static files from frontend build (production)
const frontendBuildPath = path.join(__dirname, '../dist')
app.use(express.static(frontendBuildPath))

// SPA fallback: redirect all non-API routes to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendBuildPath, 'index.html'))
})

app.listen(PORT, () => {
  console.log(`AcaenDgo backend listening on port ${PORT}`)
  console.log(`Frontend served from: ${frontendBuildPath}`)
})
