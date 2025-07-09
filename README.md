# Kubernetes Log Monitor & Auto-Fixer

🚀 **An intelligent Kubernetes monitoring application that automatically detects errors, analyzes them with AI, and applies fixes autonomously.**

![Kubernetes](https://img.shields.io/badge/kubernetes-%23326ce5.svg?style=for-the-badge&logo=kubernetes&logoColor=white)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB)
![AI](https://img.shields.io/badge/AI-powered-brightgreen?style=for-the-badge)

## 🌟 Features

### 🐳 Kubernetes Monitoring
- **Real-time log monitoring** across multiple namespaces
- **Automated error detection** with pattern matching
- **Cluster events monitoring** for system-wide issues
- **Pod management** with restart capabilities
- **Multi-container support** within pods

### 🤖 AI-Powered Analysis
- **Intelligent error analysis** using advanced AI models
- **Root cause identification** with detailed explanations
- **Automated fix suggestions** with confidence levels
- **YAML manifest generation** for configuration fixes
- **Best practice recommendations** for prevention

### ⚡ Automated Remediation
- **Pod restart automation** for crashed containers
- **Deployment scaling** for resource issues
- **Configuration updates** via ConfigMaps
- **YAML manifest application** for infrastructure fixes
- **Safety mechanisms** with confidence-based execution

### 📊 Comprehensive Dashboard
- **Multi-service support** (Kubernetes + Vercel)
- **Tabbed interface** for different log types
- **Real-time status monitoring** with visual indicators
- **Error tracking** with severity classification
- **Fix history** with applied remediation logs

## 🚀 Quick Start

### Prerequisites

- Node.js 14 or higher
- npm or yarn
- Kubernetes cluster access
- Kubectl configured
- AI API key (Groq/OpenAI)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd kube-log-auto-fixer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Create .env file in root directory
   REACT_APP_GROQ_API_KEY=your_groq_api_key_here
   ```

4. **Start the application**
   ```bash
   npm start
   ```

5. **Open in browser**
   ```
   http://localhost:3000
   ```

## 🔧 Configuration

### Kubernetes Setup

The application automatically tries to load your kubeconfig from:
- `~/.kube/config` (default location)
- `KUBECONFIG` environment variable
- In-cluster configuration (when running in a pod)

You can also upload a custom kubeconfig file through the UI.

### AI Configuration

Get your AI API key from [Groq](https://groq.com/) and add it to your `.env` file:

```env
REACT_APP_GROQ_API_KEY=gsk_your_api_key_here
```

## 📖 Usage Guide

### 1. Connect to Kubernetes

1. Click **"Connect to Cluster"** button
2. Upload kubeconfig file (optional)
3. Verify connection status

### 2. Monitor Logs

1. Select namespace from dropdown
2. Choose pod and container
3. Click **"Fetch Logs"** to view current logs
4. Review detected errors in the **"Detected Errors"** tab

### 3. Start Automated Monitoring

1. Enable **"Auto-Fix"** if desired
2. Set refresh interval (15s - 5min)
3. Click **"Start Monitoring"**
4. Monitor real-time status and fixes

### 4. AI Analysis & Fixes

1. Errors are automatically sent to AI for analysis
2. Review suggested fixes with confidence levels
3. Apply fixes manually or enable auto-apply
4. Monitor results in **"Applied Fixes"** tab

## 🎯 AI Fix Types

### 🔄 Pod Restart
- **Triggers**: CrashLoopBackOff, exit code errors
- **Action**: Deletes pod for recreation by deployment
- **Confidence**: High

### 📈 Deployment Scaling
- **Triggers**: Resource pressure, high load
- **Action**: Scales deployment replicas
- **Confidence**: Medium

### ⚙️ Configuration Update
- **Triggers**: Configuration errors, environment issues
- **Action**: Updates ConfigMaps and environment variables
- **Confidence**: Low (requires review)

### 📄 YAML Application
- **Triggers**: Infrastructure configuration needs
- **Action**: Applies AI-generated Kubernetes manifests
- **Confidence**: Medium

## 🔍 Error Detection Patterns

The system automatically detects these error patterns:

- `error`, `failed`, `exception`
- `panic`, `fatal`, `timeout`
- `connection refused`, `out of memory`
- `no space left`, `permission denied`
- `crashloopbackoff`, `imagepullbackoff`
- `evicted`, `oom killed`

## 🛡️ Safety Features

### Confidence-Based Execution
- **High confidence**: Auto-applied (if enabled)
- **Medium confidence**: Manual approval required
- **Low confidence**: Review recommended

### Audit Trail
- All actions logged with timestamps
- Fix reasoning and results tracked
- Rollback information provided

### Scope Limitations
- Namespace-based isolation
- Read-only cluster events access
- Non-destructive operations prioritized

## 🔧 Advanced Configuration

### Custom Error Patterns

Edit `src/services/kubernetesApi.js` to add custom error patterns:

```javascript
this.errorPatterns = [
  /your-custom-pattern/i,
  // ... existing patterns
];
```

### AI Prompt Customization

Modify the AI prompt in `src/components/AiFixer.js`:

```javascript
const systemPrompt = `
Your custom system prompt for specific use cases...
`;
```

## 🎛️ API Reference

### Kubernetes Service

```javascript
import KubernetesApiService from './services/kubernetesApi';

const service = new KubernetesApiService();

// Get namespaces
const namespaces = await service.getNamespaces();

// Get pods
const pods = await service.getPods('default');

// Get logs
const logs = await service.getPodLogs('default', 'pod-name');

// Apply fix
const result = await service.applyAutomatedFix(fixAction);
```

### AI Fixer Component

```jsx
<AiFixer 
  inputLogs={logs}
  onFixGenerated={handleFixGenerated}
  kubernetesService={kubeService}
  errorContext={context}
/>
```

## 🔄 Vercel Integration

The application also supports Vercel deployment monitoring:

1. Switch to **"Vercel"** tab
2. Enter your Vercel API token
3. Select project and deployment
4. View deployment, error, and build logs
5. Use AI analysis for Vercel-specific issues

## 🚨 Troubleshooting

### Common Issues

1. **"Failed to connect to Kubernetes"**
   - Verify kubeconfig is valid
   - Check cluster accessibility
   - Ensure kubectl works locally

2. **"No namespaces found"**
   - Check RBAC permissions
   - Verify cluster connection
   - Review service account permissions

3. **"AI analysis failed"**
   - Verify GROQ API key is set
   - Check internet connectivity
   - Review API quota limits

4. **"Fix application failed"**
   - Check RBAC permissions for resource modification
   - Verify namespace access
   - Review cluster resource quotas

### Debug Mode

Enable debug logging by setting:

```javascript
localStorage.setItem('debug', 'true');
```

## 🛠️ Development

### Project Structure

```
src/
├── components/
│   ├── KubeLogs.js          # Kubernetes monitoring UI
│   ├── KubeLogs.css         # Kubernetes component styles
│   ├── AiFixer.js           # AI analysis and fixing
│   └── VercelLogs.js        # Vercel integration
├── services/
│   ├── kubernetesApi.js     # Kubernetes API client
│   └── vercelApi.js         # Vercel API client
├── App.js                   # Main application
└── App.css                  # Global styles
```

### Available Scripts

- `npm start` - Development server
- `npm run build` - Production build
- `npm test` - Run tests
- `npm run eject` - Eject from Create React App

### Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Kubernetes** community for excellent APIs
- **Groq** for AI capabilities
- **React** team for the framework
- **DevOps** community for inspiration

## 🔮 Roadmap

- [ ] **Multi-cluster support**
- [ ] **Slack/Teams notifications**
- [ ] **Custom webhook integrations**
- [ ] **Advanced RBAC management**
- [ ] **Prometheus metrics integration**
- [ ] **Grafana dashboard export**
- [ ] **Machine learning for pattern recognition**
- [ ] **Historical trend analysis**

---

**Built with ❤️ for DevOps teams. Powered by AI and Kubernetes.**
