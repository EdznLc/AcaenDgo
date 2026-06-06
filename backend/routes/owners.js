import express from 'express'
import pool from '../db.js'

const router = express.Router()

router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM `dueños`')
    res.json({ owners: rows })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Error al obtener los dueños' })
  }
})

export default router
