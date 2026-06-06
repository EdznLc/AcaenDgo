# Backend AcaenDgo — API + Servidor de Archivos Estáticos

Backend Node.js + Express que:
- Sirve la **API REST** para login, registro y negocios
- Sirve el **frontend compilado** (en producción)
- Se conecta a MySQL `bd_acaendgo`

## ⚡ Instalación Rápida

```bash
cd backend
npm install
cp .env.example .env
# Ajusta DB_USER y DB_PASSWORD en .env si es necesario
```

## 🚀 Modo PRODUCCIÓN (recomendado)

Solo se necesita **UN comando** que compila el frontend y arranca el servidor:

```bash
npm start
```

Esto:
1. Compila el frontend React → carpeta `../dist/`
2. Arranca el backend en puerto **4000**
3. Sirve todo desde `http://localhost:4000`

**¡Listo!** Abre `http://localhost:4000` y ya está funcionando.

## 🔧 Modo DESARROLLO

Ideal si quieres ver cambios al momento:

**Terminal 1 — Frontend (hot-reload):**
```bash
cd ..  # Ir a raíz del proyecto
npm run dev
# Se abre en http://localhost:5173
```

**Terminal 2 — Backend:**
```bash
cd backend
npm run dev
# Corre en http://localhost:4000
```

## 📋 Endpoints de la API

### Obtener negocios (público)
```bash
GET /api/comercios
```
Devuelve todos los negocios (para mostrar en el mapa).

### Login de dueño
```bash
POST /api/auth/owner
Body: { "telefono": "8711234567", "contrsena": "secret123" }
```

### Registrar nuevo dueño
```bash
POST /api/auth/register-owner
Body: {
  "nombre": "Ana",
  "apellido_paterno": "Pérez",
  "apellido_materno": "González",
  "fecha_nacimiento": "1990-01-01",
  "genero": "F",
  "telefono": "8715550000",
  "contrsena": "secret123"
}
```

### Registrar nuevo negocio
```bash
POST /api/auth/register-commerce
Body: {
  "nombre": "La Nueva Tienda",
  "id_usuario": 1,
  "categoria": "cafe",
  "codigo_postal": "34000",
  "longitud": "-104.650",
  "latitud": "24.028",
  "hora_inicial": "08:00",
  "hora_final": "20:00"
}
```

## 🗄️ Base de Datos

El backend espera estas tablas en `bd_acaendgo`:

**dueños** (usuarios que registran negocios):
- `id_usuario` (INT PRIMARY KEY AUTO_INCREMENT)
- `nombre, apellido_paterno, apellido_materno` (VARCHAR)
- `fecha_nacimiento` (DATE)
- `genero` (CHAR)
- `telefono` (VARCHAR, único)
- `contrsena` (VARCHAR — guarda sin encriptar ⚠️)

**comercios** (negocios en el mapa):
- `id_comercio` (INT PRIMARY KEY AUTO_INCREMENT)
- `nombre` (VARCHAR)
- `id_usuario` (INT, referencia a dueños)
- `categoria` (VARCHAR)
- `codigo_postal` (VARCHAR)
- `latitud, longitud` (DECIMAL)
- `hora_inicial, hora_final` (TIME)

## ⚠️ Notas de Seguridad

**TODO (importante para producción):**
- [ ] Encriptar contraseñas con bcrypt
- [ ] Agregar validación en el backend
- [ ] Usar HTTPS en producción
- [ ] Agregar autenticación con JWT
- [ ] Rate limiting en endpoints
- [ ] Sanitizar inputs para prevenir SQL injection

## 🔍 Troubleshooting

**"Port 4000 already in use"**
```bash
# Busca el proceso y ciérralo
lsof -i :4000
kill -9 <PID>
```

**"Cannot find module 'mysql2'"**
```bash
npm install
```

**"Database connection failed"**
- Verifica que MySQL está corriendo
- Confirma credenciales en `.env`
- Asegúrate de que `bd_acaendgo` existe
