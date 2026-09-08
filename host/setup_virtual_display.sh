#!/bin/bash
# setup_virtual_display.sh
# Configura un monitor virtual real usando VKMS + xrandr para extender el escritorio.
set -e

RESOLUTION="2560x1600"
POSITION="--right-of"
TARGET_DISPLAY=""

# Parsear argumentos opcionales
while [[ $# -gt 0 ]]; do
    case "$1" in
        --res|--resolution)
            RESOLUTION="$2"
            shift 2
            ;;
        --left-of)
            POSITION="--left-of"
            TARGET_DISPLAY="$2"
            shift 2
            ;;
        --right-of)
            POSITION="--right-of"
            TARGET_DISPLAY="$2"
            shift 2
            ;;
        --above)
            POSITION="--above"
            TARGET_DISPLAY="$2"
            shift 2
            ;;
        --below)
            POSITION="--below"
            TARGET_DISPLAY="$2"
            shift 2
            ;;
        *)
            if [[ "$1" =~ ^[0-9]+x[0-9]+$ ]]; then
                RESOLUTION="$1"
            fi
            shift
            ;;
    esac
done

WIDTH="${RESOLUTION%x*}"
HEIGHT="${RESOLUTION#*x}"

echo "[Cepantezca] 1. Verificando/cargando módulo vkms..."
if ! lsmod | grep -q '^vkms'; then
    if command -v sudo >/dev/null 2>&1; then
        sudo modprobe vkms || echo "[Cepantezca] Aviso: No se pudo ejecutar 'sudo modprobe vkms' automáticamente."
    else
        modprobe vkms 2>/dev/null || true
    fi
    sleep 1
fi

echo "[Cepantezca] 2. Detectando proveedores de pantalla xrandr..."
VKMS_PROVIDER=$(xrandr --listproviders | grep -i vkms | grep -oP 'Provider \K[0-9]+' | head -1 || true)
MAIN_PROVIDER=$(xrandr --listproviders | grep -iv vkms | grep -oP 'Provider \K[0-9]+' | head -1 || true)

if [ -z "$VKMS_PROVIDER" ]; then
    echo "[Cepantezca] AVISO: No se detectó provider vkms explícito en xrandr."
    echo "[Cepantezca] Verificando si ya existe un output virtual activo..."
else
    echo "[Cepantezca] Conectando provider VKMS ($VKMS_PROVIDER) a provider principal ($MAIN_PROVIDER)..."
    xrandr --setprovideroutputsource "$VKMS_PROVIDER" "$MAIN_PROVIDER" 2>/dev/null || true
    xrandr --auto 2>/dev/null || true
fi

echo "[Cepantezca] 3. Buscando output virtual disponible..."
NEW_OUTPUT=$(xrandr --query | grep -iE "virtual|writeback" | head -1 | awk '{print $1}')

if [ -z "$NEW_OUTPUT" ]; then
    echo "[Cepantezca] Error: No se encontró ningún output de video virtual disponible."
    echo "[Cepantezca] Salida de xrandr --query:"
    xrandr --query
    exit 1
fi

# Detectar pantalla principal si no se especificó
if [ -z "$TARGET_DISPLAY" ]; then
    TARGET_DISPLAY=$(xrandr --query | grep -w "connected primary" | awk '{print $1}' | head -1)
    if [ -z "$TARGET_DISPLAY" ]; then
        TARGET_DISPLAY=$(xrandr --query | grep -w "connected" | grep -v "$NEW_OUTPUT" | awk '{print $1}' | head -1)
    fi
fi

echo "[Cepantezca] 4. Configurando output virtual: $NEW_OUTPUT (${WIDTH}x${HEIGHT}) $POSITION ${TARGET_DISPLAY:-principal}..."

# Crear modo si no existe
MODE_NAME="${WIDTH}x${HEIGHT}_60.00"
if ! xrandr | grep -q "$MODE_NAME"; then
    CVT_OUT=$(cvt "$WIDTH" "$HEIGHT" 60 | grep "Modeline" | sed 's/Modeline //')
    MODE_STR=$(echo "$CVT_OUT" | awk '{print $1}' | tr -d '"')
    MODE_PARAMS=$(echo "$CVT_OUT" | cut -d' ' -f2-)
    xrandr --newmode "$MODE_STR" $MODE_PARAMS 2>/dev/null || true
    xrandr --addmode "$NEW_OUTPUT" "$MODE_STR" 2>/dev/null || true
fi

# Activar output
if [ -n "$TARGET_DISPLAY" ] && [ "$TARGET_DISPLAY" != "$NEW_OUTPUT" ]; then
    xrandr --output "$NEW_OUTPUT" --mode "$RESOLUTION" "$POSITION" "$TARGET_DISPLAY" 2>/dev/null || \
    xrandr --output "$NEW_OUTPUT" --auto "$POSITION" "$TARGET_DISPLAY"
else
    xrandr --output "$NEW_OUTPUT" --mode "$RESOLUTION" 2>/dev/null || \
    xrandr --output "$NEW_OUTPUT" --auto
fi

echo "$NEW_OUTPUT" > /tmp/cepantezca_output_name
echo "[Cepantezca] ✅ Display virtual activo: $NEW_OUTPUT a ${RESOLUTION}"
