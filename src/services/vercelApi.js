import axios from 'axios';

const VERCEL_API_BASE = 'https://api.vercel.com';

class VercelApiService {
  constructor(token, teamId = null) {
    this.token = token;
    this.teamId = teamId;
    this.client = axios.create({
      baseURL: VERCEL_API_BASE,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });
  }

  // Get all deployments for a project
  async getDeployments(projectId, limit = 20) {
    try {
      const params = { limit };
      if (this.teamId) {
        params.teamId = this.teamId;
      }

      const response = await this.client.get(`/v6/deployments`, {
        params: {
          ...params,
          projectId,
        },
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching deployments:', error);
      throw new Error(`Failed to fetch deployments: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Get deployment logs
  async getDeploymentLogs(deploymentId) {
    try {
      const params = {};
      if (this.teamId) {
        params.teamId = this.teamId;
      }

      const response = await this.client.get(`/v2/deployments/${deploymentId}/events`, {
        params,
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching deployment logs:', error);
      throw new Error(`Failed to fetch deployment logs: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Get function logs (runtime logs that might contain errors)
  async getFunctionLogs(deploymentId, functionPath = null, since = null, until = null) {
    try {
      const params = {};
      if (this.teamId) {
        params.teamId = this.teamId;
      }
      if (functionPath) {
        params.functionPath = functionPath;
      }
      if (since) {
        params.since = since;
      }
      if (until) {
        params.until = until;
      }

      const response = await this.client.get(`/v2/deployments/${deploymentId}/events`, {
        params,
      });
      
      // Filter for error logs
      const logs = response.data;
      const errorLogs = logs.filter(log => 
        log.type === 'stderr' || 
        log.type === 'error' ||
        (log.payload && log.payload.text && log.payload.text.toLowerCase().includes('error'))
      );
      
      return {
        allLogs: logs,
        errorLogs: errorLogs,
      };
    } catch (error) {
      console.error('Error fetching function logs:', error);
      throw new Error(`Failed to fetch function logs: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Get projects list
  async getProjects(limit = 20) {
    try {
      const params = { limit };
      if (this.teamId) {
        params.teamId = this.teamId;
      }

      const response = await this.client.get('/v9/projects', {
        params,
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching projects:', error);
      throw new Error(`Failed to fetch projects: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Get deployment details
  async getDeploymentDetails(deploymentId) {
    try {
      const params = {};
      if (this.teamId) {
        params.teamId = this.teamId;
      }

      const response = await this.client.get(`/v13/deployments/${deploymentId}`, {
        params,
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching deployment details:', error);
      throw new Error(`Failed to fetch deployment details: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  // Get build logs (can contain build errors)
  async getBuildLogs(deploymentId) {
    try {
      const deploymentLogs = await this.getDeploymentLogs(deploymentId);
      
      // Filter for build-related logs
      const buildLogs = deploymentLogs.filter(log => 
        log.type === 'command' || 
        log.type === 'build-error' ||
        log.type === 'build-warning' ||
        (log.payload && log.payload.text && 
         (log.payload.text.includes('npm') || 
          log.payload.text.includes('build') ||
          log.payload.text.includes('compile')))
      );
      
      return buildLogs;
    } catch (error) {
      console.error('Error fetching build logs:', error);
      throw new Error(`Failed to fetch build logs: ${error.response?.data?.error?.message || error.message}`);
    }
  }
}

export default VercelApiService;
