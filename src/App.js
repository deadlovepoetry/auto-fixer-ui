import React, { useState } from 'react';
import './App.css';
import KubeLogs from './components/KubeLogs';
import VercelLogs from './components/VercelLogs';
import AiFixer from './components/AiFixer';

function App() {
  // Shared state
  const [currentLogs, setCurrentLogs] = useState('');
  const [detectedErrors, setDetectedErrors] = useState([]);
  const [activeService, setActiveService] = useState('kubernetes'); // 'kubernetes' or 'vercel'
  const [kubernetesService, setKubernetesService] = useState(null);
  const [errorContext, setErrorContext] = useState(null);

  // Handle logs changes from either service
  const handleLogsChange = (logs, context = null) => {
    setCurrentLogs(logs);
    setErrorContext(context);
  };

  // Handle errors detected
  const handleErrorsDetected = (errors, context = null) => {
    setDetectedErrors(errors);
    setErrorContext(context);
    
    // If errors detected, automatically populate the AI fixer
    if (errors && errors.length > 0) {
      const errorText = errors.map(e => e.content).join('\n');
      setCurrentLogs(errorText);
    }
  };

  // Handle fix generation from AiFixer
  const handleFixGenerated = (fixData) => {
    console.log('Fix generated:', fixData);
    // Can be used for additional processing or notifications
  };

  // Handle Kubernetes service initialization
  const handleKubernetesServiceInit = (service) => {
    setKubernetesService(service);
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>🚀 Kubernetes & Cloud Log Monitor</h1>
        <p>Automated log monitoring, error detection, and AI-powered fixes</p>
        
        {/* Service Selector */}
        <div className="service-selector">
          <button 
            className={activeService === 'kubernetes' ? 'active' : ''}
            onClick={() => setActiveService('kubernetes')}
          >
            🐳 Kubernetes
          </button>
          <button 
            className={activeService === 'vercel' ? 'active' : ''}
            onClick={() => setActiveService('vercel')}
          >
            ▲ Vercel
          </button>
        </div>
      </header>

      <main className="app-main">
        {/* Status Dashboard */}
        <div className="status-dashboard">
          <div className="status-card">
            <h3>📊 Status</h3>
            <div className="status-grid">
              <div className="status-item">
                <span className="status-label">Active Service:</span>
                <span className="status-value">{activeService === 'kubernetes' ? '🐳 Kubernetes' : '▲ Vercel'}</span>
              </div>
              <div className="status-item">
                <span className="status-label">Detected Errors:</span>
                <span className={`status-value ${detectedErrors.length > 0 ? 'error' : 'success'}`}>
                  {detectedErrors.length}
                </span>
              </div>
              <div className="status-item">
                <span className="status-label">Connection:</span>
                <span className={`status-value ${kubernetesService ? 'success' : 'warning'}`}>
                  {kubernetesService ? '✅ Connected' : '⚠️ Not Connected'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Service Components */}
        <div className="service-container">
          {activeService === 'kubernetes' ? (
            <KubeLogs 
              onLogsChange={handleLogsChange}
              onErrorsDetected={handleErrorsDetected}
              onServiceInit={handleKubernetesServiceInit}
            />
          ) : (
            <VercelLogs 
              onLogsChange={handleLogsChange}
              onErrorsDetected={handleErrorsDetected}
            />
          )}
        </div>

        {/* AI Fixer Component */}
        <div className="ai-fixer-container">
          <AiFixer 
            inputLogs={currentLogs}
            onFixGenerated={handleFixGenerated}
            kubernetesService={kubernetesService}
            errorContext={errorContext}
          />
        </div>
      </main>

      <footer className="app-footer">
        <div className="footer-content">
          <div className="footer-section">
            <h4>🔧 Features</h4>
            <ul>
              <li>Real-time log monitoring</li>
              <li>Automated error detection</li>
              <li>AI-powered diagnostics</li>
              <li>One-click remediation</li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>🐳 Kubernetes Support</h4>
            <ul>
              <li>Multi-namespace monitoring</li>
              <li>Pod restart automation</li>
              <li>Deployment scaling</li>
              <li>Configuration updates</li>
            </ul>
          </div>
          <div className="footer-section">
            <h4>🤖 AI Capabilities</h4>
            <ul>
              <li>Root cause analysis</li>
              <li>Fix recommendations</li>
              <li>YAML generation</li>
              <li>Best practices</li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <p>Built with ❤️ for DevOps teams. Powered by AI and Kubernetes.</p>
        </div>
      </footer>
    </div>
  );
}

export default App;

