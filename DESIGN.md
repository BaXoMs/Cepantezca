# Cepantezca Mobile — Guía de diseño

Estilo de referencia: **dark UI minimalista**, tipo herramienta técnica —
poco color, mucho contraste, sin decoración de más. Basado en lo ya
implementado en `DashboardScreen.tsx` y `SessionScreen.tsx`.

---

## Paleta de colores

| Uso | Color | Hex |
|---|---|---|
| Fondo de pantalla | Negro azulado | `#0b0b0f` |
| Fondo de tarjeta / card | Gris muy oscuro | `#17171f` |
| Borde de inputs / separadores | Gris oscuro | `#2a2a35` |
| Acento principal (botones, foco) | Azul | `#4a90d9` |
| Acento sobre fondo azul tenue (modo activo) | Azul oscuro de fondo | `#1a2a3a` |
| Texto principal | Blanco | `#fff` |
| Texto secundario / subtítulos | Gris medio | `#999` |
| Texto terciario / hints | Gris apagado | `#888` |
| Éxito / conectado | Verde | `#4caf50` |
| Advertencia / conectando | Ámbar | `#e0a95a` |
| Error / desconectado / eliminar | Rojo coral | `#e05a5a` |

**Regla de uso**: un solo acento de color (azul) para acciones primarias.
Verde/ámbar/rojo se reservan exclusivamente para estado de conexión — no se
usan como colores decorativos en otro lado.

---

## Tipografía

Sin fuente custom por ahora — se usa la fuente del sistema (default de
React Native).

| Elemento | Tamaño | Peso |
|---|---|---|
| Título de pantalla (ej. "Cepantezca") | 26px | 700 (bold) |
| Título de modal | 20px | 700 (bold) |
| Título de tarjeta (nombre de host) | 17px | 600 (semibold) |
| Texto de botón | 15-16px | 600-700 |
| Subtítulo de tarjeta (IP:puerto) | 13px | 400 (regular) |
| Texto de estado / pill | 12px | 400 (regular) |
| Texto de ayuda / empty state | 15px | 400, `lineHeight: 22` |
| Status técnico (overlay stream) | 10-11px | monospace |

**Regla**: nunca bajar de 11px, ni siquiera en overlays técnicos.

---

## Espaciado

- Padding de pantalla completa: `20px` horizontal, `40px` top (para dejar
  lugar a la barra de estado del dispositivo)
- Padding interno de tarjeta: `16px`
- Padding interno de modal: `20px`
- Gap entre tarjetas en la lista: `12px`
- Gap entre elementos de un formulario (modal): `12px`
- Border radius de tarjetas/modales: `12px`
- Border radius de botones/inputs: `8px`
- Border radius de elementos circulares (pill de estado, botón ✕ flotante): `50%` / mitad del alto

---

## Componentes

### Botón primario
Fondo `#4a90d9`, texto blanco, `bold`, padding `10-12px` vertical,
`14-20px` horizontal, `border-radius: 8px`. Uso: acciones que confirman
(Guardar, + Nueva conexión).

### Botón secundario / cancelar
Sin fondo, solo texto en gris (`#999`), mismo padding que el primario.
Uso: Cancelar, acciones no destructivas de bajo compromiso.

### Botón destructivo
Texto o ícono en rojo coral (`#e05a5a`), sin fondo salvo hover/press.
Uso: eliminar una conexión.

### Tarjeta de host (Dashboard)
Fondo `#17171f`, `border-radius: 12px`, padding `16px`, layout horizontal
(contenido a la izquierda, ícono de acción a la derecha).

### Selector tipo toggle (WiFi / USB)
Dos botones lado a lado, mismo ancho (`flex: 1`), fondo `#0b0b0f` con
borde `#2a2a35` en estado inactivo; al activarse: borde `#4a90d9` +
fondo `#1a2a3a`.

### Modal
Overlay `rgba(0,0,0,0.6)` cubriendo toda la pantalla, tarjeta centrada
con fondo `#17171f`, `border-radius: 16px`, padding `20px`.

### Pill de estado (Sesión)
Fondo `rgba(0,0,0,0.5)` (semi-transparente sobre el stream), forma
píldora (`border-radius: 14px`), punto de color de 8px + texto 12px,
`gap: 6px` entre el punto y el texto.

### Botón flotante circular (✕ de salir)
40x40px, `border-radius: 20px`, fondo `rgba(0,0,0,0.5)`, ícono blanco
centrado. Se posiciona con `position: absolute` en las esquinas
superiores, nunca tapa contenido central.

---

## Principios generales

1. **Sin gradientes ni sombras decorativas** — todo flat, contraste por
   color de fondo, no por efectos.
2. **El color de estado (verde/ámbar/rojo) es la única señal dinámica** —
   todo lo demás en la UI se mantiene estático en apariencia.
3. **Los controles sobre el stream (pill, botón ✕) son semi-transparentes**
   y se apoyan sobre `rgba(0,0,0,0.5)`, nunca opacos — para no tapar de
   más el contenido remoto que se está mostrando.
4. **Prioridad al contenido remoto**: en la pantalla de Sesión, la UI
   propia de la app ocupa el mínimo espacio posible (solo dos elementos
   pequeños en las esquinas).

---

## Pendiente de definir

- [ ] Ícono/logo de la app (hoy es solo texto "Cepantezca")
- [ ] Paleta para modo claro (hoy todo está pensado solo para dark — **¿hace falta modo claro?**)
- [ ] Animaciones/transiciones entre Dashboard y Sesión (hoy es instantáneo)
- [ ] Estado de carga/skeleton mientras conecta (hoy el pill simplemente queda en ámbar)
