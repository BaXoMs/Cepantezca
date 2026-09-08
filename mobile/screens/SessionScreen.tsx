import React, { useRef, useState, useEffect } from "react";
import {
  View,
  TouchableOpacity,
  Text,
  StyleSheet,
  StatusBar,
  Modal,
  TextInput,
  Pressable,
} from "react-native";
import { WebView } from "react-native-webview";
import { useKeepAwake } from "expo-keep-awake";
import { SavedHost } from "../storage";

type Props = {
  host: SavedHost;
  onExit: () => void;
};

type StreamStatus = "connecting" | "connected" | "reconnecting" | "error";

export default function SessionScreen({ host, onExit }: Props) {
  useKeepAwake(); // Evita que la tablet se suspenda mientras funciona como monitor

  const webviewRef = useRef<WebView>(null);
  const [showControls, setShowControls] = useState(true);
  const [status, setStatus] = useState<StreamStatus>("connecting");

  // Modales
  const [keyboardVisible, setKeyboardVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);

  // Estados de entrada
  const [textInput, setTextInput] = useState("");
  const [quality, setQuality] = useState(host.quality || 70);
  const [fps, setFps] = useState(host.fps || 30);

  // Temporizador para auto-ocultar controles
  useEffect(() => {
    if (!showControls) return;
    const timer = setTimeout(() => {
      if (!keyboardVisible && !settingsVisible) {
        setShowControls(false);
      }
    }, 4000);
    return () => clearTimeout(timer);
  }, [showControls, keyboardVisible, settingsVisible]);

  const targetHost = host.mode === "usb" ? "localhost" : host.address;

  // Inyecta variables globales antes de cargar el script del HTML
  const injectedJavaScriptBeforeContentLoaded = `
    window.__LINKDESK_HOST__ = ${JSON.stringify(targetHost)};
    window.__LINKDESK_PORT__ = ${JSON.stringify(host.port)};
    true;
  `;

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === "stream_status") {
        if (data.value === "connected") setStatus("connected");
        else if (data.value === "reconnecting") setStatus("reconnecting");
        else setStatus("error");
      }
    } catch {
      // Ignorar mensajes no JSON
    }
  };

  const sendToWebView = (payload: any) => {
    const js = `
      window.dispatchEvent(new MessageEvent('message', { data: ${JSON.stringify({ action: "sendInput", payload })} }));
      true;
    `;
    webviewRef.current?.injectJavaScript(js);
  };

  const sendText = () => {
    if (textInput) {
      sendToWebView({ type: "text", text: textInput });
      setTextInput("");
    }
  };

  const sendKey = (keysym: string) => {
    sendToWebView({ type: "key", keysym });
  };

  const applySettings = (newQuality: number, newFps: number) => {
    setQuality(newQuality);
    setFps(newFps);
    sendToWebView({ type: "config", quality: newQuality, fps: newFps });
  };

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <WebView
        ref={webviewRef}
        source={require("../assets/session-client.html")}
        injectedJavaScriptBeforeContentLoaded={injectedJavaScriptBeforeContentLoaded}
        onMessage={handleMessage}
        originWhitelist={["*"]}
        style={styles.webview}
        onTouchStart={() => setShowControls(true)}
      />

      {/* Pill de Estado en esquina superior izquierda */}
      {showControls && (
        <View style={styles.statusPill}>
          <View
            style={[
              styles.statusDot,
              {
                backgroundColor:
                  status === "connected"
                    ? "#4caf50"
                    : status === "error"
                    ? "#e05a5a"
                    : "#e0a95a",
              },
            ]}
          />
          <Text style={styles.statusText}>
            {host.name} · {status === "connected" ? "Activo" : status === "reconnecting" ? "Reconectando..." : "Conectando"}
          </Text>
        </View>
      )}

      {/* Botones de control en esquina superior derecha */}
      {showControls && (
        <View style={styles.topRightControls}>
          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => setKeyboardVisible(true)}
          >
            <Text style={styles.controlBtnText}>⌨️</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.controlBtn}
            onPress={() => setSettingsVisible(true)}
          >
            <Text style={styles.controlBtnText}>⚙️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.exitBtn} onPress={onExit}>
            <Text style={styles.exitBtnText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Modal Teclado y Texto */}
      <Modal visible={keyboardVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Enviar Texto o Teclas</Text>
              <TouchableOpacity onPress={() => setKeyboardVisible(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.input}
              placeholder="Escribe texto para enviar al host..."
              placeholderTextColor="#666"
              value={textInput}
              onChangeText={setTextInput}
              onSubmitEditing={sendText}
              autoFocus
            />

            <TouchableOpacity style={styles.actionBtn} onPress={sendText}>
              <Text style={styles.actionBtnText}>Enviar Texto</Text>
            </TouchableOpacity>

            <View style={styles.quickKeysRow}>
              {["Return", "BackSpace", "Tab", "Escape", "Super_L", "ctrl+c", "ctrl+v", "Alt+Tab"].map((key) => (
                <TouchableOpacity
                  key={key}
                  style={styles.keyBtn}
                  onPress={() => sendKey(key)}
                >
                  <Text style={styles.keyBtnText}>
                    {key === "Return" ? "Enter" : key === "BackSpace" ? "Borrar" : key === "Super_L" ? "Win" : key}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal Ajustes de Calidad y FPS */}
      <Modal visible={settingsVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Ajustes de Stream</Text>
              <TouchableOpacity onPress={() => setSettingsVisible(false)}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.sectionLabel}>Calidad JPEG ({quality}%)</Text>
            <View style={styles.selectorRow}>
              {[50, 70, 85, 95].map((q) => (
                <Pressable
                  key={q}
                  style={[styles.selectorBtn, quality === q && styles.selectorBtnActive]}
                  onPress={() => applySettings(q, fps)}
                >
                  <Text style={[styles.selectorBtnText, quality === q && styles.selectorBtnTextActive]}>
                    {q}%
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={styles.sectionLabel}>FPS Objetivo ({fps} fps)</Text>
            <View style={styles.selectorRow}>
              {[15, 25, 30, 60].map((f) => (
                <Pressable
                  key={f}
                  style={[styles.selectorBtn, fps === f && styles.selectorBtnActive]}
                  onPress={() => applySettings(quality, f)}
                >
                  <Text style={[styles.selectorBtnText, fps === f && styles.selectorBtnTextActive]}>
                    {f} FPS
                  </Text>
                </Pressable>
              ))}
            </View>

            <TouchableOpacity
              style={[styles.actionBtn, { marginTop: 8 }]}
              onPress={() => setSettingsVisible(false)}
            >
              <Text style={styles.actionBtnText}>Listo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  webview: { flex: 1, backgroundColor: "#000" },

  topRightControls: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  controlBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  controlBtnText: { color: "#fff", fontSize: 16 },
  exitBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.6)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  exitBtnText: { color: "#e05a5a", fontSize: 18, fontWeight: "700" },

  statusPill: {
    position: "absolute",
    top: 16,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusText: { color: "#fff", fontSize: 12, fontWeight: "500" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    backgroundColor: "#17171f",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2a2a35",
    padding: 20,
    width: "100%",
    maxWidth: 420,
    gap: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  modalTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  closeBtnText: { color: "#999", fontSize: 18, padding: 4 },

  input: {
    backgroundColor: "#0b0b0f",
    color: "#fff",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#2a2a35",
  },
  actionBtn: {
    backgroundColor: "#4a90d9",
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  quickKeysRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  keyBtn: {
    backgroundColor: "#0b0b0f",
    borderWidth: 1,
    borderColor: "#2a2a35",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  keyBtnText: { color: "#ddd", fontSize: 12, fontWeight: "600" },

  sectionLabel: { color: "#aaa", fontSize: 13, fontWeight: "600", marginTop: 4 },
  selectorRow: { flexDirection: "row", gap: 8 },
  selectorBtn: {
    flex: 1,
    backgroundColor: "#0b0b0f",
    borderWidth: 1,
    borderColor: "#2a2a35",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  selectorBtnActive: {
    borderColor: "#4a90d9",
    backgroundColor: "#1a2a3a",
  },
  selectorBtnText: { color: "#888", fontSize: 13, fontWeight: "600" },
  selectorBtnTextActive: { color: "#fff" },
});
