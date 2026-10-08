import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GardenProvider } from './context/GardenContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { MyGarden } from './pages/MyGarden';
import { PlantDoctor } from './pages/PlantDoctor';
import { WaterPlanner } from './pages/WaterPlanner';
import { GardenJournal } from './pages/GardenJournal';
import { OutdoorMissions } from './pages/OutdoorMissions';
import { Settings } from './pages/Settings';
import { IoTDevices } from './pages/IoTDevices';
import { GardenAI } from './pages/GardenAI';
import { Analytics } from './pages/Analytics';
import { Alerts } from './pages/Alerts';

export function App() {
  return (
    <GardenProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="plants" element={<MyGarden />} />
            <Route path="iot" element={<IoTDevices />} />
            <Route path="ai" element={<GardenAI />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="alerts" element={<Alerts />} />
            <Route path="doctor" element={<PlantDoctor />} />
            <Route path="water" element={<WaterPlanner />} />
            <Route path="journal" element={<GardenJournal />} />
            <Route path="missions" element={<OutdoorMissions />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </GardenProvider>
  );
}

export default App;
