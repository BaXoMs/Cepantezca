# Cepantezca

> *Pantalla compartida.* Del náhuatl **cepan** (juntos, en conjunto) +
> **tezca(tl)** (espejo/pantalla).

Segundo monitor real (extensión de escritorio, no espejo) para tablets Android, iPads o navegadores web, sin necesidad de puerto HDMI/DP libre ni adaptadores físicos. Pensado originalmente para conectar una Samsung Galaxy Tab S9 FE a una laptop Linux con Intel Graphics / X11 vía WiFi o USB.

---

## 🏗️ Cómo funciona

1. **`host/setup_virtual_display.sh`** carga el módulo de kernel `vkms` (Virtual Kernel Mode Setting) y lo inyecta en tu sesión X real vía `xrandr --setprovideroutputsource`. Esto crea un output de video **real** que Cinnamon/Mutter/GNOME/XFCE trata igual que un monitor físico: podés extenderlo y arrastrar ventanas hacia él con normalidad.
2. **`host/server.py`** captura esa región específica del escritorio (con `mss`, rápido y liviano), sirve la aplicación web PWA en el puerto `8765`, y transmite los fotogramas por WebSocket (`/stream`) a la tablet. También escucha eventos de touch/mouse/teclado de la tablet (`/input`) y los inyecta en X11 con `xdotool`.
3. **`client/` (PWA Web)**: Aplicación web standalone instalable en la tablet que no requiere instalar nada en Android — incluye reconexión automática, gestos táctiles (clic, clic derecho con pulsación prolongada, scroll con 2 dedos) y soporte de teclado.
4. **`mobile/` (App Expo)**: App cliente nativa en React Native / Expo con guardado de computadoras, ping en vivo, modal de ajustes rápidos y soporte USB/WiFi.

---

## 📦 Estructura del Proyecto

```
Cepantezca/
├── client/                     # Cliente Web PWA (HTML5, Canvas, WebSockets, Service Worker)
│   ├── icons/                  # Iconos PWA (SVG 192x192 y 512x512)
│   ├── index.html              # Interfaz de conexión y stream
│   ├── manifest.json           # Manifest PWA standalone
│   └── sw.js                   # Service Worker para caché offline
├── host/                       # Servidor y utilidades para Linux
│   ├── cepantezca.desktop      # Lanzador de escritorio
│   ├── cepantezca.service      # Unidad de servicio systemd de usuario
│   ├── requirements.txt        # Dependencias de Python (FastAPI, uvicorn, mss, Pillow)
│   ├── run.sh                  # Script de inicio automatizado con túnel USB
│   ├── server.py               # Servidor FastAPI + WebSockets + xdotool
│   ├── setup_virtual_display.sh    # Configuración de display VKMS / xrandr
│   └── teardown_virtual_display.sh # Limpieza y apagado del display virtual
├── mobile/                     # Aplicación móvil React Native (Expo)
│   ├── assets/session-client.html  # Cliente embebido para WebView
│   ├── screens/DashboardScreen.tsx # Lista de hosts, pings, edición y guía
│   ├── screens/SessionScreen.tsx   # Visor de pantalla completa y controles
│   ├── storage.ts              # Persistencia con AsyncStorage y ping
│   └── package.json
├── DESIGN.md                   # Guía de diseño de interfaz Dark UI
├── SCREENS.md                  # Especificación detallada de pantallas
└── README.md
```

---

## 🚀 Instalación y Uso (Servidor Linux)

### 1. Dependencias del sistema (una sola vez)

```bash
sudo apt update
sudo apt install xdotool x11-xserver-utils adb -y
```

### 2. Iniciar el servidor

```bash
cd host
./run.sh
```

El script `./run.sh` se encarga de:
- Crear el entorno virtual `venv` e instalar las librerías necesarias.
- Cargar el módulo `vkms` y activar el monitor virtual en `xrandr`.
- Detectar si conectaste una tablet por USB y activar `adb reverse` automáticamente.
- Iniciar el servidor web y WebSockets en el puerto `8765`.
- Limpiar el display virtual automáticamente al presionar `Ctrl+C`.

---

## 📱 Conexión desde la Tablet

### Opción A: Vía Navegador Web / PWA (Recomendado sin instalar nada)

1. En tu tablet, abrí Google Chrome o cualquier navegador.
2. **Por WiFi**: Entrá a `http://<IP_DE_TU_LAPTOP>:8765`
3. **Por USB** (con Depuración USB activa y cable conectado): Entrá a `http://localhost:8765`
4. Tocá **"Instalar aplicación"** o **"Agregar a la pantalla principal"** en el menú de Chrome para usarla en pantalla completa sin barra de navegación.

### Opción B: Con la App Móvil (Expo)

```bash
cd mobile
npm install
npx expo start
```
Escaneá el código QR con **Expo Go** en tu tablet.

---

## ⌨️ Gestos y Atajos en Pantalla

- **1 Dedo (Tocar / Arrastrar)**: Clic izquierdo y movimiento del cursor.
- **Pulsación Prolongada (450ms)**: Clic secundario (clic derecho).
- **Desplazamiento con 2 Dedos**: Scroll vertical y horizontal (rueda del ratón).
- **Botón ⌨️**: Abre el teclado virtual y accesos rápidos (Enter, Tab, Esc, Ctrl+C, Ctrl+V, Super, Alt+Tab).
- **Botón ⚙️**: Selector dinámico de calidad JPEG (30% - 95%) y tasa de FPS (15 - 60 FPS).
- **Botón ⛶**: Activa pantalla completa inmersiva.

---

## 🖥️ Atajos del Sistema y Autostart

### Lanzador de Escritorio (.desktop)
Para lanzar Cepantezca desde el menú de aplicaciones o tu escritorio:
```bash
cp host/cepantezca.desktop ~/.local/share/applications/
```

### Servicio Systemd de Usuario (Autostart)
Para iniciar Cepantezca automáticamente con tu sesión de usuario:
```bash
mkdir -p ~/.config/systemd/user
cp host/cepantezca.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now cepantezca.service
```

---

## 🛠️ Estado del Proyecto

- [x] Output virtual real vía VKMS y xrandr
- [x] Detección automática del monitor principal en Linux
- [x] Streaming JPEG con FastAPI + WebSockets + MSS
- [x] Inyección completa de eventos touch, scroll, clic derecho y teclado vía `xdotool`
- [x] Detección y túnel automático por USB (`adb reverse`)
- [x] Reconexión automática exponencial ante cortes de red
- [x] Cliente Web PWA moderno y autónomo servido directamente por FastAPI
- [x] App móvil Expo con edición de conexiones, confirmación de borrado y pings de disponibilidad
- [x] Ajustes dinámicos de FPS y Calidad sin reiniciar sesión
- [x] Limpieza limpia con script de `teardown` y captura de señales
- [x] Lanzador `.desktop` y unidad de servicio `systemd`
