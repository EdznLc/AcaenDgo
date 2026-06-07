import express from 'express'
import pool from '../db.js'

const router = express.Router()

// Login de dueño por teléfono y contraseña
router.post('/owner', async (req, res) => {
  try {
    const { telefono, contrsena } = req.body
    if (!telefono || !contrsena) {
      return res.status(400).json({ error: 'Teléfono y contraseña son requeridos' })
    }

    const [rows] = await pool.query('SELECT id_usuario, nombre, apellido_paterno, apellido_materno, telefono FROM `dueños` WHERE telefono = ? AND contrsena = ?', [telefono, contrsena])
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales de dueño inválidas' })
    }

    const owner = rows[0]
    res.json({ type: 'owner', owner })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al autenticar dueño' })
  }
})

// Login de comercio por id_comercio y código postal
router.post('/commerce', async (req, res) => {
  try {
    const { id_comercio, codigo_postal } = req.body
    if (!id_comercio || !codigo_postal) {
      return res.status(400).json({ error: 'ID de comercio y código postal son requeridos' })
    }

    const [rows] = await pool.query('SELECT id_comercio, nombre, id_usuario, categoria, codigo_postal, longitud, latitud FROM `comercios` WHERE id_comercio = ? AND codigo_postal = ?', [id_comercio, codigo_postal])
    if (rows.length === 0) {
      return res.status(401).json({ error: 'Credenciales de comercio inválidas' })
    }

    const commerce = rows[0]
    res.json({ type: 'commerce', commerce })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al autenticar comercio' })
  }
})

// Register owner
router.post('/register-owner', async (req, res) => {
  try {
    const { nombre, apellido_paterno, apellido_materno, fecha_nacimiento, genero, telefono, contrsena } = req.body
    if (!nombre || !apellido_paterno || !fecha_nacimiento || !telefono || !contrsena) {
      return res.status(400).json({ error: 'Faltan campos requeridos para registro de dueño' })
    }

    const [existing] = await pool.query('SELECT id_usuario FROM `dueños` WHERE telefono = ?', [telefono])
    if (existing.length > 0) return res.status(409).json({ error: 'Teléfono ya registrado' })

    const [result] = await pool.query(
      `INSERT INTO \`dueños\` (nombre, apellido_paterno, apellido_materno, fecha_nacimiento, genero, telefono, contrsena)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [nombre, apellido_paterno, apellido_materno || null, fecha_nacimiento, genero || null, telefono, contrsena]
    )

    res.status(201).json({ message: 'Dueño registrado', id_usuario: result.insertId })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al registrar dueño' })
  }
})

// Register commerce
router.post('/register-commerce', async (req, res) => {
  try {
    const { nombre, id_usuario, categoria, codigo_postal, longitud, latitud, hora_inicial, hora_final, descripcion } = req.body
    if (!nombre || !id_usuario || !longitud || !latitud) {
      return res.status(400).json({ error: 'Faltan campos requeridos para registro de comercio' })
    }

    const [owner] = await pool.query('SELECT id_usuario FROM `dueños` WHERE id_usuario = ?', [id_usuario])
    if (owner.length === 0) return res.status(404).json({ error: 'Dueño no encontrado' })

    // Limitar a un máximo de 5 negocios por dueño
    const [countRows] = await pool.query('SELECT COUNT(*) AS total FROM `comercios` WHERE id_usuario = ?', [id_usuario])
    const currentCount = countRows[0].total
    const MAX_LIMIT = 5
    if (currentCount >= MAX_LIMIT) {
      return res.status(403).json({ error: `Límite alcanzado: Cada dueño puede registrar un máximo de ${MAX_LIMIT} negocios.` })
    }

    const [result] = await pool.query(
      `INSERT INTO \`comercios\` (nombre, id_usuario, categoria, codigo_postal, longitud, latitud, hora_inicial, hora_final, descripcion)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [nombre, id_usuario, categoria || null, codigo_postal || null, longitud, latitud, hora_inicial || null, hora_final || null, descripcion || null]
    )

    res.status(201).json({ message: 'Comercio registrado', id_comercio: result.insertId })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al registrar comercio' })
  }
})

export default router

