# Cepantezca

> *Pantalla compartida.* Del náhuatl **cepan** (juntos, en conjunto) +
> **tezca(tl)** (espejo/pantalla).

Segundo monitor real (extensión de escritorio, no espejo) para tablets Android, iPads o navegadores web, sin necesidad de puerto HDMI/DP libre ni adaptadores físicos. Pensado originalmente para conectar una tablet (ej. Samsung Galaxy Tab) a una laptop Linux con Intel Graphics / X11 vía WiFi o cable USB.

---

## 🏛️ Arquitectura del Sistema

```mermaid
flowchart TD
    subgraph Linux_Host["🖥️ Linux Host (X11)"]
        VKMS["Kernel Module: vkms<br/>(Virtual Kernel Mode Setting)"] -->|xrandr provider linkage| X11["Servidor X11 / Display Server<br/>(Crea output 'Virtual-1')"]
        X11 -->|Ventanas arrastradas al monitor virtual| VirtualScreen["Frame Buffer Virtual<br/>(ej. 2560x1600+1920+0)"]
        VirtualScreen -->|Captura de pantalla rápida| MSS["MSS Engine (mss.grab)"]
        MSS -->|Raw RGB to JPEG (Pillow)| FastAPI["FastAPI Server + WebSockets<br/>(:8765)"]
        FastAPI -->|Stream binario JPEG| WS_Stream["/stream (WebSocket)"]
        WS_Input["/input (WebSocket)"] -->|JSON eventos normalizados| InputHandler["Input Handler"]
        InputHandler -->|mousemove, click, scroll, key| Xdotool["xdotool"]
        Xdotool -->|Inyección de eventos| X11
    end

    subgraph Transport["🌐 Capa de Transporte"]
        WS_Stream -->|WiFi LAN o USB ADB Reverse| ClientConn
        ClientConn --> WS_Input
    end

    subgraph Client_Side["📱 Cliente Remoto"]
        ClientConn["Conexión WebSocket"]
        subgraph PWA["Opción A: PWA Web Client"]
            Canvas["HTML5 Canvas 2D"]
            TouchGestures["Gestos táctiles<br/>(Tap, Hold, 2-Finger Scroll)"]
        end
        subgraph Expo["Opción B: Mobile App"]
            ReactNative["React Native / Expo WebView"]
            Discovery["Dashboard + Ping + Multi-host"]
        end
    end
```

---

## 🏗️ Cómo funciona en detalle

1. **Virtual Display a nivel Kernel (DRM / VKMS)**:
   - `host/setup_virtual_display.sh` carga el módulo del kernel `vkms` (Virtual Kernel Mode Setting).
   - Mediante `xrandr --setprovideroutputsource`, vincula el proveedor virtual al proveedor de video principal de X11.
   - Crea una salida de video **real** (ej. `Virtual-1` o `writeback-1`) que tu entorno de escritorio (Cinnamon, GNOME, XFCE, KDE en sesión X11) reconoce como un monitor físico adicional. Podés extender tu escritorio hacia la izquierda, derecha, arriba o abajo y mover cualquier ventana hacia él.

2. **Pipeline de Video (Captura y Streaming)**:
   - `host/server.py` localiza las coordenadas absolutas (`width`, `height`, `left`, `top`) de la pantalla virtual consultando `xrandr --query`.
   - Utiliza `mss` para capturar exclusivamente esa región del framebuffer de forma eficiente y con mínimo consumo de CPU.
   - Codifica cada cuadro en JPEG con compresión y tasa de FPS ajustables en caliente (15 a 60 FPS, 30% a 95% de calidad).
   - Emite el flujo binario mediante WebSocket (`/stream`).

3. **Pipeline de Entrada e Inyección (Touch & Keyboard)**:
   - El cliente envía eventos táctiles, clicks, desplazamientos de rueda y pulsaciones de teclas por WebSocket (`/input`) con coordenadas normalizadas entre `0.0` y `1.0`.
   - El servidor escala esas coordenadas a la geometría absoluta del monitor virtual y las inyecta en el servidor gráfico mediante `xdotool`.

4. **Clientes**:
   - **`client/` (PWA Web)**: Cliente liviano servido directamente por FastAPI. No requiere instalar ninguna aplicación en el dispositivo receptor. Soporta pantalla completa inmersiva, gestos multitáctiles y teclado virtual.
   - **`mobile/` (React Native / Expo)**: Aplicación nativa con almacenamiento de múltiples computadoras anfitrionas, monitoreo de latencia/ping en vivo y selector de resolución.

---

## 📦 Estructura del Repositorio

```
Cepantezca/
├── client/                         # Cliente Web PWA
│   ├── icons/                      # Iconos PWA (SVG 192x192 y 512x512)
│   ├── index.html                  # Interfaz completa de conexión, visor Canvas y controles
│   ├── manifest.json               # Manifiesto para instalación PWA standalone
│   └── sw.js                       # Service Worker para caché offline
├── host/                           # Servidor Host para Linux
│   ├── cepantezca.desktop          # Lanzador para menú de aplicaciones de escritorio
│   ├── cepantezca.service          # Unidad de servicio systemd de usuario (autostart)
│   ├── requirements.txt            # Dependencias Python (fastapi, uvicorn, mss, pillow)
│   ├── run.sh                      # Orquestador principal (Venv + VKMS + ADB + Server + Teardown)
│   ├── server.py                   # Servidor FastAPI + WebSockets + inyección xdotool
│   ├── setup_virtual_display.sh    # Script de configuración de monitor VKMS y xrandr
│   └── teardown_virtual_display.sh # Limpieza del monitor virtual y descarga de módulos
├── mobile/                         # App móvil nativa (React Native / Expo)
│   ├── assets/session-client.html  # Cliente web embebible para WebView
│   ├── screens/DashboardScreen.tsx # Lista de hosts guardados, pings y configuración
│   ├── screens/SessionScreen.tsx   # Visor inmersivo y controles flotantes
│   ├── storage.ts                  # Persistencia de hosts (AsyncStorage) y test de ping
│   └── package.json
├── DESIGN.md                       # Especificación de UI/UX (Paleta Dark UI, componentes)
├── SCREENS.md                      # Especificación funcional de cada pantalla
└── README.md                       # Documentación técnica general
```

---

## ⚙️ Requisitos del Sistema

> [!IMPORTANT]
> **Requiere sesión X11 (Xorg)**. No es compatible de forma directa con Wayland puro debido a que `xrandr --setprovideroutputsource` y `xdotool` dependen del protocolo del servidor X. Si estás en Ubuntu/Fedora/Debian con Wayland, iniciá sesión seleccionando *"GNOME en Xorg"* o *"X11"*.

### Paquetes del Sistema (Host Linux)

```bash
sudo apt update
sudo apt install xdotool x11-xserver-utils adb -y
```

> [!NOTE]
> En algunas distribuciones basadas en Ubuntu/Debian, el módulo de kernel `vkms` se encuentra en el paquete de módulos adicionales:
> ```bash
> sudo apt install linux-modules-extra-$(uname -r)
> ```

---

## 🚀 Inicio Rápido

### 1. Iniciar con el orquestador automático

```bash
cd host
./run.sh
```

El script `./run.sh` realiza automáticamente:
1. Verificación o creación del entorno virtual Python (`venv`) e instalación de librerías.
2. Carga del módulo `vkms` y configuración del monitor virtual en `xrandr`.
3. Detección de dispositivos USB conectados con ADB y activación de `adb reverse`.
4. Inicio del servidor FastAPI en el puerto `8765`.
5. Limpieza automática (`teardown`) al presionar `Ctrl+C`.

### Opciones de Posicionamiento y Resolución

Podés pasarle argumentos a `./run.sh` para definir la resolución y posición relativa a tu pantalla física:

```bash
# Pantalla virtual a la derecha (por defecto, 2560x1600 para tablets 16:10)
./run.sh

# Resolución Full HD ubicada a la izquierda del monitor principal
./run.sh --res 1920x1080 --left-of eDP-1

# Monitor virtual arriba de tu pantalla
./run.sh --res 1920x1200 --above eDP-1
```

---

## 📱 Conexión desde el Dispositivo Cliente

| Método | Conexión | Ventajas | Configuración |
| :--- | :--- | :--- | :--- |
| **USB (ADB)** | `http://localhost:8765` | Mínima latencia, sin pérdida de paquetes, no requiere red WiFi | Activar *Depuración USB* en Android y conectar cable |
| **WiFi LAN** | `http://<IP_HOST>:8765` | Sin cables, compatible con cualquier dispositivo (iOS, Android, PC) | Ambos dispositivos en la misma red local |

### Opción 1: Navegador Web / PWA (Recomendado sin instalar nada)
1. Abrí el navegador (Chrome, Brave, Safari) en tu tablet.
2. Si estás por USB: Navegá a `http://localhost:8765`.
3. Si estás por WiFi: Navegá a `http://<IP_DE_TU_LAPTOP>:8765`.
4. Tocá **"Instalar aplicación"** o **"Añadir a la pantalla de inicio"** para usarla en pantalla completa sin barras del navegador.

### Opción 2: App Móvil (Expo / React Native)
```bash
cd mobile
npm install
npx expo start
```
Escaneá el código QR con **Expo Go** o compila el APK nativo.

---

## ⌨️ Controles y Gestos Táctiles

- **1 Dedo (Tap / Arrastre)**: Clic izquierdo y movimiento del puntero del mouse.
- **Pulsación prolongada (450 ms)**: Clic secundario (clic derecho).
- **Desplazamiento con 2 Dedos**: Scroll vertical y horizontal del mouse.
- **Botón ⌨️ (Teclado)**: Abre el teclado virtual y barra de atajos rápidos (`Enter`, `Tab`, `Esc`, `Ctrl+C`, `Ctrl+V`, `Super`, `Alt+Tab`).
- **Botón ⚙️ (Ajustes)**: Modifica la calidad JPEG (30% - 95%) y la tasa de refresco (15 - 60 FPS) en tiempo real sin reiniciar.
- **Botón ⛶ (Pantalla completa)**: Alterna el modo inmersivo de la interfaz.

---

## 🖥️ Integración con el Sistema Operativo

### Lanzador de Aplicaciones (`.desktop`)
Para integrar Cepantezca en tu menú de aplicaciones:
```bash
cp host/cepantezca.desktop ~/.local/share/applications/
```

### Servicio Systemd de Usuario (Inicio automático)
Para que el servidor se ejecute como servicio de fondo con tu sesión:
```bash
mkdir -p ~/.config/systemd/user
cp host/cepantezca.service ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user enable --now cepantezca.service
```

---

## 🔍 Solución de Problemas (Troubleshooting)

### 1. "No se detectó provider vkms en xrandr" o error al cargar el módulo
- Comprobá si tu kernel soporta `vkms`:
  ```bash
  sudo modprobe vkms
  lsmod | grep vkms
  ```
- Si no está disponible, instalá los módulos extra de tu kernel (`sudo apt install linux-modules-extra-$(uname -r)`).

### 2. La tablet no conecta por WiFi
- Verificá que el puerto `8765` no esté bloqueado por el firewall en tu laptop:
  ```bash
  sudo ufw allow 8765/tcp
  ```
- Obtené tu IP local con `ip addr show` o `hostname -I`.

### 3. Las ventanas no se ven o el cursor no responde
- Verificá qué salida virtual se creó ejecutando:
  ```bash
  xrandr --query | grep -iE "virtual|writeback"
  ```
- Comprobá que `xdotool` esté instalado y operativo en tu sesión de usuario (`xdotool getmouselocation`).
