# � TuFlete

> **Pedí tu flete en minutos** - Plataforma web moderna para solicitar servicios de transporte y mudanzas.

[![Deploy Status](https://img.shields.io/badge/deploy-firebase-orange)](https://tuflete-7fe46.web.app/)
[![React](https://img.shields.io/badge/React-19.1-blue)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8)](https://tailwindcss.com/)

![TuFlete Preview](https://via.placeholder.com/800x400/3b82f6/ffffff?text=TuFlete+Preview)

---

## ✨ Características

- 🗺️ **Integración con Google Maps** - Selección intuitiva de origen y destino
- 📱 **Responsive Design** - Funciona perfectamente en móvil, tablet y desktop
- 🌓 **Modo Oscuro/Claro** - Cambia automáticamente según la preferencia del usuario
- ⚡ **Rendimiento Optimizado** - Carga rápida con Vite y lazy loading
- 🎨 **Animaciones Suaves** - Transiciones fluidas a 60fps con Tailwind CSS
- 📋 **Validación de Formularios** - Validaciones en tiempo real con feedback visual
- 🔔 **Notificaciones Toast** - Feedback instantáneo de acciones del usuario
- 🚀 **PWA Ready** - Instalable como app nativa
- 💬 **Integración WhatsApp** - Envío directo de solicitudes con toda la información

---

## 🚀 Tecnologías

- **Frontend**: [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
- **Bundler**: [Vite](https://vitejs.dev/) - Build tool ultra-rápido
- **Estilos**: [TailwindCSS](https://tailwindcss.com/) - Framework CSS utilitario
- **Mapas**: [Google Maps API](https://developers.google.com/maps) + [@react-google-maps/api](https://www.npmjs.com/package/@react-google-maps/api)
- **Fechas**: [React DatePicker](https://reactdatepicker.com/)
- **Deploy**: [Firebase Hosting](https://firebase.google.com/products/hosting)
- **CI/CD**: GitHub Actions

---

## 📦 Requisitos

- [Node.js](https://nodejs.org/) >= 20.19.0
- [npm](https://www.npmjs.com/) >= 9.0.0
- API Key de Google Maps ([obtener aquí](https://console.cloud.google.com/google/maps-apis/))

---

## ⚡ Instalación Rápida

```bash
# Clonar el repositorio
git clone https://github.com/gazzimon/tuflete.git
cd tuflete

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env
# Editar .env con tu API key de Google Maps

# Iniciar servidor de desarrollo
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

---

## 🔧 Configuración

### Variables de Entorno

Crear un archivo `.env` en la raíz del proyecto:

```env
# Google Maps API Key (REQUERIDO)
VITE_GOOGLE_MAPS_API_KEY=tu_api_key_aqui

# WhatsApp Business Number (opcional)
VITE_WHATSAPP_NUMBER=5493764876249

# Environment
VITE_NODE_ENV=development
```

### Google Maps API

1. Ve a [Google Cloud Console](https://console.cloud.google.com/)
2. Crea un proyecto o selecciona uno existente
3. Habilita las APIs: Maps JavaScript API, Places API, Directions API
4. Crea credenciales (API Key)
5. Configura restricciones de dominio para producción

---

## 🛠️ Scripts Disponibles

```bash
# Desarrollo
npm run dev              # Inicia servidor de desarrollo
npm run type-check       # Verificación de tipos TypeScript

# Build y Deploy
npm run build           # Build optimizado para producción
npm run preview         # Preview del build local
npm run deploy          # Deploy a Firebase

# Calidad de Código
npm run lint            # Verificar problemas de código
npm run lint:fix        # Corregir problemas automáticamente

# Utilidades
npm run clean           # Limpiar archivos temporales
```

---

## 📁 Estructura del Proyecto

```
tuflete/
├── src/
│   ├── components/          # Componentes reutilizables
│   │   ├── ThemeToggle.tsx
│   │   ├── LoadingSpinner.tsx
│   │   └── ToastContainer.tsx
│   ├── hooks/               # Custom hooks
│   │   ├── useGoogleMaps.ts
│   │   ├── useFormValidation.ts
│   │   └── useToast.ts
│   ├── App.tsx             # Componente principal
│   ├── main.tsx            # Entry point
│   └── index.css           # Estilos globales
├── public/
│   ├── images/             # Imágenes de vehículos
│   └── manifest.json       # PWA manifest
├── .env.example            # Variables de entorno ejemplo
├── tailwind.config.js      # Configuración Tailwind
├── vite.config.ts          # Configuración Vite
└── firebase.json           # Configuración Firebase
```

---

## 🎨 Personalización

### Colores del Tema

Los colores principales se pueden modificar en `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      primary: {
        500: '#3b82f6',  // Color principal
        600: '#2563eb',  // Color principal hover
        // ... más tonos
      },
    },
  },
}
```

### Tipos de Vehículos

Agregar nuevos vehículos en `src/App.tsx`:

```typescript
const VEHICLE_AVAILABLE: Record<VehicleKey, boolean> = {
  moto: false,
  camioneta: true,
  camion: false,
  // nuevo_vehiculo: true,
};
```

---

## 🚀 Deploy

### Firebase Hosting

```bash
# Instalar Firebase CLI
npm install -g firebase-tools

# Login a Firebase
firebase login

# Deploy
npm run deploy
```

### Otros Providers

- **Vercel**: `npm i -g vercel && vercel`
- **Netlify**: Conectar repo en netlify.com
- **GitHub Pages**: Configurar workflow en `.github/workflows/`

---

## 🔍 Optimizaciones Implementadas

### Performance
- ⚡ **Code Splitting** - Carga solo el código necesario
- 🖼️ **Lazy Loading** - Imágenes y componentes bajo demanda
- 📦 **Tree Shaking** - Elimina código no utilizado
- 🗜️ **Minificación** - Assets optimizados para producción

### UX/UI
- 🎯 **Validaciones en tiempo real** - Feedback inmediato
- 🔔 **Toast notifications** - Comunicación clara de estados
- 🌓 **Auto theme detection** - Respeta preferencias del sistema
- 📱 **Mobile-first design** - Optimizado para móviles

### Desarrollo
- 🔍 **TypeScript strict mode** - Máxima seguridad de tipos
- 🧹 **ESLint configurado** - Código consistente
- 🎣 **Custom hooks** - Lógica reutilizable
- 📝 **Componentes tipados** - Props con autocompletado

---

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/amazing-feature`)
3. Commit tus cambios (`git commit -m 'Add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

---

## 🆘 Soporte

- 📧 **Email**: soporte@tuflete.com
- 💬 **WhatsApp**: [+54 9 376 487-6249](https://wa.me/5493764876249)
- 🐛 **Issues**: [GitHub Issues](https://github.com/gazzimon/tuflete/issues)

---

<div align="center">

**⭐ Si te gustó el proyecto, dale una estrella en GitHub**

[Demo en Vivo](https://tuflete-7fe46.web.app/) • [Reportar Bug](https://github.com/gazzimon/tuflete/issues) • [Solicitar Feature](https://github.com/gazzimon/tuflete/issues)

</div>
