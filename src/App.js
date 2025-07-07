import React, { useState } from 'react';
import VercelLogs from './components/VercelLogs';
import AiFixer from './components/AiFixer';
import './App.css';

function App() {
  const [logs, setLogs] = useState(""); // Shared log state

  return (
    <div className="App">
      <h1>AutoFixer Dashboard</h1>

      {/* VercelLogs fetches logs and sets them here */}
      <VercelLogs onLogsFetched={setLogs} />

      {/* AiFixer uses those logs */}
      <AiFixer inputLogs={logs} />
    </div>
  );
}

export default App;

