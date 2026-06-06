# 🗺️ AcaenDgo — Plataforma de Negocios de Durango

Una página web para promocionar negocios de Durango usando un mapa interactivo.

## ✨ Características

- 🗺️ **Mapa interactivo** con todos los negocios
- 👤 **Sistema de login/registro** para dueños
- 🏪 **Registro de negocios** con ubicación en el mapa
- 📱 **Responsive** (funciona en PC y móvil)
- 🎨 **Iconos por categoría** (cafetería, salud, tienda, etc.)

## 🚀 Inicio Rápido (PRODUCCIÓN)

### Requisitos
- Node.js (v16+)
- MySQL con base de datos `bd_acaendgo` creada

### Instalación

1. **Clona o descarga el proyecto**
2. **Instala dependencias (frontend + backend):**
```bash
npm install
cd backend && npm install && cd ..
```

3. **Configura la base de datos (backend):**
```bash
cd backend
cp .env.example .env
# Edita .env con tus credenciales MySQL
```

4. **Compila y arranca (UN SOLO COMANDO):**
```bash
npm start
```

Eso es todo. Abre **http://localhost:4000** y ya está funcionando.

---

## 🔧 Desarrollo (dos terminales)

### Terminal 1 — Frontend (con hot-reload)
```bash
npm run dev
# Se abre en http://localhost:5173
```

### Terminal 2 — Backend
```bash
cd backend
npm run dev
# Corre en http://localhost:4000
```

---

## 📁 Estructura del Proyecto

```
AcaenDgo/
├── src/                          # Frontend React
│   ├── components/
│   │   ├── MapView.jsx          # Mapa interactivo
│   │   ├── LoginPage.jsx        # Login/registro de dueños
│   │   └── RegisterBusinessForm.jsx  # Registro de negocios
│   ├── data/
│   │   └── options.js           # Categorías, géneros (datos estáticos)
│   ├── App.jsx                  # Componente principal
│   ├── main.jsx                 # Punto de entrada
│   └── index.css                # Estilos
├── backend/                      # Node.js + Express
│   ├── routes/
│   │   ├── auth.js              # Login y registro
│   │   ├── comercios.js         # Obtener negocios
│   │   └── owners.js            # Obtener dueños
│   ├── server.js                # Servidor principal
│   ├── db.js                    # Conexión MySQL
│   ├── .env                     # Credenciales (crear desde .env.example)
│   └── README-backend.md        # Documentación del backend
├── package.json                 # Scripts del proyecto
├── vite.config.js               # Configuración Vite
└── README.md                    # Este archivo
```

---

## 🎯 Cómo Funciona

### 1. **Usuario ve el mapa (público)**
- Abre la página
- Ve todos los negocios en el mapa con emojis por categoría
- No necesita estar logueado

### 2. **Usuario quiere AGREGAR un negocio**
- Hace clic en "Agregar negocio"
- Si no está logueado → entra a login/registro como dueño
- Si está logueado como dueño → ve el formulario de nuevo negocio
- Completa datos: nombre, categoría, ubicación (lat/lng), horarios
- Se guarda en la base de datos y aparece en el mapa

### 3. **Datos guardados en MySQL**
- Tabla `dueños`: usuarios que registran negocios
- Tabla `comercios`: negocios con ubicación, categoría, horarios

---

## 📊 Base de Datos

### Tabla `dueños` (usuarios)
```sql
CREATE TABLE dueños (
  id_usuario INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(100),
  apellido_paterno VARCHAR(100),
  apellido_materno VARCHAR(100),
  fecha_nacimiento DATE,
  genero CHAR(1),
  telefono VARCHAR(10) UNIQUE,
  contrsena VARCHAR(255)
);
```

### Tabla `comercios` (negocios)
```sql
CREATE TABLE comercios (
  id_comercio INT PRIMARY KEY AUTO_INCREMENT,
  nombre VARCHAR(100),
  id_usuario INT,
  categoria VARCHAR(50),
  codigo_postal VARCHAR(5),
  latitud DECIMAL(10,6),
  longitud DECIMAL(10,6),
  hora_inicial TIME,
  hora_final TIME,
  FOREIGN KEY(id_usuario) REFERENCES dueños(id_usuario)
);
```

---

## 🔐 Validaciones

### Frontend
- ✅ Teléfono: 10 dígitos
- ✅ Contraseña: mínimo 6 caracteres
- ✅ Nombres: solo letras
- ✅ Edad: mínimo 18 años
- ✅ Latitud: -90 a 90
- ✅ Longitud: -180 a 180
- ✅ Horas: formato HH:MM

---

## 🚨 Seguridad (TODO)

⚠️ **Mejoras pendientes para producción:**
- [ ] Encriptar contraseñas (bcrypt)
- [ ] Validación en el backend
- [ ] Autenticación JWT
- [ ] HTTPS
- [ ] Rate limiting
- [ ] Sanitización de inputs

---

## 🛠️ Scripts Útiles

```bash
# Producción (compila + arranca)
npm start

# Solo compilar frontend
npm run build

# Frontend en desarrollo
npm run dev

# Backend en desarrollo (desde la carpeta backend)
cd backend && npm run dev

# Previsualizar build (desde la carpeta backend)
npm run preview
```

---

## 🤝 Contribuciones

Para reportar bugs o sugerir features, abre un issue o contacta al equipo.

---

## 📝 Licencia

Proyecto para el gobierno de Durango.

---

## 📞 Soporte

Para más detalles sobre el backend, ver [backend/README-backend.md](backend/README-backend.md)
