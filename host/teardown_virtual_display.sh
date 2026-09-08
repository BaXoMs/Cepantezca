#!/bin/bash
# teardown_virtual_display.sh
# Apaga el monitor virtual creado por setup_virtual_display.sh y limpia archivos temporales.

OUTPUT_FILE="/tmp/cepantezca_output_name"

if [ -f "$OUTPUT_FILE" ]; then
    OUTPUT_NAME=$(cat "$OUTPUT_FILE")
    if [ -n "$OUTPUT_NAME" ]; then
        echo "[Cepantezca] Apagando output virtual: $OUTPUT_NAME..."
        xrandr --output "$OUTPUT_NAME" --off 2>/dev/null || true
    fi
    rm -f "$OUTPUT_FILE"
fi

# Fallback: apagar cualquier Virtual-* o Writeback-* que siga activo si no hay archivo temporal
for out in $(xrandr --query | grep -iE "virtual|writeback" | grep -w "connected" | awk '{print $1}'); do
    echo "[Cepantezca] Apagando output: $out..."
    xrandr --output "$out" --off 2>/dev/null || true
done

echo "[Cepantezca] ✅ Display virtual desmontado y limpiado correctamente."
