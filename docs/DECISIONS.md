# Registro de Decisiones de Arquitectura (ADRs)

Este documento registra formalmente las decisiones técnicas fundamentales adoptadas para el **Agente Personal de Finanzas**, evaluando alternativas, justificaciones, riesgos y estrategias de mitigación/migración.

---

## ADR-001: Elección de Base de Datos — PostgreSQL Relacional vs NoSQL (Firestore / DynamoDB)

- **Decisión:** Utilizar **PostgreSQL** (con Drizzle ORM) alojado en Supabase o Neon.
- **Motivo:**
  1. Las transacciones financieras son por naturaleza fuertemente relacionales (cuentas, categorías, comercios, transferencias entre cuentas).
  2. Los cálculos financieros (sumas mensuales, promedios, agrupaciones por categoría, comparativas temporales) se ejecutan en microsegundos de manera nativa y determinística en SQL (`SUM()`, `GROUP BY`, `DATE_TRUNC()`).
  3. En bases NoSQL como Firestore, calcular el gasto mensual requiere leer todos los documentos del mes (consumiendo la cuota diaria de lecturas) o implementar contadores distribuidos propensos a inconsistencias.
  4. La futura conciliación de cartolas bancarias requiere joins relacionales y búsquedas por rangos indexados que SQL resuelve de forma trivial.
- **Alternativas Evaluadas:**
  - *Cloud Firestore:* Ventaja de integración nativa con Google Cloud, pero deficiente para analítica ad-hoc y agrega costo/complejidad en agregaciones.
  - *SQLite:* Excelente localmente, pero en despliegues serverless efímeros (como Vercel) no persiste sin volúmenes montados.
- **Trade-offs:** Requiere gestionar migraciones de esquema (gestionadas de forma limpia y tipada mediante Drizzle Kit).
- **Riesgos:** Límite de conexiones en serverless. *Mitigación:* Se utiliza pooling de conexiones (PgBouncer de Supabase o Neon pooler).
- **Estrategia de Migración:** Al ser PostgreSQL estándar, los datos pueden exportarse con `pg_dump` o scripts SQL/CSV y migrarse a cualquier proveedor (AWS RDS, GCP Cloud SQL, o Docker propio) sin modificar una sola línea de código.

---

## ADR-002: Backend y Hosting Cloud — Next.js Fullstack Serverless vs Python FastAPI Contenedorizado

- **Decisión:** Implementar la aplicación completa (API, Webhook de Telegram y Dashboard Web) en **Next.js 15 (Node.js/TypeScript)** desplegado en **Vercel** (con opción de empaquetado Docker para Cloud Run).
- **Motivo:**
  1. *Cero cold-start perceptible:* Las funciones serverless de Vercel inician en <200ms, respondiendo inmediatamente a los webhooks de Telegram (Telegram requiere respuesta HTTP 200 en <5s).
  2. *Costo Cero Real 24/7:* Vercel Hobby tier provee 100k invocaciones diarias gratuitas sin necesidad de tarjeta de crédito. Los contenedores en Render se suspenden tras 15 minutos (cold start de 50s que rompe webhooks), y Google Cloud Run exige cuenta de facturación/tarjeta activa para su uso.
  3. *Unificación de tipos y esquemas:* Los esquemas Zod (`TransactionCandidate`, filtros, formularios) se comparten de forma idéntica entre el parsing de IA, la API de Telegram y los componentes de React del Dashboard.
  4. *Un solo despliegue:* No se requiere orquestar dos servicios separados (backend API y frontend web).
- **Alternativas Evaluadas:**
  - *FastAPI en Cloud Run:* Excelente para Python puro, pero requiere tarjeta de crédito para activar facturación en Google Cloud y tiene 2-3s de cold start al escalar a cero.
  - *FastAPI en Render Free:* Inviable por hibernación de 50 segundos tras 15 minutos sin uso.
- **Riesgos:** Tiempo máximo de ejecución de serverless (15s en hobby tier). *Mitigación:* Todas las operaciones de parsing e inserción toman entre 300ms y 1.5s, muy por debajo del límite.
- **Estrategia de Migración:** El código de negocio está desacoplado en capas de servicio (`src/services/`, `src/lib/`). Si se requiere migrar a un backend separado en Express, Fastify o Python en el futuro, los controladores son funciones estándar fácilmente transportables.

---

## ADR-003: Proveedor de IA y Abstracción — Gemini API con Interfaz Desacoplada (`AIProvider`)

- **Decisión:** Emplear **Google Gemini 2.0 Flash / 1.5 Flash** mediante una interfaz abstracta `AIProvider`.
- **Motivo:**
  1. *Capacidad y Costo:* Google AI Studio ofrece un free tier sin costo de 15 peticiones por minuto y 1,500 peticiones diarias para modelos Flash, más que suficiente para un usuario personal (~30 peticiones/día).
  2. *Salida Estructurada Garantizada:* Soporte nativo para schemas JSON estrictos (`responseSchema`), evitando alucinaciones de formato.
  3. *Excelente compresión del español:* Entiende fluidamente modismos chilenos y lenguaje coloquial.
  4. *Baja Latencia:* Tiempos de inferencia entre 400ms y 900ms para extracción de entidades.
- **Alternativas Evaluadas:**
  - *OpenAI GPT-4o-mini:* Excelente calidad, pero no cuenta con free tier permanente (requiere prepago).
  - *Modelos Locales (Ollama / DeepSeek):* Requieren hardware encendido 24/7, violando el requisito de funcionamiento cloud sin PC prendido.
- **Trade-offs:** Dependencia de la API de Google AI Studio.
- **Estrategia de Mitigación / Migración:** Se implementa el patrón Repository/Adapter:
  ```typescript
  export interface AIProvider {
    parseTransactions(input: string, context: AIParserContext): Promise<ParsedTransactionCandidate[]>;
    explainFinancialQuery(query: string, summary: FinancialSummary): Promise<string>;
  }
  ```
  Si se desea cambiar a OpenAI, Anthropic o DeepSeek, solo se crea una nueva clase que implemente `AIProvider` y se actualiza una variable de entorno.

---

## ADR-004: Estrategia de Interpretación Financiera — "Rules First, AI Second" y Matemática Determinística

- **Decisión:** Separación estricta entre **interpretación semántica** (IA/Reglas) y **cálculos matemáticos** (SQL/Código determinístico).
- **Motivo:**
  1. Los modelos LLM son probabilísticos y jamás deben sumar, restar ni calcular saldos bancarios de memoria.
  2. Consultas fijas ("Starbucks = Café", números explícitos "10 lucas", comandos directos) pueden resolverse por expresiones regulares y reglas locales sin gastar cuota de IA ni añadir latencia.
  3. Para consultas analíticas ("¿Cuánto gasté este mes?"), el backend ejecuta la consulta SQL exacta y entrega únicamente las cifras agregadas al LLM para que este genere la redacción natural.
- **Riesgos:** Reglas demasiado rígidas para textos complejos. *Mitigación:* Si la regla local no alcanza alta confianza, se delega automáticamente al LLM.

---

## ADR-005: Seguridad y Control de Acceso en Telegram y Dashboard

- **Decisión:**
  - **Telegram:** Allowlist estricta de IDs numéricos de usuario (`TELEGRAM_ALLOWED_USER_IDS`) combinada con validación del header `X-Telegram-Bot-Api-Secret-Token` en el webhook. Mensajes de usuarios no autorizados son ignorados y no procesados.
  - **Dashboard:** Autenticación de usuario único basada en contraseña segura con hash y sesión cifrada en cookie HTTP-Only `SameSite=Lax`.
- **Motivo:**
  1. La aplicación es de uso estrictamente personal. Un sistema OAuth multi-inquilino agrega complejidad innecesaria.
  2. La validación del Secret Token de Telegram previene que atacantes externos simulen llamadas POST a nuestro webhook.
- **Riesgos:** Olvido de contraseña del dashboard. *Mitigación:* Se define en variables de entorno seguras (`.env`), facilitando su actualización por el dueño del sistema.

---

## ADR-006: Idempotencia en Webhooks de Telegram

- **Decisión:** Almacenar cada `update_id` de Telegram en la tabla `telegram_updates` con restricción de unicidad antes de ejecutar cualquier acción.
- **Motivo:** Telegram reintenta enviar webhooks si la conexión sufre microcortes o si la respuesta tarda más de lo previsto. Sin control de idempotencia, un gasto podría registrarse 2 o 3 veces.
- **Mitigación:** Si el `update_id` ya existe en la base de datos, el webhook responde de inmediato con `HTTP 200 OK` y omite el procesamiento.

---

## ADR-007: Integración y Despliegue Continuo (CI/CD)

- **Decisión:** Automatizar el flujo completo mediante **GitHub Actions** (pruebas unitarias, linting y typecheck) y despliegue automático a **Vercel**.
- **Flujo:** `git push origin main` -> GitHub Actions ejecuta `npm test` y `npm run build` -> Vercel despliega en producción en <60 segundos.
