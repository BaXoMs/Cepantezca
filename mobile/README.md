# Cepantezca Mobile (Expo)

Usa tu tablet como segundo monitor de tu computadora con Linux, por WiFi o
por cable USB — sin instalar drivers ni compilar nada del lado de la tablet.

App cliente para Android/iOS, pensada para probarse directo con **Expo Go**
mientras se desarrolla — sin builds nativos.

## Qué hace

- **Dashboard**: lista de computadoras guardadas (nombre, IP/puerto, modo
  WiFi o USB), con botón para agregar nuevas. Se guardan localmente con
  AsyncStorage.
- **Sesión**: al tocar una conexión, abre un WebView a pantalla completa
  (forzado horizontal) que renderiza el stream JPEG del host por WebSocket
  y manda los eventos de touch de vuelta — es el mismo protocolo que ya
  habla `host/server.py`.
- Modo **USB**: se guarda la conexión como `localhost:<puerto>`, asumiendo
  que corriste `adb reverse tcp:<puerto> tcp:<puerto>` del lado de la
  laptop (lo hace automático `host/run.sh`).

## Cómo correrlo

```bash
cd mobile
npm install
npx expo start
```

Se abre un QR en la terminal / navegador. Con la app **Expo Go** instalada
en tu Galaxy Tab S9 FE (Play Store), escaneás el QR y carga la app al
instante — sin compilar nada.

### Por WiFi
Tablet y laptop en la misma red, escaneás el QR de Expo con la app Expo Go.

### Por USB
Con el cable conectado y depuración USB activa, corré:
```bash
adb reverse tcp:8081 tcp:8081
```
(8081 es el puerto default del bundler de Expo) y abrí Expo Go en la
tablet, opción "Enter URL manually" → `exp://localhost:8081`.

## Próximos pasos

- [ ] Descubrimiento automático de hosts en la red (mDNS/zeroconf) en vez
      de tipear la IP a mano
- [ ] Reconexión automática si se corta el WebSocket
- [ ] Selector de calidad/FPS desde la propia app
- [ ] Ícono y splash screen propios
- [ ] Build standalone con EAS (para no depender de Expo Go una vez esté
      estable)
