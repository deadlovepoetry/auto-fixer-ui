import React, { useState, useEffect, useRef } from 'react';
import KubernetesApiService from '../services/kubernetesApi';
import './KubeLogs.css';

function KubeLogs({ onLogsChange, onErrorsDetected, onServiceInit }) {
  // State management
  const [kubeConfig, setKubeConfig] = useState('');
  const [kubeService, setKubeService] = useState(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Cluster data
  const [namespaces, setNamespaces] = useState([]);
  const [selectedNamespace, setSelectedNamespace] = useState('default');
  const [pods, setPods] = useState([]);
  const [selectedPod, setSelectedPod] = useState('');
  const [selectedContainer, setSelectedContainer] = useState('');
  
  // Monitoring
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [monitoringNamespaces, setMonitoringNamespaces] = useState(['default']);
  const [autoFixEnabled, setAutoFixEnabled] = useState(false);
  
  // Logs and events
  const [logs, setLogs] = useState('');
  const [clusterEvents, setClusterEvents] = useState([]);
  const [detectedErrors, setDetectedErrors] = useState([]);
  const [appliedFixes, setAppliedFixes] = useState([]);
  
  // UI state
  const [activeTab, setActiveTab] = useState('logs');
  const [refreshInterval, setRefreshInterval] = useState(30);
  
  const fileInputRef = useRef(null);

  // Initialize Kubernetes service
  const initializeKubeService = async () => {
    try {
      setLoading(true);
      const service = new KubernetesApiService();
      
      // Test connection
      await service.getNamespaces();
      
      setKubeService(service);
      setConnected(true);
      
      // Notify parent component
      if (onServiceInit) {
        onServiceInit(service);
      }
      
      // Fetch initial data
      await fetchNamespaces(service);
      await fetchClusterEvents(service);
      
    } catch (error) {
      console.error('Failed to initialize Kubernetes service:', error);
      alert(`Failed to connect to Kubernetes: ${error.message}`);
      setConnected(false);
    } finally {
      setLoading(false);
    }
  };

  // Handle kubeconfig file upload
  const handleKubeConfigUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setKubeConfig(e.target.result);
      };
      reader.readAsText(file);
    }
  };

  // Fetch namespaces
  const fetchNamespaces = async (service = kubeService) => {
    try {
      setLoading(true);
      const namespacesData = await service.getNamespaces();
      setNamespaces(namespacesData);
    } catch (error) {
      console.error('Error fetching namespaces:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch pods for selected namespace
  const fetchPods = async () => {
    if (!kubeService || !selectedNamespace) return;
    
    try {
      setLoading(true);
      const podsData = await kubeService.getPods(selectedNamespace);
      setPods(podsData);
      setSelectedPod('');
      setSelectedContainer('');
    } catch (error) {
      console.error('Error fetching pods:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch logs for selected pod/container
  const fetchLogs = async () => {
    if (!kubeService || !selectedNamespace || !selectedPod) return;
    
    try {
      setLoading(true);
      const logData = await kubeService.getPodLogs(
        selectedNamespace, 
        selectedPod, 
        selectedContainer || null,
        200
      );
      
      setLogs(logData.logs);
      
      // Detect errors in logs
      const errors = kubeService.detectErrors(logData.logs);
      setDetectedErrors(errors);
      
      // Callback to parent component
      if (onLogsChange) {
        onLogsChange(logData.logs);
      }
      
      if (onErrorsDetected && errors.length > 0) {
        onErrorsDetected(errors);
      }
      
    } catch (error) {
      console.error('Error fetching logs:', error);
      setLogs(`Error fetching logs: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch cluster events
  const fetchClusterEvents = async (service = kubeService) => {
    if (!service) return;
    
    try {
      const events = await service.getClusterEvents();
      setClusterEvents(events.slice(0, 50)); // Show latest 50 events
    } catch (error) {
      console.error('Error fetching cluster events:', error);
    }
  };

  // Start monitoring
  const startMonitoring = async () => {
    if (!kubeService) return;
    
    setIsMonitoring(true);
    
    try {
      await kubeService.startLogMonitoring(
        monitoringNamespaces,
        async (errorInfo) => {
          console.log('Error detected during monitoring:', errorInfo);
          
          // Add to detected errors
          setDetectedErrors(prev => [...prev, ...errorInfo.errors]);
          
          // If auto-fix is enabled, attempt to fix
          if (autoFixEnabled) {
            await attemptAutoFix(errorInfo);
          }
          
          // Callback to parent
          if (onErrorsDetected) {
            onErrorsDetected(errorInfo.errors);
          }
        }
      );
    } catch (error) {
      console.error('Error starting monitoring:', error);
      setIsMonitoring(false);
    }
  };

  // Stop monitoring
  const stopMonitoring = () => {
    if (kubeService) {
      kubeService.stopLogMonitoring();
    }
    setIsMonitoring(false);
  };

  // Attempt automatic fix based on error patterns
  const attemptAutoFix = async (errorInfo) => {
    try {
      let fixAction = null;
      
      // Analyze errors and determine fix strategy
      const errorTexts = errorInfo.errors.map(e => e.content.toLowerCase());
      
      if (errorTexts.some(text => text.includes('crashloopbackoff') || text.includes('exit code'))) {
        fixAction = {
          type: 'restart_pod',
          namespace: errorInfo.namespace,
          podName: errorInfo.pod,
          reason: 'Detected CrashLoopBackOff or exit errors'
        };
      } else if (errorTexts.some(text => text.includes('out of memory') || text.includes('oom'))) {
        // This would require deployment modification - for now just log
        console.log('OOM detected - would scale deployment if deployment name was available');
        return;
      } else if (errorTexts.some(text => text.includes('connection refused') || text.includes('timeout'))) {
        fixAction = {
          type: 'restart_pod',
          namespace: errorInfo.namespace,
          podName: errorInfo.pod,
          reason: 'Detected connection issues'
        };
      }
      
      if (fixAction) {
        console.log('Attempting auto-fix:', fixAction);
        const result = await kubeService.applyAutomatedFix(fixAction);
        
        setAppliedFixes(prev => [...prev, {
          timestamp: new Date().toISOString(),
          action: fixAction,
          result: result,
          errorInfo: errorInfo
        }]);
        
        console.log('Auto-fix applied:', result);
      }
      
    } catch (error) {
      console.error('Error applying auto-fix:', error);
    }
  };

  // Manual restart pod
  const restartPod = async (namespace, podName) => {
    if (!kubeService) return;
    
    try {
      const result = await kubeService.restartPod(namespace, podName);
      alert(result.message);
      await fetchPods(); // Refresh pods list
    } catch (error) {
      alert(`Failed to restart pod: ${error.message}`);
    }
  };

  // Effect hooks
  useEffect(() => {
    if (selectedNamespace) {
      fetchPods();
    }
  }, [selectedNamespace]);

  useEffect(() => {
    // Auto-refresh cluster events
    const interval = setInterval(() => {
      if (connected && kubeService) {
        fetchClusterEvents();
      }
    }, refreshInterval * 1000);
    
    return () => clearInterval(interval);
  }, [connected, kubeService, refreshInterval]);

  // Component cleanup
  useEffect(() => {
    return () => {
      if (isMonitoring && kubeService) {
        kubeService.stopLogMonitoring();
      }
    };
  }, []);

  return (
    <div className="kube-logs-container">
      <h1>🚀 Kubernetes Log Monitor & Auto-Fixer</h1>
      
      {/* Connection Section */}
      <div className="connection-section">
        <h2>📡 Cluster Connection</h2>
        
        <div className="connection-controls">
          <div className="config-upload">
            <label>Upload kubeconfig (optional):</label>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleKubeConfigUpload}
              accept=".yaml,.yml,.txt"
            />
          </div>
          
          <button 
            onClick={initializeKubeService}
            disabled={loading}
            className={`connect-btn ${connected ? 'connected' : ''}`}
          >
            {loading ? 'Connecting...' : connected ? '✅ Connected' : '🔌 Connect to Cluster'}
          </button>
          
          <div className="connection-status">
            Status: <span className={connected ? 'status-connected' : 'status-disconnected'}>
              {connected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {connected && (
        <>
          {/* Control Panel */}
          <div className="control-panel">
            <h2>⚙️ Control Panel</h2>
            
            <div className="controls-grid">
              <div className="control-group">
                <label>Namespace:</label>
                <select 
                  value={selectedNamespace} 
                  onChange={(e) => setSelectedNamespace(e.target.value)}
                >
                  {namespaces.map(ns => (
                    <option key={ns.name} value={ns.name}>{ns.name}</option>
                  ))}
                </select>
              </div>
              
              <div className="control-group">
                <label>Pod:</label>
                <select 
                  value={selectedPod} 
                  onChange={(e) => setSelectedPod(e.target.value)}
                  disabled={!pods.length}
                >
                  <option value="">Select a pod...</option>
                  {pods.map(pod => (
                    <option key={pod.name} value={pod.name}>
                      {pod.name} ({pod.status})
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="control-group">
                <label>Container (optional):</label>
                <select 
                  value={selectedContainer} 
                  onChange={(e) => setSelectedContainer(e.target.value)}
                  disabled={!selectedPod}
                >
                  <option value="">All containers</option>
                  {selectedPod && pods.find(p => p.name === selectedPod)?.containers.map(container => (
                    <option key={container} value={container}>{container}</option>
                  ))}
                </select>
              </div>
              
              <div className="control-group">
                <button onClick={fetchLogs} disabled={!selectedPod || loading}>
                  📋 Fetch Logs
                </button>
              </div>
            </div>
          </div>

          {/* Monitoring Controls */}
          <div className="monitoring-section">
            <h2>🔍 Automated Monitoring</h2>
            
            <div className="monitoring-controls">
              <div className="monitoring-config">
                <label>
                  <input
                    type="checkbox"
                    checked={autoFixEnabled}
                    onChange={(e) => setAutoFixEnabled(e.target.checked)}
                  />
                  Enable Auto-Fix
                </label>
                
                <label>
                  Refresh Interval:
                  <select 
                    value={refreshInterval} 
                    onChange={(e) => setRefreshInterval(Number(e.target.value))}
                  >
                    <option value={15}>15 seconds</option>
                    <option value={30}>30 seconds</option>
                    <option value={60}>1 minute</option>
                    <option value={300}>5 minutes</option>
                  </select>
                </label>
              </div>
              
              <div className="monitoring-actions">
                {!isMonitoring ? (
                  <button onClick={startMonitoring} className="start-monitoring">
                    ▶️ Start Monitoring
                  </button>
                ) : (
                  <button onClick={stopMonitoring} className="stop-monitoring">
                    ⏹️ Stop Monitoring
                  </button>
                )}
                
                <span className="monitoring-status">
                  {isMonitoring ? '🟢 Monitoring Active' : '🔴 Monitoring Stopped'}
                </span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs-section">
            <div className="tabs">
              <button 
                className={activeTab === 'logs' ? 'active' : ''}
                onClick={() => setActiveTab('logs')}
              >
                📋 Pod Logs
              </button>
              <button 
                className={activeTab === 'events' ? 'active' : ''}
                onClick={() => setActiveTab('events')}
              >
                ⚠️ Cluster Events
              </button>
              <button 
                className={activeTab === 'errors' ? 'active' : ''}
                onClick={() => setActiveTab('errors')}
              >
                🚨 Detected Errors ({detectedErrors.length})
              </button>
              <button 
                className={activeTab === 'fixes' ? 'active' : ''}
                onClick={() => setActiveTab('fixes')}
              >
                🔧 Applied Fixes ({appliedFixes.length})
              </button>
              <button 
                className={activeTab === 'pods' ? 'active' : ''}
                onClick={() => setActiveTab('pods')}
              >
                🐳 Pods Overview
              </button>
            </div>

            {/* Tab Content */}
            <div className="tab-content">
              {activeTab === 'logs' && (
                <div className="logs-display">
                  <h3>Pod Logs</h3>
                  {selectedPod ? (
                    <pre className="log-content">{logs || 'No logs available'}</pre>
                  ) : (
                    <p>Select a pod to view logs</p>
                  )}
                </div>
              )}

              {activeTab === 'events' && (
                <div className="events-display">
                  <h3>Cluster Events</h3>
                  <div className="events-list">
                    {clusterEvents.map((event, index) => (
                      <div key={index} className={`event-item event-${event.type.toLowerCase()}`}>
                        <div className="event-header">
                          <span className="event-type">{event.type}</span>
                          <span className="event-time">{new Date(event.timestamp).toLocaleString()}</span>
                        </div>
                        <div className="event-object">{event.object} in {event.namespace}</div>
                        <div className="event-reason">{event.reason}</div>
                        <div className="event-message">{event.message}</div>
                        {event.count > 1 && <div className="event-count">Count: {event.count}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'errors' && (
                <div className="errors-display">
                  <h3>Detected Errors</h3>
                  <div className="errors-list">
                    {detectedErrors.map((error, index) => (
                      <div key={index} className={`error-item severity-${error.severity.toLowerCase()}`}>
                        <div className="error-header">
                          <span className="error-severity">{error.severity}</span>
                          <span className="error-line">Line {error.line}</span>
                          {error.timestamp && <span className="error-time">{error.timestamp}</span>}
                        </div>
                        <div className="error-content">{error.content}</div>
                      </div>
                    ))}
                    {detectedErrors.length === 0 && <p>No errors detected</p>}
                  </div>
                </div>
              )}

              {activeTab === 'fixes' && (
                <div className="fixes-display">
                  <h3>Applied Fixes</h3>
                  <div className="fixes-list">
                    {appliedFixes.map((fix, index) => (
                      <div key={index} className="fix-item">
                        <div className="fix-header">
                          <span className="fix-time">{new Date(fix.timestamp).toLocaleString()}</span>
                          <span className="fix-type">{fix.action.type}</span>
                        </div>
                        <div className="fix-reason">{fix.action.reason}</div>
                        <div className="fix-result">{fix.result.message}</div>
                        <div className="fix-target">
                          Target: {fix.action.namespace}/{fix.action.podName || fix.action.deploymentName}
                        </div>
                      </div>
                    ))}
                    {appliedFixes.length === 0 && <p>No fixes applied yet</p>}
                  </div>
                </div>
              )}

              {activeTab === 'pods' && (
                <div className="pods-display">
                  <h3>Pods in {selectedNamespace}</h3>
                  <div className="pods-grid">
                    {pods.map((pod) => (
                      <div key={pod.name} className={`pod-card pod-${pod.status.toLowerCase()}`}>
                        <div className="pod-header">
                          <h4>{pod.name}</h4>
                          <span className="pod-status">{pod.status}</span>
                        </div>
                        <div className="pod-details">
                          <div>Restarts: {pod.restartCount}</div>
                          <div>Node: {pod.node}</div>
                          <div>Containers: {pod.containers.join(', ')}</div>
                          <div>Created: {new Date(pod.created).toLocaleString()}</div>
                        </div>
                        <div className="pod-actions">
                          <button 
                            onClick={() => restartPod(pod.namespace, pod.name)}
                            className="restart-btn"
                          >
                            🔄 Restart
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default KubeLogs;