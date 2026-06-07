import fs from 'fs'
import path from 'path'
import mysql from 'mysql2/promise'
import dotenv from 'dotenv'

dotenv.config()

async function load() {
  const sqlPath = path.join(process.cwd(), 'datos_prueba.sql')
  console.log(`Leyendo datos desde: ${sqlPath}`)
  const sql = fs.readFileSync(sqlPath, 'utf8')

  // Crear conexión temporal con multipleStatements: true
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'bd_acaendgo',
    multipleStatements: true
  })

  try {
    console.log('Limpiando registros de prueba previos en el rango de IDs 100 a 349...')
    
    // Desactivar foreign keys temporalmente para evitar restricciones durante la limpieza
    await connection.query('SET FOREIGN_KEY_CHECKS = 0')
    await connection.query('DELETE FROM `comercios` WHERE id_usuario >= 100 AND id_usuario <= 349')
    await connection.query('DELETE FROM `dueños` WHERE id_usuario >= 100 AND id_usuario <= 349')
    await connection.query('SET FOREIGN_KEY_CHECKS = 1')

    console.log('Insertando 250 dueños y 250 comercios...')
    await connection.query(sql)

    console.log('¡Felicidades! Los 250 dueños y 250 comercios se han insertado exitosamente en tu base de datos local `bd_acaendgo`.')
    await connection.end()
    process.exit(0)
  } catch (err) {
    console.error('Error al ejecutar el script de carga de base de datos:', err.message || err)
    // Asegurar que reactivamos las llaves foráneas en caso de fallo
    try {
      await connection.query('SET FOREIGN_KEY_CHECKS = 1')
      await connection.end()
    } catch (dbErr) {
      console.error('No se pudo cerrar la conexión:', dbErr)
    }
    process.exit(1)
  }
}

load()
