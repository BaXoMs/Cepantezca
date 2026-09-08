import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Modal,
  Pressable,
  ActivityIndicator,
} from "react-native";
import {
  SavedHost,
  ConnectionMode,
  loadHosts,
  saveHost,
  deleteHost,
  touchHost,
  checkHostPing,
  formatLastConnected,
} from "../storage";

type Props = {
  onConnect: (host: SavedHost) => void;
};

function makeId() {
  return `h_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
}

export default function DashboardScreen({ onConnect }: Props) {
  const [hosts, setHosts] = useState<SavedHost[]>([]);
  const [hostStatus, setHostStatus] = useState<Record<string, boolean>>({});
  const [checkingStatus, setCheckingStatus] = useState(false);

  // Modales
  const [modalVisible, setModalVisible] = useState(false);
  const [helpVisible, setHelpVisible] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  // Formulario
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [port, setPort] = useState("8765");
  const [mode, setMode] = useState<ConnectionMode>("wifi");

  const refreshHosts = useCallback(async () => {
    const list = await loadHosts();
    setHosts(list);
    pingAllHosts(list);
  }, []);

  const pingAllHosts = async (list: SavedHost[]) => {
    setCheckingStatus(true);
    const statuses: Record<string, boolean> = {};
    for (const h of list) {
      statuses[h.id] = await checkHostPing(h);
    }
    setHostStatus(statuses);
    setCheckingStatus(false);
  };

  useEffect(() => {
    refreshHosts();
  }, [refreshHosts]);

  const openNewModal = () => {
    setEditingId(null);
    setName("");
    setAddress("");
    setPort("8765");
    setMode("wifi");
    setModalVisible(true);
  };

  const openEditModal = (host: SavedHost) => {
    setEditingId(host.id);
    setName(host.name);
    setAddress(host.address === "localhost" ? "" : host.address);
    setPort(host.port);
    setMode(host.mode);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name.trim() || !port.trim()) return;
    if (mode === "wifi" && !address.trim()) return;

    const hostToSave: SavedHost = {
      id: editingId || makeId(),
      name: name.trim(),
      address: mode === "usb" ? "localhost" : address.trim(),
      port: port.trim(),
      mode,
    };

    await saveHost(hostToSave);
    setModalVisible(false);
    refreshHosts();
  };

  const confirmDelete = async () => {
    if (deleteConfirmId) {
      await deleteHost(deleteConfirmId);
      setDeleteConfirmId(null);
      refreshHosts();
    }
  };

  const handleConnect = async (host: SavedHost) => {
    await touchHost(host.id);
    onConnect(host);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Cepantezca</Text>
          <Text style={styles.subtitle}>Monitor secundario Linux</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.helpBtn} onPress={() => setHelpVisible(true)}>
            <Text style={styles.helpBtnText}>? Ayuda</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.addBtn} onPress={openNewModal}>
            <Text style={styles.addBtnText}>+ Nueva conexión</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Lista de Hosts */}
      {hosts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🖥️</Text>
          <Text style={styles.emptyTitle}>Sin computadoras guardadas</Text>
          <Text style={styles.emptyText}>
            Tocá "+ Nueva conexión" para conectar tu tablet a tu computadora con Linux por WiFi o cable USB.
          </Text>
          <TouchableOpacity style={styles.emptyActionBtn} onPress={() => setHelpVisible(true)}>
            <Text style={styles.emptyActionBtnText}>Ver instrucciones de inicio</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={hosts.sort((a, b) => (b.lastConnected ?? 0) - (a.lastConnected ?? 0))}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 20, gap: 12 }}
          refreshing={checkingStatus}
          onRefresh={refreshHosts}
          renderItem={({ item }) => {
            const isOnline = hostStatus[item.id];
            return (
              <View style={styles.card}>
                <TouchableOpacity style={styles.cardMain} onPress={() => handleConnect(item)}>
                  <View style={styles.cardHeaderRow}>
                    <View style={[styles.statusDot, isOnline ? styles.dotOnline : styles.dotOffline]} />
                    <Text style={styles.cardTitle}>{item.name}</Text>
                    {isOnline && <Text style={styles.onlineTag}>En línea</Text>}
                  </View>

                  <Text style={styles.cardSubtitle}>
                    {item.mode === "usb" ? "🔌 USB" : "📶 WiFi"} · {item.address}:{item.port}
                  </Text>

                  <Text style={styles.cardFooterText}>
                    {formatLastConnected(item.lastConnected)}
                  </Text>
                </TouchableOpacity>

                <View style={styles.cardActions}>
                  <TouchableOpacity onPress={() => openEditModal(item)} style={styles.iconBtn}>
                    <Text style={styles.editBtnText}>✏️</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setDeleteConfirmId(item.id)} style={styles.iconBtn}>
                    <Text style={styles.deleteBtnText}>✕</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* Modal: Formulario Nueva / Editar Conexión */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingId ? "Editar conexión" : "Nueva conexión"}
            </Text>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Nombre de la computadora</Text>
              <TextInput
                style={styles.input}
                placeholder="ej: ThinkPad Trabajo"
                placeholderTextColor="#666"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Modo de conexión</Text>
              <View style={styles.modeRow}>
                <Pressable
                  style={[styles.modeBtn, mode === "wifi" && styles.modeBtnActive]}
                  onPress={() => setMode("wifi")}
                >
                  <Text style={[styles.modeBtnText, mode === "wifi" && styles.modeBtnTextActive]}>
                    📶 WiFi
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.modeBtn, mode === "usb" && styles.modeBtnActive]}
                  onPress={() => setMode("usb")}
                >
                  <Text style={[styles.modeBtnText, mode === "usb" && styles.modeBtnTextActive]}>
                    🔌 USB
                  </Text>
                </Pressable>
              </View>
            </View>

            {mode === "wifi" && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Dirección IP de la PC</Text>
                <TextInput
                  style={styles.input}
                  placeholder="ej: 192.168.1.100"
                  placeholderTextColor="#666"
                  value={address}
                  onChangeText={setAddress}
                  keyboardType="numbers-and-punctuation"
                />
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Puerto</Text>
              <TextInput
                style={styles.input}
                placeholder="8765"
                placeholderTextColor="#666"
                value={port}
                onChangeText={setPort}
                keyboardType="number-pad"
              />
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSave} style={styles.saveBtn}>
                <Text style={styles.saveBtnText}>Guardar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Confirmación de Eliminación */}
      <Modal visible={!!deleteConfirmId} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>¿Eliminar conexión?</Text>
            <Text style={styles.modalDesc}>
              Esta acción eliminará la computadora de tus conexiones guardadas.
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity onPress={() => setDeleteConfirmId(null)} style={styles.cancelBtn}>
                <Text style={styles.cancelBtnText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmDelete} style={styles.deleteConfirmBtn}>
                <Text style={styles.deleteConfirmBtnText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: Guía de Ayuda e Inicio */}
      <Modal visible={helpVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxHeight: "85%" }]}>
            <Text style={styles.modalTitle}>Guía de Inicio Rápido</Text>
            <Text style={styles.guideStep}>
              <Text style={styles.stepNum}>1. </Text>En tu laptop con Linux, abrí una terminal y ejecutá:{"\n"}
              <Text style={styles.codeText}>cd host && ./run.sh</Text>
            </Text>
            <Text style={styles.guideStep}>
              <Text style={styles.stepNum}>2. Modo WiFi: </Text>Asegurate de que la tablet y la laptop estén en la misma red WiFi e ingresá la IP de tu laptop.
            </Text>
            <Text style={styles.guideStep}>
              <Text style={styles.stepNum}>3. Modo USB: </Text>Activá la Depuración USB en la tablet, conectá el cable y seleccioná el modo USB. ¡Listo!
            </Text>
            <TouchableOpacity onPress={() => setHelpVisible(false)} style={styles.saveBtn}>
              <Text style={styles.saveBtnText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0b0f" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 40,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#17171f",
  },
  title: { color: "#fff", fontSize: 26, fontWeight: "700" },
  subtitle: { color: "#888", fontSize: 13, marginTop: 2 },
  headerActions: { flexDirection: "row", gap: 8, alignItems: "center" },
  helpBtn: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, backgroundColor: "#17171f" },
  helpBtnText: { color: "#999", fontSize: 13, fontWeight: "600" },
  addBtn: { backgroundColor: "#4a90d9", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  addBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  empty: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32 },
  emptyIcon: { fontSize: 44, marginBottom: 12 },
  emptyTitle: { color: "#fff", fontSize: 18, fontWeight: "700", marginBottom: 6 },
  emptyText: { color: "#888", textAlign: "center", fontSize: 14, lineHeight: 22, maxWidth: 360 },
  emptyActionBtn: { marginTop: 16, paddingVertical: 8, paddingHorizontal: 16 },
  emptyActionBtnText: { color: "#4a90d9", fontSize: 14, fontWeight: "600" },

  card: {
    backgroundColor: "#17171f",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2a2a35",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardMain: { flex: 1 },
  cardHeaderRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  dotOnline: { backgroundColor: "#4caf50" },
  dotOffline: { backgroundColor: "#555" },
  onlineTag: { color: "#4caf50", fontSize: 11, fontWeight: "600" },
  cardTitle: { color: "#fff", fontSize: 17, fontWeight: "600" },
  cardSubtitle: { color: "#aaa", fontSize: 13, marginTop: 4 },
  cardFooterText: { color: "#666", fontSize: 11, marginTop: 6 },

  cardActions: { flexDirection: "row", gap: 4, alignItems: "center" },
  iconBtn: { padding: 8 },
  editBtnText: { fontSize: 15 },
  deleteBtnText: { color: "#e05a5a", fontSize: 16, fontWeight: "700" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.7)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#17171f",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#2a2a35",
    padding: 20,
    gap: 14,
  },
  modalTitle: { color: "#fff", fontSize: 20, fontWeight: "700" },
  modalDesc: { color: "#aaa", fontSize: 14, lineHeight: 20 },
  inputGroup: { gap: 6 },
  label: { color: "#aaa", fontSize: 12, fontWeight: "600", textTransform: "uppercase" },
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
  modeRow: { flexDirection: "row", gap: 10 },
  modeBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#0b0b0f",
    borderWidth: 1,
    borderColor: "#2a2a35",
    alignItems: "center",
  },
  modeBtnActive: { borderColor: "#4a90d9", backgroundColor: "#1a2a3a" },
  modeBtnText: { color: "#888", fontWeight: "600", fontSize: 14 },
  modeBtnTextActive: { color: "#fff" },

  modalActions: { flexDirection: "row", gap: 10, marginTop: 6 },
  cancelBtn: { flex: 1, padding: 12, alignItems: "center" },
  cancelBtnText: { color: "#999", fontWeight: "600" },
  saveBtn: {
    flex: 1,
    padding: 12,
    alignItems: "center",
    backgroundColor: "#4a90d9",
    borderRadius: 8,
  },
  saveBtnText: { color: "#fff", fontWeight: "700" },
  deleteConfirmBtn: {
    flex: 1,
    padding: 12,
    alignItems: "center",
    backgroundColor: "#e05a5a",
    borderRadius: 8,
  },
  deleteConfirmBtnText: { color: "#fff", fontWeight: "700" },

  guideStep: { color: "#ccc", fontSize: 14, lineHeight: 22 },
  stepNum: { color: "#4a90d9", fontWeight: "700" },
  codeText: {
    fontFamily: "monospace",
    backgroundColor: "#0b0b0f",
    color: "#4a90d9",
    padding: 4,
    borderRadius: 4,
  },
});
