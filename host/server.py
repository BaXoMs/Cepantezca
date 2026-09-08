"""
Cepantezca Host Server
=====================
Captura el output de video virtual (creado por setup_virtual_display.sh),
lo transmite por WebSocket como stream JPEG, sirve la PWA web estática,
y recibe eventos de touch/mouse/teclado de la tablet para inyectarlos
de vuelta en esa región de la pantalla real via xdotool.

Uso:
    python3 server.py --output-name Virtual-1 --port 8765
"""
import argparse
import asyncio
import io
import os
import subprocess
import time
from pathlib import Path
from typing import Optional

import mss
import mss.tools
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from PIL import Image

# Directorio raíz del proyecto (para ubicar client/)
CURRENT_DIR = Path(__file__).resolve().parent
CLIENT_DIR = (CURRENT_DIR.parent / "client").resolve()
if not CLIENT_DIR.exists():
    CLIENT_DIR = CURRENT_DIR / "client"

# ---- Estado global ----
state = {
    "output_name": "Virtual-1",
    "region": None,       # dict: left, top, width, height (coordenadas ABSOLUTAS)
    "fps": 30,
    "quality": 70,
}


def find_output_geometry(output_name: str) -> dict:
    """Consulta xrandr para sacar la posición/tamaño real del output virtual."""
    try:
        result = subprocess.run(["xrandr", "--query"], capture_output=True, text=True, check=True)
    except Exception as e:
        raise RuntimeError(f"Error al ejecutar xrandr: {e}")

    for line in result.stdout.splitlines():
        if line.startswith(output_name) and " connected" in line:
            # Ejemplo de línea: "Virtual-1 connected 2560x1600+1920+0 ..."
            parts = line.split()
            for part in parts:
                if "+" in part and "x" in part and not part.startswith("("):
                    # Formato: WIDTHxHEIGHT+X+Y
                    wh, xoff, yoff = part.split("+")
                    width, height = wh.split("x")
                    return {
                        "left": int(xoff),
                        "top": int(yoff),
                        "width": int(width),
                        "height": int(height),
                    }
    raise RuntimeError(
        f"No se encontró el output '{output_name}' conectado. "
        f"Corré setup_virtual_display.sh primero."
    )


app = FastAPI(title="Cepantezca Host API")

# Habilitar CORS para desarrollo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SettingsPayload(BaseModel):
    fps: Optional[int] = Field(None, ge=5, le=60)
    quality: Optional[int] = Field(None, ge=10, le=95)


# ---- Endpoints REST ----

@app.get("/api/ping")
async def ping():
    """Endpoint simple para verificar que el host está activo en la red."""
    return {"status": "ok", "timestamp": time.time(), "name": "Cepantezca Host"}


@app.get("/api/status")
async def get_status():
    """Retorna información del servidor, región de pantalla y configuración actual."""
    return {
        "status": "ok",
        "output_name": state["output_name"],
        "region": state["region"],
        "fps": state["fps"],
        "quality": state["quality"],
    }


@app.post("/api/settings")
async def update_settings(payload: SettingsPayload):
    """Actualiza FPS y calidad de compresión JPEG dinámicamente."""
    if payload.fps is not None:
        state["fps"] = payload.fps
    if payload.quality is not None:
        state["quality"] = payload.quality

    return {
        "status": "ok",
        "fps": state["fps"],
        "quality": state["quality"],
    }


# ---- WebSockets ----

@app.websocket("/stream")
async def stream_endpoint(websocket: WebSocket):
    """Transmite frames JPEG capturados con MSS a la tasa de refresco configurada."""
    await websocket.accept()
    region = state["region"]
    if not region:
        await websocket.close(code=1011, reason="Región de captura no inicializada")
        return

    try:
        with mss.mss() as sct:
            while True:
                fps = state["fps"]
                quality = state["quality"]
                frame_interval = 1.0 / max(5, min(60, fps))

                start = time.time()
                raw = sct.grab(region)
                img = Image.frombytes("RGB", raw.size, raw.rgb)
                buf = io.BytesIO()
                img.save(buf, format="JPEG", quality=quality, optimize=False)
                await websocket.send_bytes(buf.getvalue())

                elapsed = time.time() - start
                sleep_time = max(0.001, frame_interval - elapsed)
                await asyncio.sleep(sleep_time)
    except (WebSocketDisconnect, asyncio.CancelledError):
        pass
    except Exception as e:
        print(f"[Cepantezca Stream] Error en transmisión: {e}")


@app.websocket("/input")
async def input_endpoint(websocket: WebSocket):
    """
    Recibe eventos JSON de la tablet y los inyecta en X11 con xdotool:
      - move:   {"type": "move", "x": 0.0-1.0, "y": 0.0-1.0}
      - down:   {"type": "down", "x": ..., "y": ..., "button": 1|2|3}
      - up:     {"type": "up",   "x": ..., "y": ..., "button": 1|2|3}
      - click:  {"type": "click","x": ..., "y": ..., "button": 1|2|3}
      - scroll: {"type": "scroll", "dx": float, "dy": float}
      - key:    {"type": "key",  "keysym": "Return"}
      - text:   {"type": "text", "text": "Hola mundo"}
      - config: {"type": "config", "fps": 30, "quality": 75}
    """
    await websocket.accept()
    region = state["region"]
    if not region:
        await websocket.close(code=1011, reason="Región no configurada")
        return

    try:
        while True:
            data = await websocket.receive_json()
            ev_type = data.get("type")

            if ev_type in ("move", "down", "up", "click"):
                x_norm = float(data.get("x", 0.0))
                y_norm = float(data.get("y", 0.0))
                abs_x = region["left"] + int(x_norm * region["width"])
                abs_y = region["top"] + int(y_norm * region["height"])
                btn = str(data.get("button", 1))

                if ev_type == "move":
                    subprocess.run(["xdotool", "mousemove", str(abs_x), str(abs_y)], check=False)
                elif ev_type == "down":
                    subprocess.run(["xdotool", "mousemove", str(abs_x), str(abs_y), "mousedown", btn], check=False)
                elif ev_type == "up":
                    subprocess.run(["xdotool", "mousemove", str(abs_x), str(abs_y), "mouseup", btn], check=False)
                elif ev_type == "click":
                    subprocess.run(["xdotool", "mousemove", str(abs_x), str(abs_y), "click", btn], check=False)

            elif ev_type == "scroll":
                dy = data.get("dy", 0)
                dx = data.get("dx", 0)
                # dy > 0: scroll hacia abajo (button 5), dy < 0: scroll hacia arriba (button 4)
                if dy > 0:
                    steps = max(1, min(10, int(abs(dy) / 20) or 1))
                    for _ in range(steps):
                        subprocess.run(["xdotool", "click", "5"], check=False)
                elif dy < 0:
                    steps = max(1, min(10, int(abs(dy) / 20) or 1))
                    for _ in range(steps):
                        subprocess.run(["xdotool", "click", "4"], check=False)

                # dx > 0: scroll derecha (button 7), dx < 0: scroll izquierda (button 6)
                if dx > 0:
                    subprocess.run(["xdotool", "click", "7"], check=False)
                elif dx < 0:
                    subprocess.run(["xdotool", "click", "6"], check=False)

            elif ev_type == "key":
                keysym = data.get("keysym")
                if keysym:
                    subprocess.run(["xdotool", "key", str(keysym)], check=False)

            elif ev_type == "text":
                text_content = data.get("text", "")
                if text_content:
                    subprocess.run(["xdotool", "type", "--delay", "12", text_content], check=False)

            elif ev_type == "config":
                if "fps" in data:
                    state["fps"] = max(5, min(60, int(data["fps"])))
                if "quality" in data:
                    state["quality"] = max(10, min(95, int(data["quality"])))

    except (WebSocketDisconnect, asyncio.CancelledError):
        pass
    except Exception as e:
        print(f"[Cepantezca Input] Error procesando input: {e}")


# ---- Servir archivos estáticos del Cliente PWA ----

if CLIENT_DIR.exists():
    app.mount("/client", StaticFiles(directory=str(CLIENT_DIR), html=True), name="client_static")

    @app.get("/")
    async def serve_pwa_root():
        index_file = CLIENT_DIR / "index.html"
        if index_file.exists():
            return FileResponse(str(index_file))
        return JSONResponse({"status": "ok", "message": "Cepantezca Host Activo"})


def main():
    import uvicorn

    parser = argparse.ArgumentParser(description="Servidor Host Cepantezca")
    parser.add_argument("--output-name", default="Virtual-1", help="Nombre del output virtual (ej: Virtual-1)")
    parser.add_argument("--port", type=int, default=8765, help="Puerto HTTP/WebSocket (default: 8765)")
    parser.add_argument("--fps", type=int, default=30, help="Frames por segundo iniciales (default: 30)")
    parser.add_argument("--quality", type=int, default=70, help="Calidad JPEG inicial 10-95 (default: 70)")
    args = parser.parse_args()

    state["output_name"] = args.output_name
    state["region"] = find_output_geometry(args.output_name)
    state["fps"] = args.fps
    state["quality"] = args.quality

    print("=" * 60)
    print("  🖥️  CEPANTEZCA - Servidor de Pantalla Virtual Compartida")
    print("=" * 60)
    print(f"  * Output detectado: {state['output_name']}")
    print(f"  * Región de captura: {state['region']['width']}x{state['region']['height']} en (+{state['region']['left']},+{state['region']['top']})")
    print(f"  * Calidad inicial: {state['quality']}% | FPS objetivo: {state['fps']}")
    print(f"  * Servidor web/PWA: http://0.0.0.0:{args.port}/")
    print(f"  * WebSocket Stream: ws://0.0.0.0:{args.port}/stream")
    print(f"  * WebSocket Input:  ws://0.0.0.0:{args.port}/input")
    print("=" * 60)

    uvicorn.run(app, host="0.0.0.0", port=args.port, log_level="warning")


if __name__ == "__main__":
    main()
