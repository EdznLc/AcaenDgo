import express from 'express'
import pool from '../db.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT id_comercio, nombre, id_usuario, categoria, codigo_postal, longitud, latitud, hora_inicial, hora_final FROM `comercios`')
    res.json({ comercios: rows })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al obtener los comercios' })
  }
})

export default router
