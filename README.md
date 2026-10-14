# 💰 Agente Personal de Finanzas (24/7 Cloud)
### Telegram + IA + Dashboard Web + PostgreSQL

Sistema autónomo de gestión financiera personal diseñado con arquitectura **Serverless Event-Driven**, costo operativo de **$0 USD/mes** y funcionamiento continuo 24/7 sin depender de computadores encendidos.

---

## 🚀 Características Principales

- 🤖 **Bot Privado de Telegram:**
  - Captura conversacional en español chileno (*"Gasté 14 lucas en almuerzo"*, *"Ayer cargué 25 mil de bencina"*, *"Compré 38 lucas en el Líder"*).
  - Soporte de modismos monetarios: *lucas*, *mil*, *medio palo*, *palo*, puntos de miles (*$14.500*).
  - Múltiples transacciones en un solo mensaje.
  - Botón interactivo inline de **Deshacer (Undo)** inmediato en Telegram.
  - Preguntas y consultas financieras naturales con respuestas calculadas determinísticamente (*"¿Cuánto llevo gastado este mes?"*, *"¿En qué estoy gastando más?"*).
- 🧠 **Arquitectura de Inteligencia Artificial ("Rules First, AI Second"):**
  - Validación determinística de esquemas estructurados con Zod (`TransactionCandidate`).
  - La IA **nunca** calcula números ni saldos de memoria: SQL y código ejecutan las matemáticas exactas; la IA interpreta el lenguaje y redacta la respuesta natural.
  - Abstracción desacoplada `AIProvider` (Google Gemini 2.0 Flash / 1.5 Flash).
- 📊 **Dashboard Web Responsivo:**
  - Acceso privado y seguro con autenticación de sesión única.
  - KPIs financieros: Balance, Ahorro Neto, Tasa de Ahorro, Ingresos vs Gastos.
  - Desglose visual por categorías con barras de distribución porcentual.
  - Principales comercios por volumen de gasto.
  - Módulo completo de **Movimientos** con CRUD interactivo (Crear, Ver, Filtrar, Buscar, Eliminar).
  - Exportación total de datos en **CSV (compatible con Excel)** y **JSON** sin vendor lock-in.
- 🛡️ **Seguridad y Cero Fricción:**
  - Allowlist estricta de IDs de usuario en Telegram (`TELEGRAM_ALLOWED_USER_IDS`).
  - Validación de cabecera `X-Telegram-Bot-Api-Secret-Token` en webhooks.
  - Idempotencia estricta para evitar transacciones duplicadas por reintentos de red.
- ☁️ **Costo Cero ($0 USD/mes):**
  - Despliegue en **Vercel Hobby Tier** (100k peticiones/día gratuitas, 24/7).
  - Base de datos en **Supabase / Neon PostgreSQL** (500 MB gratuitos).
  - Inferencia en **Google AI Studio (Gemini)** (1,500 peticiones diarias gratuitas).

---

## 🛠️ Tecnologías Utilizadas

- **Framework Fullstack:** Next.js 14 / 15 (App Router, Server Actions, Route Handlers)
- **Lenguaje:** TypeScript (Strict mode)
- **Base de Datos & ORM:** PostgreSQL + Drizzle ORM
- **Estilos & UI:** Tailwind CSS + Lucide Icons
- **Validación:** Zod
- **Motor de Fechas & Zona Horaria:** date-fns + date-fns-tz (`America/Santiago`)
- **Testing:** Vitest (Suite de pruebas unitarias e integración)

---

## ⚙️ Puesta en Marcha Local

### 1. Clonar e Instalar Dependencias
```bash
git clone <url-del-repositorio>
cd "control-finanzas-personales"
npm install
```

### 2. Configurar Variables de Entorno
Copia `.env.example` como `.env` y completa los valores:
```bash
cp .env.example .env
```

Variables mínimas para desarrollo local:
```env
TELEGRAM_BOT_TOKEN="tu_token_de_botfather"
TELEGRAM_ALLOWED_USER_IDS="tu_id_de_telegram"
TELEGRAM_WEBHOOK_SECRET="un_secreto_aleatorio_32_caracteres"
GEMINI_API_KEY="tu_api_key_de_google_ai_studio"
DASHBOARD_PASSWORD="tu_clave_privada"
SESSION_SECRET="un_secreto_de_sesion_de_al_menos_32_caracteres"
```

### 3. Ejecutar Pruebas Autónomas
```bash
npm run test
```

### 4. Iniciar Servidor de Desarrollo
```bash
npm run dev
```
Abre [http://localhost:3000](http://localhost:3000) en tu navegador para ver el Dashboard.

---

## 🌐 Despliegue en Producción 24/7 (Costo $0)

### Paso 1: Crear Base de Datos PostgreSQL Gratuita
1. Entra a [Supabase.com](https://supabase.com/) o [Neon.tech](https://neon.tech/) y crea un proyecto gratuito.
2. Copia la URL de conexión (`DATABASE_URL`).

### Paso 2: Desplegar en Vercel
1. Sube tu código a GitHub.
2. En [Vercel.com](https://vercel.com/), crea un nuevo proyecto e importa el repositorio de GitHub.
3. Configura las variables de entorno en Vercel Settings -> Environment Variables.
4. Presiona **Deploy**. Vercel te entregará una URL pública HTTPS (ej. `https://mi-agente-finanzas.vercel.app`).

### Paso 3: Configurar el Webhook de Telegram
Ejecuta la siguiente llamada HTTPS para vincular tu bot con tu endpoint serverless:
```bash
curl -F "url=https://mi-agente-finanzas.vercel.app/api/telegram/webhook" \
     -F "secret_token=TU_TELEGRAM_WEBHOOK_SECRET" \
     https://api.telegram.org/bot<TU_TELEGRAM_BOT_TOKEN>/setWebhook
```

¡Listo! A partir de ese momento puedes apagar tu computador. Cada vez que le hables a tu bot de Telegram, procesará el mensaje en la nube, actualizará la base de datos y podrás ver tu dashboard desde cualquier teléfono o computador.

---

## 📁 Documentación de Arquitectura

- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md): Arquitectura detallada, flujos de datos y análisis de costo cero.
- [docs/DECISIONS.md](docs/DECISIONS.md): Registro Formal de Decisiones de Arquitectura (ADRs).
- [PROJECT_STATUS.md](PROJECT_STATUS.md): Estado de avance del proyecto por fases.
