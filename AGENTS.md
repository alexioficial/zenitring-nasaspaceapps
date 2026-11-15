# Contexto de trabajo de ZENIT

Este archivo es la guía de entrada para agentes que trabajen en este repositorio.
Permite empezar con contexto sin volver a analizar todo el proyecto. Lee después
los archivos del área afectada y sus pruebas. Actualiza esta guía cuando cambien
la arquitectura, las rutas, los comandos o las decisiones de producto.

Análisis de referencia: **2026-11-15**, sobre el árbol de trabajo local, incluidos
cambios todavía sin commit. Las observaciones de verificación al final son una
fotografía de esa fecha, no una garantía del estado de futuras versiones.

## 1. Qué es el proyecto

ZENIT es una demostración de seguimiento de salud espacial para NASA Space Apps.
Su usuario principal es el astronauta que quiere entender sus señales, añadir
contexto, elegir un siguiente paso y registrar cómo se siente. Otro usuario revisa
la tripulación desde un monitor central.

- Las mediciones personales y del traje son **simuladas**. La comunicación entre
  dispositivos por WebSocket, la persistencia y las confirmaciones son reales.
- Hay cuatro identidades ficticias: `vega` (Alexi), `nova` (Rivier), `atlas` (Neil) y
  `lyra` (Buzz). Se definen en `src/lib/crew/model.ts`; el nombre visible se toma
  siempre de esa definición, también para registros SQLite anteriores. La interfaz
  muestra solo el nombre: los indicativos (VEGA, NOVA…) se retiraron por petición
  del usuario. Los IDs siguen en URLs y SQLite; no renombrarlos.
- Cada astronauta puede tener un anillo y un traje vinculados independientemente.
- NASA RadLab y Apollo son fuentes históricas separadas de la misión ficticia.
- Gemini puede explicar cambios detectados. El detector y los siguientes pasos
  siguen siendo locales y deterministas.
- No hay autenticación, integración con wearables comerciales, instalación PWA,
  validación clínica ni control de soporte vital. Los enlaces eligen una identidad
  de demostración; no conceden una cuenta privada. Usar datos ficticios y una red
  de demostración de confianza.
- Conversación y documentación interna pueden estar en español. La interfaz y
  las explicaciones del producto están en **inglés**, salvo petición del usuario.

## 2. Stack y comandos

Fuente de versiones: `package.json` y `bun.lock`. Al revisar: Bun 1.3.14,
Svelte 5, SvelteKit 2, TypeScript 5.9, Vite 7, Tailwind 4, adapter-node,
Three.js y `ws`. Se requiere Bun: `server/repository.ts` importa `bun:sqlite`.
No sustituir el runtime por Node ni crear otro lockfile por costumbre.

```sh
bun install --frozen-lockfile
bun run dev
bun run test
bun run check
bun run build
bun run start
```

| Comando | Función |
| --- | --- |
| `bun run dev` | Vite con Bun, `0.0.0.0:3000`, puerto estricto; incluye el hub. |
| `bun run test` | `bun test tests`: dominio, integración WebSocket y renderizado SSR. |
| `bun run check` | Genera tipos de SvelteKit y ejecuta `svelte-check`. |
| `bun run build` | Compila con Vite y adapter-node hacia `build/`. |
| `bun run start` | Ejecuta `server/start.ts`: HTTP de producción y hub juntos. |
| `bun run preview` | Vista previa Vite; **no inicia el hub de misión**. |
| `bun run format:check` | Comprueba formato con Prettier. |
| `bun run format` | Reformatea el repositorio; evitarlo para cambios pequeños. |

Detener el desarrollo antes de compilar: ambos escriben `.svelte-kit`.
No detener procesos ajenos para hacer una comprobación. Para cambios puntuales,
usar `bunx prettier --write <archivos>` y las pruebas pertinentes.
No hay un script `lint` ni configuración de CI versionada en el estado revisado.

## 3. Rutas y navegación vigentes

| Ruta | Responsabilidad |
| --- | --- |
| `/` | Landing de presentación en inglés; explica el proyecto y conserva el selector de identidad y vistas en `#choose-view`. |
| `/crew` | Monitor central: tripulación, detalles, historial y enlaces personales. |
| `/astronaut/[id]` | Espacio personal con identidad fija y validada en servidor. |
| `/ring?astronaut=vega` | Emisor de anillo, superficie de gestos y controles de simulación. |
| `/suit?astronaut=vega` | Emisor independiente de traje y capturas de sus lecturas. |
| `/research` | Seis escenarios sintéticos aislados y explicación opcional de Gemini. |
| `/archive` | Explorador histórico de Apollo 11. |
| `/health` | GET de disponibilidad HTTP: `{ status: 'ok' }`; no verifica todo el hub. |
| `/api/radlab` | GET de consulta histórica acotada, caché y respaldo incluido. |
| `/api/health-explanation` | POST al adaptador privado de Gemini. |
| `/api/mission-export` | GET del archivo completo; lo sirven Vite y el servidor personalizado. |
| `/ws` | Protocolo JSON WebSocket de misión; no es una ruta HTTP de SvelteKit. |

`src/routes/astronaut/[id]/+page.server.ts` rechaza IDs desconocidos con 404.
La primera visita sin `?view=` redirige a My devices antes de renderizar y guarda
`zenit-onboarded-<id>` durante un año. Un enlace con vista explícita la respeta;
las visitas posteriores sin vista abren My health. La cookie admite HTTP de LAN.

La navegación personal visible es **My health / My records / My devices**, más
el desplegable **More** (Signal details, NASA resources, Simulation settings y
Research scenarios). `src/lib/crew/workspace.ts` traduce los identificadores
internos y `MissionWorkspace.svelte` sincroniza la vista con `?view=`:

| Vista interna | Valor de `?view=` |
| --- | --- |
| `personal` | `health` (la URL canónica omite el parámetro) |
| `events` | `records` |
| `pair` | `devices` |
| `more` | `more` (esta UI no tiene página Tools: abre My health) |
| `overview` | `signals` |
| `lab` | `settings` |
| `nasa` | `nasa` |

Mantener recarga, Back/Forward, identidad y parámetros ajenos al cambiar de vista.
Los simuladores deben seguir abiertos para emitir: sus enlaces al monitor se
abren en otra pestaña. No convertir navegar a My health en cerrar el emisor.

## 4. Mapa del código

| Archivo o directorio | Qué contiene / cuándo consultarlo |
| --- | --- |
| `src/lib/crew/types.ts` | Contratos de métricas, estado y mensajes cliente/servidor. |
| `src/lib/crew/model.ts` | Tripulación, configuración, validadores, frescura, IDs y tiempo. |
| `src/lib/crew/simulation.ts` | Señales continuas por astronauta: normal, drift y excursion. |
| `src/lib/crew/connection.ts` | Transporte común, registro, heartbeat, reconexión y comandos pendientes. |
| `src/lib/crew/ring-client.ts` | Emisión del anillo, revisión de configuración y outbox de eventos. |
| `src/lib/crew/suit.ts` | Métricas/unidades del traje, simulación, validación y fuente primaria. |
| `src/lib/crew/suit-client.ts` | Muestreo local y outbox independiente del traje. |
| `src/lib/crew/gestures.ts` | Reconocedor puro de doble toque y swipe deliberado. |
| `server/hub.ts` | Autoridad del protocolo: registro, reservas, validación, permisos por rol, ACK y difusión. |
| `server/repository.ts` | SQLite WAL, transacciones y compatibilidad de registros antiguos. |
| `server/start.ts` | Handler compilado de SvelteKit, exportación y hub en un servidor HTTP. |
| `vite.config.ts` | Tailwind/SvelteKit y el mismo hub/exportación durante desarrollo. |
| `src/lib/crew/health.ts` | Check-ins, evidencia, guías educativas versionadas y seguimiento. |
| `src/lib/crew/automatic.ts` | Detector determinista y contexto de respuestas cerradas. |
| `src/lib/crew/health-insight.ts` | Presentación comprensible del resultado; no modifica la detección. |
| `src/lib/server/automatic-ai.ts` | Validación de entrada, recálculo y petición privada a Gemini. |
| `src/lib/server/gemini.ts` | Modelos por profundidad, JSON validado, timeout, caché acotada y consultas compartidas. |
| `src/lib/components/crew/EvidenceChart.svelte` | Comparaciones de datos locales con escala desde cero, valores accesibles y detalle seleccionable. |
| `src/lib/crew/research-scenarios.ts` | Fixtures sintéticos y resultados esperados de `/research`. |
| `src/lib/crew/workspace.ts` | URLs personales y onboarding. `personalRecords()` combina/filtra registros; ninguna vista lo usa ahora. |
| `src/routes/+page.svelte`, `src/lib/landing.css` | Landing para presentar ZENIT: propuesta, ejemplo interactivo ilustrativo sin persistencia ni IA, gestos, ciencia, alcance y acceso a la demo. CSS separado de los espacios de trabajo. |
| `src/lib/components/crew/MissionWorkspace.svelte` | Orquestación compartida del monitor central y personal, conexión, acciones y sincronización de `?view=`. |
| `src/lib/components/crew/PersonalHealth.svelte` | My health: figura conceptual, fases (bajo la figura), evaluación compacta, «Your readings» solo con lecturas y check-in oculto hasta «Record how I feel» (visible si hay check-ins guardados). |
| `src/lib/components/crew/AutomaticHealth.svelte` | Contexto de episodio, ayuda y ciclo de petición/cancelación de explicación. |
| `src/lib/components/crew/HealthCheckIn.svelte` | Borrador local, preview, guardado explícito y seguimiento confirmado. |
| Otros componentes de `crew/` | `AstronautFigure`, `EventCard`, `MissionSources`, `SuitSignal`, `VitalReadings`, `Trend`, `RadiationContext`, `SimulationSettings`, `ViewHeader`. |
| `src/lib/nasa/` | Parser RadLab y respuesta histórica con procedencia incluida. |
| `src/lib/three/ring-scene.ts` | Modelo procedural, render y liberación de recursos Three.js. |
| `src/lib/components/RingScene.svelte` | Carga solo en navegador, ciclo de vida y fallback estático. |
| `src/lib/apollo.ts` | 42 observaciones aproximadas digitalizadas y actividades Apollo. |
| Componentes fuera de `crew/` | Principalmente el prototipo y Apollo; `Icon` y `RingScene` también se comparten. |
| `static/fonts/`, `static/images/` | Fuentes locales, licencias y arte conceptual con JSON de procedencia. |

## 5. Flujo de datos y contratos que preservar

```text
RingClient / SuitClient -> MissionConnection -> /ws -> hub -> SQLite
                                                      |
                                state + ACK -> monitor central / astronauta
```

1. Los roles son `ring`, `spacesuit`, `monitor` y `astronaut`. Registro obligatorio
   antes de transmitir. El rol personal recibe solo su astronauta y sus eventos;
   el hub también valida el alcance de sus acciones. Esto no sustituye autenticación.
2. Una reserva por tipo de fuente y astronauta persiste tras desconexión y reinicio.
   Otro dispositivo no puede apropiársela estando offline. Solo el monitor central
   libera reservas y solo después de desconectar el emisor.
3. El anillo emite cada 3000 ms por defecto; su intervalo configurable es 1000–15000
   ms. La configuración guardada y la revisión realmente aplicada son cosas distintas.
   El traje tiene su propio intervalo de 3000 ms y muestrea localmente sin conexión.
4. Eventos y comandos tienen IDs estables. Reintentar no cambia evidencia ni tiempo
   original. Un ACK de evento se envía después de persistir; una repetición devuelve
   el recibo original y un ID reutilizado con contenido distinto se rechaza.
5. `measuredAt` / `occurredAt` pertenecen al emisor; `receivedAt` pertenece al servidor.
   Mantener ambos y las etiquetas de entrega tardía. El hub rechaza tiempos más de
   un minuto en el futuro. El monitor se referencia al reloj del servidor.
6. `freshness()` distingue offline, waiting, stale y live. Stale comienza tras
   `max(9000, intervalMs * 2.5)` sin muestra. Un socket vivo no implica lectura fresca.
   Conservar valores anteriores con su estado; nunca inventar muestras sustitutas.
7. `activeSource()` selecciona Ring en Cabin/Recovery y Suit ECG en Spacewalk.
   Si falta el traje durante Spacewalk no se sustituye por el anillo. Cambiar de
   fase registra historia, no crea telemetría. No unir trazas a través de huecos,
   cambios de dispositivo o de fase.
8. Doble toque captura un momento; swipe deliberado crea emergencia. No inferir
   síntomas del gesto. Los umbrales viven en `gestures.ts`: swipe horizontal ≥110 px,
   250–1600 ms, horizontal ≥2× vertical, cooldown 1200 ms. Mantener botones/teclado.
9. La emergencia pasa de `active` a `acknowledged` y después `resolved`, con nota
   obligatoria al resolver. Anotaciones y acciones se añaden como auditoría sin
   reescribir la captura. Un check-in no resuelve una emergencia.

### Persistencia

- SQLite: `data/zenit.sqlite`, configurable con `MISSION_DB_PATH`. Tablas `crew`
  (estado JSON), `events` (evidencia y auditoría JSON) y `commands` (deduplicación).
- Se conservan 120 muestras recientes por astronauta **y fuente**; eventos e historia
  de fases no se recortan con ese límite. La vista carga 200 eventos recientes más
  todas las emergencias sin resolver; `repository.events(-1)` exporta el archivo.
- Los datos antiguos se completan con traje vacío, Cabin e historial/check-ins
  vacíos. Mantener lectura compatible; no borrar SQLite para adaptar un cambio.
- `sessionStorage`: identidad de la pestaña (`zenit-ring-identity`,
  `zenit-suit-identity`). `localStorage`: outboxes por dispositivo y borradores
  `zenit-health-draft-<id>`. No son el transporte entre equipos.
- No sobrescribir un outbox corrupto; avisar cuando solo se retiene en memoria.
  Conservar identidad y pendientes antes de permitir cambiar de astronauta.
- `/legacy` y sus componentes/dominio/pruebas exclusivos se retiraron por petición
  del usuario. No borrar datos de navegador antiguos ni reintroducir esa ruta.

## 6. Salud, Gemini y NASA

### Salud y explicaciones

- My health incluye contexto educativo de riesgos NASA y catálogo de 17 temas.
  `health-learning.ts` selecciona relevancia sin calcular riesgo clínico; atribuye
  check-ins guardados por fecha, conserva ayuda pendiente y evita interpretar datos stale.
- `GuidedHealth.svelte`: ARCHeR y Radi-N2, accesibles desde inicio y My health con
  `?view=health&scenario=archer|radin2`. Pasos/respuestas viven en memoria, no escriben
  al hub; cambiar escenario reinicia práctica. La identidad y parámetros ajenos se
  preservan y navegar a otra vista elimina scenario. Unknown scenario abre My health.
- `SpaceHealthRisks.svelte` explica contexto; `LearningExplanation.svelte` ofrece
  Gemini opcional. `learning-ai.ts` valida IDs/respuestas cerradas y reconstruye
  evidencia sintética en servidor. Comparte origen, tamaño, cuota y timeout con
  `/api/health-explanation`; nombres y notas libres no se transmiten.
- La IA explica riesgos y el motivo del siguiente paso local (`actionReason`); no
  decide tratamientos ni reemplaza acciones. Una consulta de catálogo usa solo el
  tema y se etiqueta como general; práctica usa solo el paso sintético y respuestas.
- `evidenceNotes` enlaza cada explicación con una observación y fuente permitidas.
  `Explore the evidence` pide una explicación detallada en la misma pantalla.
  Las gráficas usan números locales (`amount` y `unit` en práctica), nunca datos
  generados por Gemini. ARCHeR muestra solo días alcanzados; Radi-N2 compara
  ubicaciones del mismo periodo, sin convertir burbujas a dosis.
- Radi-N2 muestra recuentos de burbujas inventados durante siete días, no medidas de
  David Saint-Jacques. No convertir a dosis ni mezclar con RadLab.


- Check-ins: activity/recovery, sleep/attention, wellbeing y food/hydration.
  Síntomas y contexto son explícitos; borradores y previews no se comparten hasta
  guardar. El servidor reconstruye evidencia y guía al confirmar el registro.
- Las guías persistidas tienen versión 1 o 2. No reinterpretar un informe antiguo
  usando lecturas nuevas. Pasos completados y better/same/worse/contacted persisten.
- El detector exige nueve muestras comparables de la fuente/fase actual en cinco
  minutos. Compara seis iniciales con tres recientes persistentes; filtra tiempos,
  dispositivos, duplicados y huecos. Son disparadores de demo, no límites clínicos.
- Ausencia de datos, desconexión y stale suprimen interpretación actual. Síntomas o
  alerta del traje tienen prioridad. Una preocupación declarada sigue visible
  durante pérdida de señal hasta registrar contacto. Pedir ayuda en pantalla no
  contacta a la tripulación ni envía por sí solo un evento de emergencia.
- `POST /api/health-explanation`: exige mismo Origin, JSON, máximo 48000 bytes y
  entrada validada de 9–120 muestras para telemetría, o IDs acotados para educación. Recalcula el detector antes de llamar al modelo.
- Credencial privada `GEMINI_API_KEY`; `GEMINI_MODEL` tiene como valor por defecto
  `gemini-3.8-flash`; `GEMINI_DETAIL_MODEL` usa `gemini-3.1-pro-preview` únicamente
  a petición del usuario. Nunca enviar claves al navegador.
  No enviar nombres ni notas libres: solo observaciones calculadas, respuesta
  cerrada y contexto NASA seleccionado. Timeout de servidor 25 s rápido / 55 s
  detallado (cliente 30 / 60 s), 4096 / 8192 tokens máximos y thinking low / medium.
  Límite global de 15 solicitudes/minuto por proceso. Caché de resultados validados
  de 5 minutos y 100 entradas; consultas idénticas simultáneas comparten llamada.
  No hay reintentos ni escalado de modelo automáticos. IDs de evidencia y fuentes
  se validan contra la petición; el cliente no elige nombres de modelos.
- La petición depende del episodio/contexto, no de cada muestra entrante. Conservar
  cancelación, asociación de respuesta con evidencia y fallback local. Gemini no
  cambia acciones, controla el traje, diagnostica ni concede autorización médica.
  La clave de consulta automática no depende del inicio de la ventana deslizante;
  conserva la hora de la evidencia explicada mientras las lecturas siguen entrando.

### Procedencia y unidades

- Anillo: pulse (bpm), HRV (ms), SpO₂ (%), respiración (/min), desviación de piel
  (°C). La desviación no es temperatura corporal central.
- Traje: pulso ECG, presión/O₂/CO₂ (kPa), temperatura del aire (°C), batería (%).
  O₂ atmosférico no es SpO₂; CO₂ no es una dosis inspirada. Los validadores usan
  límites amplios de entrada, no límites operativos certificados.
- RadLab: 84 observaciones históricas de DosTel1, ISS Columbus, desde
  `2022-04-01T23:00:00` hasta `2022-04-02T01:05:00` exclusivo. Conservar filas,
  orden, valores ausentes, URL de consulta y fecha de recuperación.
- Dosis absorbida en **μGy/h**. No convertirla a μSv/h, exposición personal,
  estado actual de la misión o diagnóstico. No inventar zona horaria de la fuente;
  el UTC añadido internamente sirve para espaciar la gráfica. Huecos >5 min abiertos.
- La consulta RadLab es fija, con timeout 8 s y fallback al JSON incluido. El API
  comparte consultas en curso; caché 5 min para éxito y 30 s para fallback.
- Apollo es una digitalización aproximada heredada del informe Apollo 11, no
  telemetría cruda ni referencia clínica. Mantener esa distinción y su atribución.

## 7. Interfaz y convenciones

- Svelte 5 con runes (`$props`, `$state`, `$derived`, `$effect`) y TypeScript estricto.
  Mantener lógica de dominio en módulos puros y límites de servidor en `server/`,
  `$lib/server/` o endpoints. APIs del navegador en `onMount`/efectos apropiados.
- Los clientes son clases mutables con `onChange`; los simuladores usan un contador
  `revision` para que Svelte vuelva a derivar su UI. No asumir reactividad automática
  de propiedades de una clase ni enviar proxies en lugar de snapshots de evidencia.
- Diseño vigente: **`DESIGN.md`** («Orbital medbay»): Manrope local, acento teal
  clínico, figura conceptual del astronauta en My health y detalles secundarios
  desplegables. El rediseño Taste/Geist del commit `8d49964` se revirtió en la UI
  (se conservó su lógica de navegación y onboarding); no reintroducirlo sin petición.
  Excepción pedida por el usuario: en My health, la evaluación (`AutomaticHealth`
  con `compact`), «Your readings», el check-in y el pie usan la estructura de `8d49964`
  con colores y fuente medbay (`src/lib/crew/my-health.css`). Cabecera, figura y fases
  siguen como medbay; My records y My devices no cambian. `/research` usa el modo
  no compacto de `AutomaticHealth`, con su diseño completo. La exportación personal
  está en More.
- `+layout.svelte` importa en este orden: `app.css`, `medbay.css`,
  `medbay-reference.css`, `insight.css`. Componentes importan además CSS de dominio
  (`crew`, `health`, `automatic`, `my-health`, etc.). Hay cascada heredada y selectores con alta
  especificidad: comprobar el alcance antes de editar globales. El espacio personal
  se estiliza con `.medbay-shell .astronaut-workspace` en `medbay-reference.css`.
- Conservar estado de foco, navegación accesible y objetivos táctiles de al menos
  44 px. Al cambiar de vista, el foco pasa al `h1` de la vista. Diferenciar estado
  con texto, además de color. Reducir movimiento según preferencias; no animar
  cifras ficticias.
- Three.js se importa dinámicamente desde `RingScene` después del montaje. Preservar
  fallback sin WebGL, cleanup de GPU/observers/listeners, pausa fuera de pantalla,
  respeto a reduced motion, máximo 30 fps y pixel ratio 1.5.
- Prettier: 2 espacios, comillas simples, trailing commas y ancho objetivo 100.
  Seguir patrones locales y evitar reformatear archivos ajenos al cambio.

## 8. Entorno y despliegue

- Variables: `MISSION_DB_PATH`, `HOST` (por defecto `0.0.0.0`), `PORT` (3000),
  `ORIGIN`, `PUBLIC_ORIGIN` opcional, `GEMINI_API_KEY`, `GEMINI_MODEL`, `GEMINI_DETAIL_MODEL`.
  `.env.example` también incluye variables del perfil opcional PostgreSQL y puertos.
  No copiar valores privados de `.env` a documentación, logs o commits.
- WS/WSS se deriva del origen de la página y usa `/ws` en el mismo puerto HTTP.
  En móviles usar la IP LAN del servidor; localhost apunta al propio móvil.
- Producción requiere `bun run start`, una réplica, SQLite persistente y proxy que
  reenvíe upgrades WebSocket. `ORIGIN` debe coincidir con el HTTPS público;
  `PUBLIC_ORIGIN` fija opcionalmente el origen permitido de navegadores para WS.
- `Dockerfile` tiene etapas de dependencias, desarrollo, validación/build y producción.
  Usa `oven/bun:1.3.14` y usuario `bun`. Compose producción expone internamente 3000
  y monta `mission_data` en `/app/data`; la configuración Coolify usa ese Compose.
- Desarrollo Docker: `docker compose -f docker-compose.yaml -f docker-compose.dev.yaml up --build -d`.
  El override publica 3000 en LAN y activa polling. PostgreSQL 17 es solo el perfil
  `database`; no participa en telemetría y no hay ORM ni migraciones PostgreSQL.
- Compose declara las tres variables Gemini. Configurar la clave en el entorno de
  despliegue; los modelos tienen los mismos valores predeterminados que el servidor.
- No borrar `data/`, reservas ni volúmenes. `docker compose down -v` destruye datos.
  No editar `build/`, `.svelte-kit/`, `node_modules/` ni perfiles de navegador como código.
- `.taste-skill/` son perfiles/reportes de revisión y está excluido del watcher de
  Vite para evitar recargas continuas. `jakiando/` es investigación histórica local
  ignorada por Git; `.superpowers/`, `.impeccable/`, `.codex/` y `docs/superpowers/`
  contienen auxiliares de trabajo locales, ignorados por Git (los commits
  anteriores todavía los contienen). No tratarlos como implementación activa ni
  dependencia, ni volver a versionarlos.

## 9. Pruebas y comprobaciones por área

| Área modificada | Pruebas de referencia |
| --- | --- |
| Protocolo, SQLite, permisos y reservas | `tests/hub.test.ts`, `tests/sources.test.ts`, `tests/health.test.ts` |
| Transporte/emisión y reintentos | `tests/ring-client.test.ts`, `tests/sources.test.ts` |
| Gestos, simulación y frescura | `tests/crew.test.ts` |
| Salud y evidencia | `tests/health.test.ts` |
| Detector y presentación comprensible | `tests/automatic.test.ts` |
| Validación y fallback Gemini | `tests/automatic-ai.test.ts`, `tests/learning-ai.test.ts`, `tests/gemini.test.ts` (proveedor simulado, caché y modelos) |
| Riesgos y escenarios guiados | `tests/health-learning.test.ts` |
| Navegación, onboarding y registros | `tests/personal-workspace.test.ts` |
| Renderizado de superficies y estados | `tests/suit-display.test.ts` |
| NASA | `tests/radlab.test.ts` |

Las pruebas de integración levantan servidores HTTP/WS reales con SQLite temporal
o en memoria. Las de UI usan compilación SSR de Svelte mediante plugins de Bun;
no sustituyen una prueba de interacción en navegador. No hay suite E2E de navegador
versionada. Para cambios visuales comprobar móvil, tablet y escritorio, foco,
navegación, datos ausentes, offline/stale y las fuentes independientes.

Antes de declarar un cambio funcional listo: pruebas relevantes, `bun run check`
y build cuando corresponda. Informar límites reales; no convertir errores de
entorno en cambios arbitrarios del código.

### Verificación de referencia del 2026-11-15

Tras revertir la UI de `8d49964` a la de `7dab20f` (conservando su lógica):

- `bun run test`: **91 pass, 0 fail**, 11 archivos y 379 aserciones. Las pruebas
  de la UI revertida (`astronaut-surfaces` y casos nuevos de `suit-display`) se
  retiraron con ella. El error SQLite de la prueba de almacenamiento transitorio
  es esperado; esa prueba también pasa.
- `bun run check`: **0 errores, 0 warnings**, con `three` y `@types/three` instalados.
  Si reaparecen errores de `three`, verificar `bun install --frozen-lockfile`
  antes de alterar imports o tipos.
- Con `core.autocrlf=true`, `prettier --check` avisa por CRLF en archivos
  recién extraídos; `--end-of-line crlf` confirma el formato real.
- No se ejecutó build, navegador ni Docker en esta revisión.

## 10. Cómo retomar y mantener el contexto

1. Leer este archivo, `git status --short` y el código/pruebas del área solicitada.
   Preservar cambios locales y archivos nuevos del usuario. No restaurar ni limpiar
   el árbol para facilitar la tarea. No hace falta releer todo el repositorio.
2. Contrastar documentación con implementación. `PRODUCT.md` conserva decisiones
   visuales anteriores; para diseño actual consultar `DESIGN.md` y las hojas
   `medbay*.css`. `/` es la landing con selector de vistas en `#choose-view`;
   `/crew` es el monitor. La explicación opcional de Gemini se presenta sin
   diagnóstico ni control de acciones.
3. Para detalle adicional consultar: `README.md` (operación), `docs/DEMO.md`
   (demostración), `docs/CHALLENGE-ALIGNMENT.md` (alcance del reto),
   `docs/MULTISOURCE-NASA.md` (fuentes/procedencia),
   `docs/AUTOMATIC-ASSESSMENT.md` (detector/Gemini), `DESIGN.md` (UI vigente),
   `docs/LEGACY.md` y `docs/LEGACY-DESIGN.md` (solo prototipo histórico).
4. Mantener este archivo como mapa práctico: actualizar hechos que cambien,
   separar observaciones fechadas de reglas permanentes y evitar acumular
   transcripciones de conversaciones, credenciales o listados de errores ya resueltos.
