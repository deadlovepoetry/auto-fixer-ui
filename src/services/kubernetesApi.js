import * as k8s from '@kubernetes/client-node';
import yaml from 'yaml';

class KubernetesApiService {
  constructor(kubeConfigPath = null) {
    this.kc = new k8s.KubeConfig();
    
    if (kubeConfigPath) {
      this.kc.loadFromFile(kubeConfigPath);
    } else {
      // Try to load from default locations
      try {
        this.kc.loadFromDefault();
      } catch (error) {
        console.warn('Could not load default kubeconfig, will need manual config');
      }
    }
    
    this.k8sApi = this.kc.makeApiClient(k8s.CoreV1Api);
    this.k8sAppsApi = this.kc.makeApiClient(k8s.AppsV1Api);
    this.k8sBatchApi = this.kc.makeApiClient(k8s.BatchV1Api);
    this.k8sNetworkingApi = this.kc.makeApiClient(k8s.NetworkingV1Api);
    
    this.errorPatterns = [
      /error/i,
      /failed/i,
      /exception/i,
      /panic/i,
      /fatal/i,
      /timeout/i,
      /connection refused/i,
      /out of memory/i,
      /no space left/i,
      /permission denied/i,
      /crashloopbackoff/i,
      /imagepullbackoff/i,
      /evicted/i
    ];
    
    this.monitoringActive = false;
    this.logBuffer = [];
    this.errorDetectedCallback = null;
  }

  // Get all namespaces
  async getNamespaces() {
    try {
      const response = await this.k8sApi.listNamespace();
      return response.body.items.map(ns => ({
        name: ns.metadata.name,
        status: ns.status.phase,
        created: ns.metadata.creationTimestamp
      }));
    } catch (error) {
      console.error('Error fetching namespaces:', error);
      throw new Error(`Failed to fetch namespaces: ${error.message}`);
    }
  }

  // Get pods in a namespace
  async getPods(namespace = 'default') {
    try {
      const response = await this.k8sApi.listNamespacedPod(namespace);
      return response.body.items.map(pod => ({
        name: pod.metadata.name,
        namespace: pod.metadata.namespace,
        status: pod.status.phase,
        containers: pod.spec.containers.map(c => c.name),
        restartCount: pod.status.containerStatuses ? 
          pod.status.containerStatuses.reduce((sum, cs) => sum + cs.restartCount, 0) : 0,
        created: pod.metadata.creationTimestamp,
        node: pod.spec.nodeName
      }));
    } catch (error) {
      console.error('Error fetching pods:', error);
      throw new Error(`Failed to fetch pods: ${error.message}`);
    }
  }

  // Get pod logs
  async getPodLogs(namespace, podName, containerName = null, tailLines = 100) {
    try {
      const logParams = {
        tailLines,
        timestamps: true,
        sinceSeconds: 3600 // Last hour
      };
      
      if (containerName) {
        logParams.container = containerName;
      }

      const response = await this.k8sApi.readNamespacedPodLog(
        podName, 
        namespace, 
        undefined, // pretty
        undefined, // follow
        undefined, // insecureSkipTLSVerifyBackend
        undefined, // limitBytes
        undefined, // previous
        undefined, // sinceSeconds
        tailLines,  // tailLines
        true       // timestamps
      );
      
      return {
        logs: response.body,
        timestamp: new Date().toISOString(),
        source: `${namespace}/${podName}${containerName ? `/${containerName}` : ''}`
      };
    } catch (error) {
      console.error('Error fetching pod logs:', error);
      throw new Error(`Failed to fetch pod logs: ${error.message}`);
    }
  }

  // Detect errors in logs
  detectErrors(logText) {
    const lines = logText.split('\n');
    const errors = [];
    
    lines.forEach((line, index) => {
      this.errorPatterns.forEach(pattern => {
        if (pattern.test(line)) {
          errors.push({
            line: index + 1,
            content: line.trim(),
            timestamp: this.extractTimestamp(line),
            severity: this.determineSeverity(line)
          });
        }
      });
    });
    
    return errors;
  }

  // Extract timestamp from log line
  extractTimestamp(line) {
    const timestampRegex = /(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/;
    const match = line.match(timestampRegex);
    return match ? match[1] : null;
  }

  // Determine error severity
  determineSeverity(line) {
    if (/fatal|panic|crash/i.test(line)) return 'CRITICAL';
    if (/error|exception|failed/i.test(line)) return 'ERROR';
    if (/warning|warn/i.test(line)) return 'WARNING';
    return 'INFO';
  }

  // Start monitoring logs for errors
  async startLogMonitoring(namespaces = ['default'], onErrorDetected = null) {
    this.monitoringActive = true;
    this.errorDetectedCallback = onErrorDetected;
    
    console.log(`Starting log monitoring for namespaces: ${namespaces.join(', ')}`);
    
    while (this.monitoringActive) {
      try {
        for (const namespace of namespaces) {
          const pods = await this.getPods(namespace);
          
          for (const pod of pods) {
            if (pod.status === 'Running' || pod.status === 'Failed') {
              for (const container of pod.containers) {
                try {
                  const logData = await this.getPodLogs(namespace, pod.name, container, 10);
                  const errors = this.detectErrors(logData.logs);
                  
                  if (errors.length > 0) {
                    const errorInfo = {
                      namespace,
                      pod: pod.name,
                      container,
                      errors,
                      logs: logData.logs,
                      timestamp: new Date().toISOString()
                    };
                    
                    console.log(`Errors detected in ${namespace}/${pod.name}/${container}:`, errors.length);
                    
                    if (this.errorDetectedCallback) {
                      await this.errorDetectedCallback(errorInfo);
                    }
                  }
                } catch (logError) {
                  // Continue monitoring other containers even if one fails
                  console.warn(`Failed to get logs for ${namespace}/${pod.name}/${container}:`, logError.message);
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error during log monitoring:', error);
      }
      
      // Wait 30 seconds before next check
      await new Promise(resolve => setTimeout(resolve, 30000));
    }
  }

  // Stop monitoring
  stopLogMonitoring() {
    this.monitoringActive = false;
    console.log('Log monitoring stopped');
  }

  // Apply automated fixes
  async applyAutomatedFix(fixAction) {
    try {
      console.log('Applying automated fix:', fixAction);
      
      switch (fixAction.type) {
        case 'restart_pod':
          return await this.restartPod(fixAction.namespace, fixAction.podName);
        
        case 'scale_deployment':
          return await this.scaleDeployment(fixAction.namespace, fixAction.deploymentName, fixAction.replicas);
        
        case 'update_config':
          return await this.updateConfigMap(fixAction.namespace, fixAction.configMapName, fixAction.data);
        
        case 'apply_manifest':
          return await this.applyManifest(fixAction.manifest);
        
        default:
          throw new Error(`Unknown fix action type: ${fixAction.type}`);
      }
    } catch (error) {
      console.error('Error applying automated fix:', error);
      throw error;
    }
  }

  // Restart pod by deleting it (deployment will recreate)
  async restartPod(namespace, podName) {
    try {
      await this.k8sApi.deleteNamespacedPod(podName, namespace);
      return { success: true, message: `Pod ${podName} deleted and will be recreated` };
    } catch (error) {
      throw new Error(`Failed to restart pod: ${error.message}`);
    }
  }

  // Scale deployment
  async scaleDeployment(namespace, deploymentName, replicas) {
    try {
      const patch = {
        spec: {
          replicas: replicas
        }
      };
      
      await this.k8sAppsApi.patchNamespacedDeploymentScale(
        deploymentName, 
        namespace, 
        patch,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        { headers: { 'Content-Type': 'application/merge-patch+json' } }
      );
      
      return { success: true, message: `Deployment ${deploymentName} scaled to ${replicas} replicas` };
    } catch (error) {
      throw new Error(`Failed to scale deployment: ${error.message}`);
    }
  }

  // Update ConfigMap
  async updateConfigMap(namespace, configMapName, newData) {
    try {
      const patch = {
        data: newData
      };
      
      await this.k8sApi.patchNamespacedConfigMap(
        configMapName,
        namespace,
        patch,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        { headers: { 'Content-Type': 'application/merge-patch+json' } }
      );
      
      return { success: true, message: `ConfigMap ${configMapName} updated` };
    } catch (error) {
      throw new Error(`Failed to update ConfigMap: ${error.message}`);
    }
  }

  // Apply YAML manifest
  async applyManifest(manifestYaml) {
    try {
      const docs = yaml.parseAllDocuments(manifestYaml);
      const results = [];
      
      for (const doc of docs) {
        const resource = doc.toJS();
        const { kind, metadata } = resource;
        
        // Apply different resource types
        switch (kind) {
          case 'Deployment':
            await this.k8sAppsApi.createNamespacedDeployment(metadata.namespace, resource);
            break;
          case 'Service':
            await this.k8sApi.createNamespacedService(metadata.namespace, resource);
            break;
          case 'ConfigMap':
            await this.k8sApi.createNamespacedConfigMap(metadata.namespace, resource);
            break;
          default:
            console.warn(`Unsupported resource kind: ${kind}`);
        }
        
        results.push({ kind, name: metadata.name, namespace: metadata.namespace });
      }
      
      return { success: true, message: `Applied ${results.length} resources`, resources: results };
    } catch (error) {
      throw new Error(`Failed to apply manifest: ${error.message}`);
    }
  }

  // Get cluster events
  async getClusterEvents(namespace = null) {
    try {
      let response;
      if (namespace) {
        response = await this.k8sApi.listNamespacedEvent(namespace);
      } else {
        response = await this.k8sApi.listEventForAllNamespaces();
      }
      
      return response.body.items
        .filter(event => event.type === 'Warning' || event.type === 'Error')
        .map(event => ({
          namespace: event.namespace,
          reason: event.reason,
          message: event.message,
          type: event.type,
          object: `${event.involvedObject.kind}/${event.involvedObject.name}`,
          timestamp: event.firstTimestamp || event.eventTime,
          count: event.count
        }))
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    } catch (error) {
      console.error('Error fetching cluster events:', error);
      throw new Error(`Failed to fetch cluster events: ${error.message}`);
    }
  }
}

export default KubernetesApiService;