#!/bin/bash
# run.sh - Inicia Cepantezca completo: entorno, display virtual, túnel USB y servidor host
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${CEPANTEZCA_PORT:-8765}"
FPS="${CEPANTEZCA_FPS:-30}"
QUALITY="${CEPANTEZCA_QUALITY:-70}"

cleanup() {
    echo ""
    echo "[Cepantezca] Cerrando servidor y limpiando recursos..."
    bash "$SCRIPT_DIR/teardown_virtual_display.sh" 2>/dev/null || true
    echo "[Cepantezca] Finalizado."
    exit 0
}

# Capturar señales para salida limpia
trap cleanup SIGINT SIGTERM EXIT

echo "=================================================="
echo "  🚀 CEPANTEZCA - Lanzador de Pantalla Virtual   "
echo "=================================================="

# Paso 1: Configuración de entorno Python
VENV_DIR="$SCRIPT_DIR/venv"
if [ ! -d "$VENV_DIR" ]; then
    echo "[Cepantezca] Creando entorno virtual en $VENV_DIR..."
    python3 -m venv "$VENV_DIR"
fi

source "$VENV_DIR/bin/activate"

echo "[Cepantezca] Verificando dependencias..."
pip install -q -r "$SCRIPT_DIR/requirements.txt"

# Paso 2: Display virtual
echo "[Cepantezca] Paso 1/3: Configurando output virtual..."
bash "$SCRIPT_DIR/setup_virtual_display.sh" "$@"
OUTPUT_NAME=$(cat /tmp/cepantezca_output_name 2>/dev/null || echo "Virtual-1")

# Paso 3: Modo USB vía ADB si está disponible
echo "[Cepantezca] Paso 2/3: Comprobando conexión USB (ADB)..."
if command -v adb >/dev/null 2>&1; then
    DEVICES=$(adb devices 2>/dev/null | grep -w "device" | awk '{print $1}')
    if [ -n "$DEVICES" ]; then
        echo "[Cepantezca] 🔌 Tablet/Dispositivo detectado vía USB: $DEVICES"
        adb reverse "tcp:$PORT" "tcp:$PORT" 2>/dev/null && echo "[Cepantezca]  -> Túnel USB activo en puerto $PORT"
        adb reverse "tcp:8081" "tcp:8081" 2>/dev/null || true
    else
        echo "[Cepantezca]  -> Sin dispositivo USB conectado. Modo WiFi activo."
    fi
else
    echo "[Cepantezca]  -> 'adb' no instalado en el sistema. Continuando en modo WiFi."
fi

# Paso 4: Levantar servidor
echo "[Cepantezca] Paso 3/3: Levantando servidor host..."
cd "$SCRIPT_DIR"
python3 server.py --output-name "$OUTPUT_NAME" --port "$PORT" --fps "$FPS" --quality "$QUALITY"
