# Arquitectura del Sistema: Agente Personal de Finanzas

Este documento describe la arquitectura de software, infraestructura cloud, flujos de datos y diseño del **Agente Personal de Finanzas** (Telegram + IA + Dashboard Web + Cloud 24/7).

---

## 1. Visión General y Flujo de Datos

El sistema está diseñado para operar de forma 100% autónoma en la nube, 24 horas al día, 7 días a la semana, con costo mensual de **$0 USD** mediante el aprovechamiento óptimo de Free Tiers y una arquitectura serverless event-driven.

### 1.1 Flujo de Registro (Captura Conversacional)

```
[Usuario en Telegram (Teléfono)]
              │
              │  Mensaje natural: "Gasté 14 lucas almorzando"
              ▼
    [Telegram Bot API]
              │
              │  HTTPS POST Webhook (con X-Telegram-Bot-Api-Secret-Token)
              ▼
[Next.js Serverless Route: /api/telegram/webhook]
              │
              ├─► [1. Verificación de Seguridad] (ID usuario en Allowlist + Secret Token)
              ├─► [2. Idempotencia] (Verifica telegram_update_id en PostgreSQL; si ya existe, descarta)
              │
              ▼
[Pipeline de Procesamiento]
              │
              ├─► [3. Chilean NLP & Rules-First Engine]
              │        - Detección de patrones rápidos (montos en "lucas", "palo", fechas "ayer")
              │        - Mapeo de comercios/categorías aprendidas previamente
              │
              ├─► [4. AI Provider (Google Gemini Structured Output)]
              │        - Invocado cuando se requiere parsing semántico complejo o multi-transacción
              │        - Retorna JSON estricto validado con Zod (TransactionCandidate[])
              │
              ├─► [5. Confidence & Business Rules Engine]
              │        - Alta confianza (≥0.85): Registra directo en DB
              │        - Media confianza (0.60 - 0.84): Registra con confirmación explícita y botón Deshacer/Editar
              │        - Baja confianza (<0.60): Responde solicitando clarificación ("¿Cuánto gastaste?")
              │
              ▼
[Capa de Datos: PostgreSQL (Drizzle ORM)]
              │  Inserta transacciones con integridad referencial (ACID)
              │
              ▼
[Respuesta a Telegram]
              │  Envía confirmación visual formateada con botones inline (Deshacer, Editar)
              ▼
[Usuario en Telegram]
```

---

### 1.2 Flujo de Consulta Financiera (Preguntas Naturales)

```
[Usuario en Telegram] ──► "¿Cuánto llevo gastado este mes?"
              │
              ▼
[Webhook Handler]
              │
              ├─► [Clasificador de Intención] (Detecta INTENT = FINANCIAL_QUERY)
              │
              ├─► [Motor Determinístico de Consultas]
              │        - NUNCA delega el cálculo matemático al LLM.
              │        - Ejecuta consulta SQL exacta en PostgreSQL:
              │          `SELECT SUM(amount) FROM transactions WHERE date >= start_of_month ...`
              │        - Obtiene desglose exacto por categorías en CLP.
              │
              ├─► [Generador de Explicación (AI Provider)]
              │        - LLM recibe únicamente el resumen numérico ya calculado.
              │        - Genera una respuesta amigable, concisa y empática en español chileno.
              │
              ▼
[Respuesta a Telegram con cifras 100% exactas y auditadas]
```

---

### 1.3 Flujo del Dashboard Web

```
[Usuario en Navegador (Móvil / Escritorio)]
              │
              │  GET /login -> Validación de contraseña única
              ▼
[Sesión Segura vía Cookie HTTP-Only / JWT]
              │
              ▼
[Dashboard UI (Next.js 15 + React 19 + Tailwind CSS)]
              │
              ├─► Balance General, Ingresos vs Gastos del Mes
              ├─► Tasa de ahorro y comparativa vs mes anterior
              ├─► Gráficos analíticos (Evolución diaria, Distribución por categoría)
              ├─► Módulo de Movimientos: CRUD completo, búsqueda por texto, filtros por fecha y categoría
              ├─► Exportación de datos a formatos estándar: CSV y JSON (Portabilidad total)
              │
              ▼
[PostgreSQL Database]
```

---

## 2. Decisiones de Stack Tecnológico

| Capa | Tecnología Seleccionada | Justificación Principal |
| :--- | :--- | :--- |
| **Backend & Webhooks** | **Next.js 15 (App Router)** | Código unificado para API, webhooks y dashboard. Cold starts sub-300ms en serverless. |
| **Frontend** | **React 19 + Tailwind CSS** | Máximo rendimiento, responsivo para móvil y desktop, componentes visuales claros. |
| **Base de Datos** | **PostgreSQL (Supabase / Neon)** | Modelo relacional estricto, cálculos agregados nativos en SQL, sin vendor lock-in. |
| **ORM & Migraciones** | **Drizzle ORM** | Type-safe, ultra liviano, SQL-first, migraciones transparentes. |
| **Proveedor IA** | **Google Gemini (AI Studio)** | Free tier generoso (15 RPM, 1500 RPD), baja latencia, structured output nativo vía JSON Schema. |
| **Abstracción IA** | **`AIProvider` Interface** | Permite intercambiar Gemini por OpenAI, Anthropic, DeepSeek u Ollama sin tocar lógica de negocio. |
| **Hosting Cloud 24/7** | **Vercel (Hobby Tier)** | Despliegue continuo con Git, costo $0/mes, SSL automático, 24/7 sin hibernación. |
| **Autenticación** | **Session Cookie con JWT cifrado** | Máxima simplicidad y seguridad para single-user sin dependencias externas complejas. |

---

## 3. Principio de Cero Costo y Seguridad Financiera

1. **Free Tiers seleccionados:**
   - **Vercel Hobby:** 100,000 ejecuciones/día gratuitas (uso estimado: <100/día).
   - **Supabase / Neon Postgres:** 500 MB de almacenamiento relacional gratuito (suficiente para decenas de miles de transacciones).
   - **Google AI Studio (Gemini):** 1,500 solicitudes gratuitas al día (uso estimado: 10-30/día).
   - **Telegram Bot API:** 100% gratuita sin límites prácticos para uso personal.

2. **Cero riesgo de sobrecobro:**
   - Ninguno de los servicios seleccionados pasa automáticamente a facturación paga sin configuración explícita.
   - El sistema implementa un rate-limiter en memoria y validación estricta de remitentes para evitar loops de llamadas al LLM.

---

## 4. Estructura de Dominio y Datos

El modelo de datos relacional cubre desde el inicio:
- `accounts`: Cuentas de origen/destino (Efectivo, Cuenta Corriente, Tarjeta de Crédito, Cuenta RUT).
- `categories` & `subcategories`: Taxonomía personal configurable con iconos y colores.
- `merchants`: Comercios normalizados con reglas de auto-categorización (Rules First).
- `transactions`: Gastos, ingresos y transferencias, con soporte de moneda, fecha, medio de pago, tags, estado y candidato IA.
- `telegram_updates`: Registro de `update_id` para garantizar idempotencia estricta en webhooks.
- `budgets`: Presupuestos mensuales por categoría.
- `bank_statements` & `bank_statement_items`: Estructura base preparada para la conciliación de cartolas futuras (CSV/XLSX).
