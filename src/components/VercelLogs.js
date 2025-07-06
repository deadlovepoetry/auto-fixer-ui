import React, { useState, useEffect } from 'react';
import VercelApiService from '../services/vercelApi';
import './VercelLogs.css';

const VercelLogs = () => {
  const [apiToken, setApiToken] = useState('');
  const [teamId, setTeamId] = useState('');
  const [projects, setProjects] = useState([]);
  const [selectedProject, setSelectedProject] = useState('');
  const [deployments, setDeployments] = useState([]);
  const [selectedDeployment, setSelectedDeployment] = useState('');
  const [deploymentLogs, setDeploymentLogs] = useState([]);
  const [errorLogs, setErrorLogs] = useState([]);
  const [buildLogs, setBuildLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('deployment');
  const [vercelService, setVercelService] = useState(null);

  // Initialize Vercel service when token changes
  useEffect(() => {
    if (apiToken) {
      const service = new VercelApiService(apiToken, teamId || null);
      setVercelService(service);
    }
  }, [apiToken, teamId]);

  const handleFetchProjects = async () => {
    if (!vercelService) {
      setError('Please enter your Vercel API token first');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const projectsData = await vercelService.getProjects();
      setProjects(projectsData.projects || []);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleFetchDeployments = async () => {
    if (!selectedProject) {
      setError('Please select a project first');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const deploymentsData = await vercelService.getDeployments(selectedProject);
      setDeployments(deploymentsData.deployments || []);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const handleFetchLogs = async () => {
    if (!selectedDeployment) {
      setError('Please select a deployment first');
      return;
    }

    setLoading(true);
    setError('');
    try {
      // Fetch deployment logs
      const deploymentLogsData = await vercelService.getDeploymentLogs(selectedDeployment);
      setDeploymentLogs(deploymentLogsData || []);

      // Fetch function logs (including error logs)
      const functionLogsData = await vercelService.getFunctionLogs(selectedDeployment);
      setErrorLogs(functionLogsData.errorLogs || []);

      // Fetch build logs
      const buildLogsData = await vercelService.getBuildLogs(selectedDeployment);
      setBuildLogs(buildLogsData || []);
    } catch (err) {
      setError(err.message);
    }
    setLoading(false);
  };

  const formatTimestamp = (timestamp) => {
    return new Date(timestamp).toLocaleString();
  };

  const renderLogEntry = (log, index) => (
    <div key={index} className="log-entry">
      <div className="log-header">
        <span className="log-type">{log.type}</span>
        <span className="log-timestamp">{formatTimestamp(log.created)}</span>
      </div>
      <div className="log-content">
        {log.payload?.text || log.text || JSON.stringify(log, null, 2)}
      </div>
    </div>
  );

  return (
    <div className="vercel-logs">
      <div className="header">
        <h1>Vercel Logs Dashboard</h1>
        <p>Fetch deployment logs and error logs from your Vercel projects</p>
      </div>

      {/* API Configuration */}
      <div className="config-section">
        <h2>Configuration</h2>
        <div className="config-form">
          <div className="form-group">
            <label>Vercel API Token:</label>
            <input
              type="password"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              placeholder="Enter your Vercel API token"
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label>Team ID (optional):</label>
            <input
              type="text"
              value={teamId}
              onChange={(e) => setTeamId(e.target.value)}
              placeholder="Enter team ID (leave empty for personal account)"
              className="form-input"
            />
          </div>
          <button onClick={handleFetchProjects} disabled={!apiToken || loading} className="btn btn-primary">
            Fetch Projects
          </button>
        </div>
      </div>

      {/* Project Selection */}
      {projects.length > 0 && (
        <div className="selection-section">
          <h2>Select Project</h2>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="form-select"
          >
            <option value="">Select a project...</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name} ({project.id})
              </option>
            ))}
          </select>
          <button onClick={handleFetchDeployments} disabled={!selectedProject || loading} className="btn btn-secondary">
            Fetch Deployments
          </button>
        </div>
      )}

      {/* Deployment Selection */}
      {deployments.length > 0 && (
        <div className="selection-section">
          <h2>Select Deployment</h2>
          <select
            value={selectedDeployment}
            onChange={(e) => setSelectedDeployment(e.target.value)}
            className="form-select"
          >
            <option value="">Select a deployment...</option>
            {deployments.map((deployment) => (
              <option key={deployment.uid} value={deployment.uid}>
                {deployment.url} - {deployment.state} ({formatTimestamp(deployment.created)})
              </option>
            ))}
          </select>
          <button onClick={handleFetchLogs} disabled={!selectedDeployment || loading} className="btn btn-secondary">
            Fetch Logs
          </button>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* Loading Indicator */}
      {loading && (
        <div className="loading">
          <div className="spinner"></div>
          <span>Loading...</span>
        </div>
      )}

      {/* Logs Display */}
      {(deploymentLogs.length > 0 || errorLogs.length > 0 || buildLogs.length > 0) && (
        <div className="logs-section">
          <h2>Logs</h2>
          
          {/* Tabs */}
          <div className="tabs">
            <button
              className={`tab ${activeTab === 'deployment' ? 'active' : ''}`}
              onClick={() => setActiveTab('deployment')}
            >
              Deployment Logs ({deploymentLogs.length})
            </button>
            <button
              className={`tab ${activeTab === 'error' ? 'active' : ''}`}
              onClick={() => setActiveTab('error')}
            >
              Error Logs ({errorLogs.length})
            </button>
            <button
              className={`tab ${activeTab === 'build' ? 'active' : ''}`}
              onClick={() => setActiveTab('build')}
            >
              Build Logs ({buildLogs.length})
            </button>
          </div>

          {/* Tab Content */}
          <div className="tab-content">
            {activeTab === 'deployment' && (
              <div className="logs-container">
                {deploymentLogs.length === 0 ? (
                  <p>No deployment logs found.</p>
                ) : (
                  deploymentLogs.map((log, index) => renderLogEntry(log, index))
                )}
              </div>
            )}

            {activeTab === 'error' && (
              <div className="logs-container">
                {errorLogs.length === 0 ? (
                  <p>No error logs found.</p>
                ) : (
                  errorLogs.map((log, index) => renderLogEntry(log, index))
                )}
              </div>
            )}

            {activeTab === 'build' && (
              <div className="logs-container">
                {buildLogs.length === 0 ? (
                  <p>No build logs found.</p>
                ) : (
                  buildLogs.map((log, index) => renderLogEntry(log, index))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VercelLogs;
