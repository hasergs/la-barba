# La Barba — Plan de proyecto y estado

## Goal
SPA mobile-first (Vite 8 + React 19 + TS 6 + Tailwind 4) que abre la cámara frontal,
detecta 478 landmarks faciales (MediaPipe FaceLandmarker), clasifica la forma del
rostro y proyecta en vivo (AR) las líneas y zonas a afeitar/perfilar para 5 estilos
de barba, con guía paso a paso. 100% on-device, PWA instalable, deploy en Vercel.

## 5 estilos
1. `full-beard` — Barba completa
2. `goatee-mustache` — Perilla y bigote
3. `chin-only` — Perilla sola
4. `italian-beard` — Barba italiana
5. `mustache-only` — Bigote solo

## Contratos congelados (solo PM)
- `src/contracts/types.ts` — tipos compartidos y `OverlayModel`/`BeardStyle`.
- `src/contracts/landmarks.ts` — índices `L`, `FACE_OVAL`, `JAW_CHAIN`, `CANONICAL_ANCHORS`.
- `src/contracts/access.ts` — `lm()`, `lmOr()`, `hasEnoughLandmarks()`.
- `src/lib/math.ts` — primitivas compartidas.
- Espacio canónico facial: `cx=0→234`, `cx=1→454`, `cy=0→10`, `cy=1→152`.

## Agentes y entrega
| Agente | Carpeta | Estado |
|---|---|---|
| A · Vision | `src/features/camera/`, `src/features/face/` | ✅ |
| B · Geometry | `src/features/geometry/`, `src/lib/geometry.ts` | ✅ |
| C · Beard | `src/features/beard/` | ✅ |
| D · Overlay | `src/features/overlay/` | ✅ |
| PM | `src/app/`, `src/store/`, contratos, QA, deploy | ✅ |

## Fases
- [x] F0 Scaffold + contratos → build OK
- [x] F1 Cámara + landmarks (A) → hooks + suavizado + calidad + frameStore
- [x] F2 Métricas + clasificador 7 formas (B)
- [x] F3 5 estilos + máscaras + matriz recomendación + guía (C)
- [x] F4 Overlay canvas + coords cover/espejo (D)
- [x] F5 Integración UI mobile-first + auto-recomendación (PM)
- [x] F6 QA → 90 tests verdes, typecheck limpio, PWA generada
- [x] F7 Deploy Vercel + repo GitHub

## Despliegue
- **Producción:** https://la-barba.vercel.app
- **Repositorio:** https://github.com/hasergs/la-barba
- Proyecto Vercel: `sgjaviis-projects/la-barba`
- Redeploy manual: `npx vercel deploy --prod`
- Auto-deploy en push: pendiente de conectar el repo desde el panel de Vercel
  (requiere instalar la GitHub App de Vercel en la cuenta).

## Verificación realizada
- `npm run typecheck` → sin errores (strict + noUncheckedIndexedAccess + erasableSyntaxOnly).
- `npm test` → **12 archivos / 90 tests** verdes.
- `npm run build` → OK; PWA `generateSW`, 14 entradas precacheadas; JS 129 KB gzip.
- Prueba real en Chromium (viewport 390×844) con stream de cámara sintético:
  modelo MediaPipe cargado, rostro detectado ("Alargado 53%"), overlay dibujado con
  zonas de barba/afeitado, etiquetas de líneas, selector de 5 estilos y guía.
- Selección de los 5 estilos verificada individualmente.

## Bug de integración encontrado y corregido (PM)
El `<video>` no existía al pulsar "Activar cámara" (la pantalla de permiso
sustituía la vista de cámara) → `getUserMedia` no encontraba el elemento. Se corrigió
manteniendo `CameraView` siempre montado y superponiendo `PermissionGate`.

## Riesgos residuales
- Deploy sin autenticar en Vercel (requiere acción del propietario).
- Verificación definitiva en móvil físico pendiente (iOS Safari + Android Chrome).
- `chaikinSmooth` no se usa dentro de `render.ts` para no acoplar agentes; los
  contornos se dibujan rectos (mejora posible: aplicar suavizado en `maskBuilder`).

---

## Incidente 1 — "No aparece ninguna línea ni detección" (corregido)

**Síntoma:** en producción la cámara abría y el vídeo se veía, pero no aparecía
ninguna línea ni la forma del rostro. Banner "Cargando modelo de rostro…" permanente.

**Evidencia recogida (Fase 1):**
- Cámara y `<video>`: OK (1280×720, `readyState 4`, sin pausa).
- Descarga de WASM y modelo: HTTP 200.
- Sin logs de MediaPipe en consola → el grafo nunca arrancaba.
- Service Worker: **refutado** como causa (mismo fallo sin SW y con cachés borradas).
- Prueba aislada en el origen de producción:
  - `createFromOptions({ delegate: 'GPU' })` → **14.861 ms** y frágil (llegó a tumbar el navegador).
  - `createFromOptions({ delegate: 'CPU' })` → **68 ms**.

**Causa raíz:** `useFaceLandmarker.ts` intentaba GPU primero y solo caía a CPU si la
promesa **rechazaba**. El delegate GPU no rechaza: **se cuelga**. Por tanto
`loadFaceLandmarker()` nunca resolvía y el modelo jamás quedaba listo.
En `localhost` había funcionado porque GPU resolvió rápido *esa vez*: bug
dependiente de tiempo/dispositivo (por eso pasaba en móvil y no en la prueba inicial).

**Corrección (un solo cambio, con test que falla primero):**
- `delegate: 'CPU'` por defecto (`DEFAULT_VISION_DELEGATE`), ~68 ms y estable.
- GPU opcional, acotado por `DEFAULT_GPU_TIMEOUT_MS = 6000`; si tarda o falla se
  descarta la instancia tardía (`close()`) y se continúa con CPU.
- Errores con mensaje claro y reintentables.
- Precalentado del modelo durante la pantalla de bienvenida (la descarga de ~10 MB
  ya no espera a que se conceda la cámara).
- Panel de **diagnóstico en vivo** (botón `?`): delegado, estado del modelo, frames,
  FPS, landmarks, calidad y error + conmutador CPU/GPU.

**Verificación:**
- Test de regresión `useFaceLandmarker.test.ts` (6 casos): antes 5 fallos y 21,5 s
  (se colgaba); ahora 6/6 en 1,5 s.
- Suite completa: **96 tests** verdes + typecheck estricto.
- E2E real (`npm run e2e`, Edge + cámara sintética, cuenta píxeles del overlay):
  - Antes: `"Buscando rostro…"`, 0 píxeles pintados, banner de carga eterno.
  - Después en producción: `"OK: detecta y dibuja"`, **327.790 píxeles pintados**,
    detección a los **3,6 s** (antes 24 s en frío).

---

## Incidente 2 — Las líneas no se ajustaban al rostro (corregido)

**Síntoma:** los puntos de la malla seguían la cara perfectamente, pero las líneas
de barba/perfilado quedaban descolocadas respecto al rostro real.

**Causa raíz:** la geometría NO se derivaba de la cara. `BeardStyle` guardaba
plantillas inventadas a mano en un "espacio canónico" y `createFaceProjector` las
proyectaba con una **transformación afín global** (escala por ancho de pómulos ×
alto frente-mentón). Al no usar la forma real (mandíbula, pómulos, comisuras), las
líneas no encajaban en ningún rostro concreto.

**Corrección:**
- `BeardStyle` pasa a ser **solo metadatos** (contrato simplificado).
- Nueva `createFaceFrame(landmarks)`: medidas y utilidades derivadas de los
  landmarks reales (`faceHeight`, `cheekWidth`, `jawWidth`, `mouthWidth`, `midlineX`).
- `buildOverlayModel` construye cada estilo con **recetas geométricas ancladas a
  índices reales** (óvalo facial, cadena mandibular, comisuras, pómulos, goniones,
  tragiones). Los lados se deciden comparando `x` con la línea media.
- Zona de barba tipo **"escudo"**: borde superior = líneas de mejilla, borde
  inferior = línea de cuello (antes era una franja fuera de la cara).
- Línea de cuello = **arco en U** que une los tragiones bajo el mentón (antes
  seguía la mandíbula y generaba una "V" profunda).
- Zona de afeitado = banda de 0,16H bajo la línea de cuello (antes 0,30–0,32H:
  parecía una flecha gigante).
- Fixture de tests con proporciones humanas reales (antes la cara era demasiado
  estrecha y falseaba la revisión visual).

**Verificación visual (banco determinista generado y revisado):** se generó un SVG
con los 5 estilos sobre una cara sintética, se detectaron y corrigieron los fallos
(V de barba, V de cuello, salto de polígono en la italiana) y se volvió a revisar.
Tests de alineación añadidos: la zona contiene la mandíbula, la línea de cuello es
una U simétrica y queda a <0,1H del mentón, las mejillas terminan en las comisuras,
la italiana tiene la línea más alta, la línea de mandíbula sigue `JAW_CHAIN`.

---

## Mejora — Modo afeitado (modo inmersivo)

Petición del usuario: poder ocultar los paneles (tipos de barba e información)
para verse la cara y seguir la guía mientras se afeita.

- Botón **"Modo afeitado"** en el panel inferior.
- Oculta selector de estilos, ficha de guía, barra superior y avisos neutros.
- Mantiene el overlay de líneas sobre la cara y añade:
  - botón discreto para volver a los paneles,
  - **chip del paso actual** (p. ej. "1 · Prepara piel y barba 1/5") que avanza al
    tocarlo, para seguir la guía sin ocupar la vista,
  - aviso de calidad solo si la detección se degrada.
- Verificado en el E2E: `panelsBefore=1`, `panelsAfter=0`, botón de salida presente,
  chip "Paso 1 de 5: Prepara piel y barba" y overlay aún pintando (212.682 px).
