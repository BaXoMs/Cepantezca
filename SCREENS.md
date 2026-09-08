# Cepantezca Mobile — Especificación de pantallas

Estado: **borrador para revisión** — esto documenta lo que ya existe en código
más lo que falta definir. Sirve de referencia antes de seguir agregando
funcionalidad nueva.

---

## Pantallas ya implementadas (código en `mobile/screens/`)

### 1. Dashboard (`DashboardScreen.tsx`)

**Propósito**: punto de entrada. Lista las computadoras guardadas y permite
agregar nuevas.

**Elementos**:
- Header: título "Cepantezca" + botón "+ Nueva conexión"
- Lista de tarjetas (una por host guardado), cada una muestra:
  - Nombre del host
  - Ícono + modo (📶 WiFi / 🔌 USB)
  - Dirección:puerto
  - Botón ✕ para eliminar esa conexión
- Estado vacío: mensaje invitando a agregar la primera conexión
- Modal "Nueva conexión":
  - Input: nombre
  - Selector: WiFi / USB (dos botones tipo toggle)
  - Input: IP (solo visible si modo = WiFi)
  - Input: puerto (default 8765)
  - Botones: Cancelar / Guardar

**Interacciones**:
- Tocar una tarjeta → conecta y navega a la pantalla de Sesión
- Tocar ✕ → borra esa conexión (sin confirmación todavía — **a definir**: ¿debería pedir confirmación?)
- Guardar → persiste en AsyncStorage, cierra el modal

**Falta definir/implementar**:
- [ ] Confirmación antes de borrar una conexión
- [ ] Editar una conexión existente (hoy solo se puede borrar y recrear)
- [ ] Indicador de "última vez conectado" visible en la tarjeta (el dato ya se guarda, no se muestra)
- [ ] Estado de "host disponible ahora" (ping/discovery) antes de tocar para conectar

### 2. Sesión (`SessionScreen.tsx`)

**Propósito**: pantalla principal de uso — muestra el escritorio remoto y
transmite el touch.

**Elementos**:
- WebView a pantalla completa, forzado en horizontal, con el stream
- Pill de estado (esquina superior izquierda): punto de color (verde/ámbar/rojo) + nombre del host
- Botón ✕ (esquina superior derecha): sale y vuelve al Dashboard
- Los controles (pill + botón ✕) se ocultan con toque largo sobre el botón ✕, y reaparecen con cualquier touch en pantalla

**Interacciones**:
- Touch/drag sobre el stream → se traduce a eventos mouse en el host
- ✕ → cierra la sesión, vuelve al Dashboard

**Falta definir/implementar**:
- [ ] Qué pasa si se corta la conexión a mitad de sesión (hoy: el pill se pone rojo, pero no hay reintento automático ni mensaje claro)
- [ ] Teclado: no hay forma de mandar texto/teclado desde la tablet todavía (el protocolo del host ya soporta `{"type": "key"}`, pero la UI no lo expone)
- [ ] Gestos multi-touch (¿pellizco para zoom? ¿dos dedos para scroll?) — hoy solo hay un puntero (simula un solo dedo = un clic)
- [ ] Botón de configuración dentro de la sesión (calidad/FPS) — mencionado en el README como pendiente, no implementado

---

## Pantallas mencionadas pero NO implementadas todavía

Estas surgieron en la conversación como necesidad pero no tienen ni mockup ni código:

### 3. Configuración / Settings (no existe)
Ideas sueltas hasta ahora, sin definir layout:
- Selector de calidad de stream (FPS, compresión JPEG)
- Ver/editar el host actual sin tener que borrar y recrear

### 4. Onboarding / primer uso (no existe)
No hay pantalla que explique, la primera vez que se abre la app, cómo
instalar y correr el host en la laptop (`host/run.sh`, requisitos, etc.)

---

## Preguntas abiertas antes de seguir

1. ¿Cuántas pantallas totales creemos que va a tener la v1? (¿Dashboard + Sesión alcanza, o Settings/Onboarding son necesarias para la primera versión usable?)
2. ¿El teclado en pantalla es necesario para tu caso de uso, o con mouse/touch alcanza?
3. ¿Confirmación al borrar una conexión guardada — sí o no?
4. ¿Vale la pena un splash/loading screen mientras conecta, o el pill de estado alcanza?
