import React, { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import * as ScreenOrientation from "expo-screen-orientation";
import DashboardScreen from "./screens/DashboardScreen";
import SessionScreen from "./screens/SessionScreen";
import { SavedHost } from "./storage";

export default function App() {
  const [activeHost, setActiveHost] = useState<SavedHost | null>(null);

  useEffect(() => {
    // Forzar horizontal: se siente como un monitor real, no como una app de teléfono
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
  }, []);

  return (
    <>
      <StatusBar style="light" />
      {activeHost ? (
        <SessionScreen host={activeHost} onExit={() => setActiveHost(null)} />
      ) : (
        <DashboardScreen onConnect={setActiveHost} />
      )}
    </>
  );
}
