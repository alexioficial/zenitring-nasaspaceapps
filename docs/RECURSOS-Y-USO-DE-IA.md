# Recursos científicos y uso de inteligencia artificial en ZENIT

Equipo ZENIT · Documento de apoyo a la propuesta · 15 de noviembre de 2026

## Propósito y fundamento

ZENIT es una demostración de seguimiento de salud espacial orientada a ayudar al astronauta a comprender sus señales, aportar contexto y reconocer un siguiente paso. Este documento identifica los recursos científicos utilizados, su aplicación concreta y el papel de la inteligencia artificial dentro del producto y durante su desarrollo.

La propuesta combina información de NASA y la Agencia Espacial Canadiense con lecturas personales simuladas, escenarios educativos y archivos históricos separados. Las fuentes sustentan el contexto científico; la selección de reglas, escenarios y acciones educativas es una implementación del equipo. El prototipo no cuenta con validación clínica ni aval de esas agencias.

El proyecto se presenta en el contexto del reto [Health Monitoring Software de NASA Space Apps 2026](https://www.spaceappschallenge.org/2026/challenges/health-monitoring-software/?tab=details).

### Recursos de partida

Los siguientes cinco enlaces fueron aportados al proyecto como recursos del reto. Los estudios y archivos complementarios se identifican por separado para conservar su procedencia.

| Recurso | Aplicación en ZENIT |
| --- | --- |
| [NASA Five Hazards of Human Spaceflight](https://www.nasa.gov/hrp/hazards/) | Marco del entorno espacial: radiación, aislamiento, distancia de la Tierra, cambios de gravedad y ambientes cerrados u hostiles. Fundamenta la necesidad de monitorizar con contexto. |
| [NASA Risks of Human Spaceflight](https://www.nasa.gov/hrp/risks/) | Base del catálogo educativo de 17 temas. Cada ficha explica qué importa, qué no puede determinar la aplicación y un siguiente paso educativo. |
| [NASA Ongoing HRP Research](https://www.nasa.gov/hrp/ongoing-hrp-research/) | Conecta la propuesta con investigaciones activas del Human Research Program. Desde esta referencia se llegó al estudio ARCHeR. |
| [CSA Monitoring radiation for astronaut health](https://www.asc-csa.gc.ca/eng/news/articles/2026/2026-02-26-monitoring-radiation-astronaut-health.asp) | Contexto sobre monitorización de radiación y desarrollo de instrumentos. La imagen de David Saint-Jacques con detectores de burbujas conecta con Radi-N2; no implica que utilizara CANS. |
| [CSA Why do we conduct science experiments in space](https://www.asc-csa.gc.ca/eng/iss/science/why-do-we-conduct-science-experiments-in-space.asp) | Justifica investigar los cambios del cuerpo en el espacio y desarrollar medidas de protección. Apoya la motivación de la propuesta. |

El catálogo cubre sueño, circulación, nutrición, bienestar, actividad extravehicular, radiación, acondicionamiento físico, huesos, visión, inmunidad, equilibrio, descompresión, microorganismos, disponibilidad de oxígeno, trabajo en equipo, apoyo operativo y cargas dinámicas. Mostrar un tema relacionado con el contexto no equivale a detectar esa enfermedad ni calcular un riesgo individual.

## Investigación y procedencia de los datos

### Referencia sobre apoyo médico con IA

El registro [Artificial Intelligence Medical Support for Long-Duration Space Missions](https://ntrs.nasa.gov/citations/20240000754), de Lauren Marie Sanders y Ryan Thomas Scott, corresponde a un white paper publicado el 2 de febrero de 2024. Se consultó el resumen disponible en NASA NTRS; el registro no ofrece una descarga del documento.

Su propuesta de trabajo inicial incluye infraestructura de datos y modelos, flujos sintéticos, alteraciones conocidas y evaluación con respuestas esperadas. ZENIT toma esa idea como referencia para construir escenarios controlados y comprobar reglas de software. Esta relación es una inspiración metodológica parcial: no valida la investigación ni demuestra eficacia médica de una IA. Tampoco implementa su visión de aprendizaje continuo o computación a bordo. Es una referencia adicional, no una fuente confirmada de la lista Resources del reto.

### Investigaciones convertidas en simulaciones

**ARCHeR.** El estudio [Artemis Research for Crew Health and Readiness](https://www.nasa.gov/reference/archer/) inspira los temas de sueño, actividad y bienestar. El recorrido de ZENIT presenta tres días ficticios: observar registros, añadir contexto tras una noche más corta y realizar seguimiento. Las horas de sueño, la actividad y las respuestas son sintéticas; no proceden de mediciones de la tripulación Artemis. El anillo de la demostración no mide el sueño.

**Radi-N2.** El recurso de la [Agencia Espacial Canadiense sobre Radi-N2](https://www.asc-csa.gc.ca/eng/sciences/radi-n2.asp) describe el uso de ocho detectores de burbujas durante una semana y documenta la participación de David Saint-Jacques. ZENIT ilustra tres ubicaciones con recuentos ficticios y enseña a conservar instrumento, lugar y periodo. No reproduce las mediciones de David ni convierte burbujas en dosis, probabilidad de enfermedad o autorización de seguridad.

### Tipos de datos que muestra el producto

| Datos | Procedencia y tratamiento |
| --- | --- |
| Señales del anillo y del traje | Generadas por los simuladores de ZENIT para cuatro identidades ficticias. La transmisión, la persistencia y las confirmaciones son reales; las mediciones son simuladas. |
| Recorridos ARCHeR y Radi-N2 | Ejemplos sintéticos escritos para la demostración. Los pasos guiados y sus respuestas de práctica permanecen separados de los registros de la misión. |
| RadLab | 84 observaciones históricas de DosTel1 en ISS Columbus, del 1 al 2 de abril de 2022. Se conserva la procedencia y la tasa de dosis absorbida en μGy/h. Son datos ambientales históricos, no dosis personal ni condiciones actuales. |
| Apollo 11 | 42 observaciones seleccionadas y aproximadamente digitalizadas de una gráfica del informe de misión. Son una transcripción histórica, no telemetría cruda ni umbrales clínicos. |

RadLab se consulta desde **More → NASA resources**. Apollo está en **/archive**. Los recorridos se abren con **Start guided simulation** o **Explore a guided simulation** en My health. Sus fuentes históricas se enlazan al final de este documento.

## Uso de inteligencia artificial

### Gemini dentro del producto

Gemini redacta explicaciones breves en inglés sobre la evidencia presentada, la información que falta y el motivo del siguiente paso. Interviene en tres contextos: cambios en señales simuladas, educación sobre un tema de riesgo y pasos de las simulaciones guiadas.

El flujo es: evidencia simulada o tema seleccionado → validación del servidor → reglas y acción local → explicación opcional de Gemini. El detector y los siguientes pasos se calculan mediante reglas del programa. La respuesta del modelo no modifica esas reglas, los registros de salud ni los controles del traje.

| Contexto | Información suministrada al modelo |
| --- | --- |
| Señales simuladas | Observaciones calculadas, contexto confirmado mediante respuestas cerradas, siguiente paso y referencias seleccionadas. |
| Educación sobre riesgos | Tema elegido, información educativa y fuentes permitidas. Esta modalidad no proporciona lecturas personales. |
| Simulación guiada | Paso sintético reconstruido en el servidor, respuestas cerradas de práctica, acción prevista y referencias del escenario. |

Estas solicitudes no incluyen nombres de astronautas ni notas personales de texto libre. Las credenciales permanecen en el servidor. La implementación valida la estructura de la respuesta y sus identificadores de fuentes; esas comprobaciones no garantizan la exactitud médica de cada frase.

El modelo configurado por defecto en el código es **gemini-3.5-flash-lite**, modificable mediante GEMINI_MODEL. Se aporta contexto seleccionado en cada petición; no se entrenó ni ajustó un modelo clínico propio con datos de NASA.

Gemini requiere conexión al proveedor. Cuando la petición falla o vence su tiempo de espera, la interfaz conserva la explicación y la acción locales. En los escenarios guiados, declarar malestar o empeoramiento activa la orientación local de ayuda sin esperar al modelo. ZENIT no afirma que Gemini funcione a bordo sin internet ni que pueda diagnosticar o autorizar una actividad.

### IA durante la construcción del proyecto

**Codex.** Se utilizó como asistente de programación, revisión de código, elaboración y ejecución de pruebas, y redacción de documentación. Este apoyo forma parte del proceso de construcción del prototipo; no constituye una revisión clínica independiente.

**Generación visual.** La figura del astronauta de la interfaz se creó con una herramienta de generación de imágenes con IA. Es una representación ficticia, no una fotografía de un astronauta real ni un diseño de traje certificado. Su archivo de procedencia conserva el prompt y la fecha de creación; no identifica un modelo concreto.

**Transcripción histórica.** La digitalización aproximada de Apollo fue heredada del prototipo y está documentada como asistida por IA. Debe interpretarse con las limitaciones de una lectura de gráfica, sin presentarla como el conjunto original de telemetría.

## Referencias complementarias y trazabilidad

### Fuentes educativas utilizadas en las guías

- [NASA Fundamentals of Human Health](https://www.nasa.gov/reference/fundamentals-of-human-health/): contexto de actividad física, alimentación y cuidado de la salud.
- [NASA Human Research Roadmap sobre sueño y carga de trabajo](https://humanresearchroadmap.nasa.gov/Risks/risk.aspx?i=100) y [Behavioral Health Risk](https://www.nasa.gov/directorates/esdmd/hhp/behavioral-health-risk/): referencias de los registros de sueño, atención y bienestar.
- [NASA Medical Operations](https://www.nasa.gov/reference/6-0-medical-operations/): contexto de comunicación de preocupaciones y procedimientos de misión.
- [NASA Spacesuits sección 11](https://www.nasa.gov/reference/11-0-spacesuits-vol-2/): referencia para las variables del traje. Los valores y disparadores de ZENIT no son límites operativos certificados.

Las fichas específicas enlazadas por el catálogo y las explicaciones incluyen [sueño y horarios irregulares](https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/), [adaptaciones cardiovasculares](https://www.nasa.gov/reference/risk-of-cardiovascular-adaptations/), [alimentación y nutrición](https://www.nasa.gov/reference/risk-of-inadequate-food-and-nutrition/), [cambios conductuales](https://www.nasa.gov/reference/risk-of-behavioral-changes-and-psychiatric-disorders/) y [actividad extravehicular](https://www.nasa.gov/reference/risk-of-injury-and-compromised-performance-from-extravehicular-activity-eva/). Los demás temas remiten al catálogo general de riesgos de NASA.

### Archivos históricos y antecedentes

- [NASA OSDR RadLab Data API](https://visualization.osdr.nasa.gov/radlab/gui/data-api/): consulta y procedencia del archivo ambiental DosTel1. La aplicación conserva un respaldo local para cuando la consulta no responde.
- [Apollo 11 Mission Report](https://www.nasa.gov/wp-content/uploads/static/apollo50th/pdf/A11_MissionReport.pdf#page=268): figura 12-3(a), página 268 del PDF, sobre frecuencia cardíaca del comandante durante la actividad extravehicular; actividades de la tabla 12-II, página 265.
- Antecedentes conservados en la documentación: [NASA Exercise Overview](https://www.nasa.gov/ochmo-tb-031-exercise-overview-2/), [Behavioral Health Evidence Report](https://humanresearchroadmap.nasa.gov/evidence/reports/HRP-ER-BMED-HFBP-20250210.pdf#page=43) e [informe sobre entrada de agua en el traje](https://www.nasa.gov/wp-content/uploads/2023/07/suit_water_intrusion_mishap_investigation_report.pdf#page=39). Son contexto de investigación; no se presentan como fuentes enviadas automáticamente a Gemini.

### Comprobaciones realizadas y alcance

El proyecto cuenta con pruebas de reglas, transporte, persistencia, validación de solicitudes y respuestas, escenarios sintéticos y renderizado. También se comprobaron navegación y recorridos guiados en navegador. Las pruebas de integración de IA utilizan respuestas simuladas del proveedor; no constituyen una evaluación de precisión médica de Gemini.

Para evaluar utilidad clínica harían falta casos de referencia, revisión especializada y validación con datos e instrumentos adecuados. En su estado actual, ZENIT demuestra una experiencia educativa de monitorización y explicación con datos simulados.

La implementación puede revisarse en el [repositorio de ZENIT](https://github.com/alexioficial/zenitring-nasaspaceapps): catálogo y escenarios en src/lib/crew/health-learning.ts; integración de IA en src/lib/server/automatic-ai.ts y learning-ai.ts; RadLab en src/lib/nasa/; Apollo en src/lib/apollo.ts; procedencia visual en static/images/medbay-astronaut.webp.json.
