import React, { useEffect, useState } from 'react';

function AiFixer({ inputLogs, onFixGenerated, kubernetesService, errorContext }) {
  const [input, setInput] = useState('');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [fixSuggestions, setFixSuggestions] = useState([]);
  const [autoApplyEnabled, setAutoApplyEnabled] = useState(false);
  const [appliedFixes, setAppliedFixes] = useState([]);

  // Update input when logs come from KubeLogs
  useEffect(() => {
    if (inputLogs) {
      setInput(inputLogs);
    }
  }, [inputLogs]);

  const handleSubmit = async () => {
    if (!input.trim()) return;

    setLoading(true);
    setResult('');
    setFixSuggestions([]);

    try {
      // Enhanced prompt for Kubernetes-specific issues
      const enhancedPrompt = createKubernetesPrompt(input, errorContext);
      
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.REACT_APP_GROQ_API_KEY}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: "llama3-8b-8192",
          messages: [
            {
              role: "system",
              content: `You are an expert Kubernetes DevOps AI. Analyze Kubernetes logs and provide:
1. Root cause analysis
2. Specific actionable fixes
3. Prevention strategies
4. YAML manifests when needed

Always structure your response with clear sections and provide kubectl commands when applicable.
If the issue can be automatically fixed, clearly indicate the fix type (restart_pod, scale_deployment, update_config, apply_manifest).`
            },
            {
              role: "user",
              content: enhancedPrompt
            }
          ]
        })
      });

      const data = await response.json();
      const aiResponse = data.choices?.[0]?.message?.content || "⚠️ No meaningful response.";
      
      setResult(aiResponse);
      
      // Parse AI response for actionable fixes
      const suggestions = parseFixSuggestions(aiResponse, errorContext);
      setFixSuggestions(suggestions);
      
      // Callback to parent component
      if (onFixGenerated) {
        onFixGenerated({ aiResponse, suggestions, errorContext });
      }
      
    } catch (err) {
      setResult("❌ Error: " + err.message);
    }

    setLoading(false);
  };

  // Create enhanced prompt with Kubernetes context
  const createKubernetesPrompt = (logs, context) => {
    let prompt = `Analyze these Kubernetes logs and provide detailed troubleshooting:\n\n`;
    
    if (context) {
      prompt += `Context:\n`;
      prompt += `- Namespace: ${context.namespace || 'unknown'}\n`;
      prompt += `- Pod: ${context.pod || 'unknown'}\n`;
      prompt += `- Container: ${context.container || 'unknown'}\n`;
      prompt += `- Timestamp: ${context.timestamp || 'unknown'}\n\n`;
    }
    
    prompt += `Logs:\n${logs}\n\n`;
    prompt += `Please provide:\n`;
    prompt += `1. 🔍 ROOT CAUSE: What's causing this issue?\n`;
    prompt += `2. 🔧 IMMEDIATE FIX: Step-by-step solution\n`;
    prompt += `3. 📋 KUBECTL COMMANDS: Exact commands to run\n`;
    prompt += `4. 📄 YAML MANIFESTS: If configuration changes are needed\n`;
    prompt += `5. 🛡️ PREVENTION: How to prevent this in the future\n\n`;
    prompt += `If this can be automated, specify the fix type: restart_pod, scale_deployment, update_config, or apply_manifest`;
    
    return prompt;
  };

  // Parse AI response for actionable fix suggestions
  const parseFixSuggestions = (aiResponse, context) => {
    const suggestions = [];
    
    // Check for different fix patterns in AI response
    if (aiResponse.toLowerCase().includes('restart') || aiResponse.toLowerCase().includes('delete pod')) {
      suggestions.push({
        type: 'restart_pod',
        title: '🔄 Restart Pod',
        description: 'Restart the problematic pod',
        action: {
          type: 'restart_pod',
          namespace: context?.namespace,
          podName: context?.pod,
          reason: 'AI suggested pod restart'
        },
        confidence: 'high'
      });
    }
    
    if (aiResponse.toLowerCase().includes('scale') || aiResponse.toLowerCase().includes('replicas')) {
      suggestions.push({
        type: 'scale_deployment',
        title: '📈 Scale Deployment',
        description: 'Scale deployment to handle load or replace failed pods',
        action: {
          type: 'scale_deployment',
          namespace: context?.namespace,
          deploymentName: context?.deployment || `${context?.pod}-deployment`,
          replicas: 3,
          reason: 'AI suggested scaling'
        },
        confidence: 'medium'
      });
    }
    
    if (aiResponse.toLowerCase().includes('config') || aiResponse.toLowerCase().includes('environment')) {
      suggestions.push({
        type: 'update_config',
        title: '⚙️ Update Configuration',
        description: 'Update ConfigMap or environment variables',
        action: {
          type: 'update_config',
          namespace: context?.namespace,
          configMapName: `${context?.pod}-config`,
          data: extractConfigFromAI(aiResponse),
          reason: 'AI suggested configuration update'
        },
        confidence: 'low'
      });
    }
    
    // Extract YAML manifests from AI response
    const yamlMatch = aiResponse.match(/```yaml\n([\s\S]*?)\n```/);
    if (yamlMatch) {
      suggestions.push({
        type: 'apply_manifest',
        title: '📄 Apply YAML Manifest',
        description: 'Apply the AI-generated Kubernetes manifest',
        action: {
          type: 'apply_manifest',
          manifest: yamlMatch[1],
          reason: 'AI provided YAML manifest'
        },
        confidence: 'medium'
      });
    }
    
    return suggestions;
  };

  // Extract configuration suggestions from AI response
  const extractConfigFromAI = (aiResponse) => {
    // Simple extraction logic - can be enhanced
    const configData = {};
    
    if (aiResponse.includes('memory')) {
      configData['MEMORY_LIMIT'] = '512Mi';
    }
    if (aiResponse.includes('cpu')) {
      configData['CPU_LIMIT'] = '500m';
    }
    if (aiResponse.includes('timeout')) {
      configData['TIMEOUT'] = '30';
    }
    
    return configData;
  };

  // Apply a specific fix suggestion
  const applyFix = async (suggestion) => {
    if (!kubernetesService) {
      alert('Kubernetes service not available');
      return;
    }

    try {
      setLoading(true);
      
      const result = await kubernetesService.applyAutomatedFix(suggestion.action);
      
      setAppliedFixes(prev => [...prev, {
        ...suggestion,
        result,
        timestamp: new Date().toISOString()
      }]);
      
      alert(`✅ Fix applied successfully: ${result.message}`);
      
    } catch (error) {
      alert(`❌ Failed to apply fix: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Auto-apply high confidence fixes
  useEffect(() => {
    if (autoApplyEnabled && fixSuggestions.length > 0) {
      const highConfidenceFixes = fixSuggestions.filter(s => s.confidence === 'high');
      
      highConfidenceFixes.forEach(fix => {
        console.log('Auto-applying high confidence fix:', fix);
        applyFix(fix);
      });
    }
  }, [fixSuggestions, autoApplyEnabled]);

  return (
    <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '10px' }}>
      <h2>🧠 Kubernetes AI Debugging Assistant</h2>
      
      {/* Auto-apply toggle */}
      <div style={{ marginBottom: '15px' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
          <input
            type="checkbox"
            checked={autoApplyEnabled}
            onChange={(e) => setAutoApplyEnabled(e.target.checked)}
            style={{ transform: 'scale(1.2)' }}
          />
          <span style={{ fontWeight: '600', color: '#555' }}>
            🤖 Auto-apply high confidence fixes
          </span>
        </label>
      </div>

      {/* Error context display */}
      {errorContext && (
        <div style={{ 
          background: '#e8f4f8', 
          padding: '10px', 
          borderRadius: '6px', 
          marginBottom: '15px',
          fontSize: '0.9rem'
        }}>
          <strong>Context:</strong> {errorContext.namespace}/{errorContext.pod}
          {errorContext.container && `/${errorContext.container}`}
        </div>
      )}
      
      <textarea
        rows={10}
        cols={90}
        placeholder="Paste Kubernetes logs here or they will be auto-populated..."
        value={input}
        onChange={(e) => setInput(e.target.value)}
        style={{ 
          width: '100%', 
          marginBottom: '10px', 
          padding: '10px',
          fontFamily: 'Monaco, Menlo, Ubuntu Mono, monospace',
          fontSize: '0.9rem'
        }}
      />
      <br />
      
      <button 
        onClick={handleSubmit} 
        disabled={loading || !input.trim()} 
        style={{ 
          padding: '12px 24px', 
          marginRight: '10px',
          background: loading ? '#95a5a6' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
          border: 'none',
          borderRadius: '6px',
          fontSize: '1rem',
          fontWeight: '600',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? "🔄 Analyzing..." : "🔍 Analyze & Get Fixes"}
      </button>

      {/* AI Response */}
      {result && (
        <div style={{ 
          marginTop: '20px', 
          background: '#e6f4ea', 
          padding: '15px', 
          borderRadius: '6px', 
          whiteSpace: 'pre-wrap',
          borderLeft: '4px solid #27ae60'
        }}>
          <strong>💡 AI Analysis & Recommendations:</strong>
          <div style={{ marginTop: '10px', lineHeight: '1.6' }}>{result}</div>
        </div>
      )}

      {/* Fix Suggestions */}
      {fixSuggestions.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3 style={{ color: '#2c3e50', marginBottom: '15px' }}>🔧 Automated Fix Suggestions</h3>
          
          <div style={{ display: 'grid', gap: '15px' }}>
            {fixSuggestions.map((suggestion, index) => (
              <div 
                key={index}
                style={{
                  border: '1px solid #e1e8ed',
                  borderRadius: '8px',
                  padding: '15px',
                  background: 'white',
                  borderLeft: `4px solid ${
                    suggestion.confidence === 'high' ? '#27ae60' :
                    suggestion.confidence === 'medium' ? '#f39c12' : '#e67e22'
                  }`
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '10px'
                }}>
                  <h4 style={{ margin: 0, color: '#2c3e50' }}>{suggestion.title}</h4>
                  <span style={{
                    padding: '3px 8px',
                    borderRadius: '4px',
                    fontSize: '0.8rem',
                    fontWeight: '600',
                    background: suggestion.confidence === 'high' ? '#27ae60' :
                               suggestion.confidence === 'medium' ? '#f39c12' : '#e67e22',
                    color: 'white'
                  }}>
                    {suggestion.confidence.toUpperCase()}
                  </span>
                </div>
                
                <p style={{ color: '#555', marginBottom: '15px' }}>
                  {suggestion.description}
                </p>
                
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    onClick={() => applyFix(suggestion)}
                    disabled={loading}
                    style={{
                      padding: '8px 16px',
                      background: 'linear-gradient(135deg, #27ae60 0%, #2ecc71 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.9rem'
                    }}
                  >
                    ✅ Apply Fix
                  </button>
                  
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(JSON.stringify(suggestion.action, null, 2));
                      alert('Fix action copied to clipboard!');
                    }}
                    style={{
                      padding: '8px 16px',
                      background: 'linear-gradient(135deg, #3498db 0%, #2980b9 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontWeight: '600',
                      fontSize: '0.9rem'
                    }}
                  >
                    📋 Copy Action
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Applied Fixes History */}
      {appliedFixes.length > 0 && (
        <div style={{ marginTop: '20px' }}>
          <h3 style={{ color: '#2c3e50', marginBottom: '15px' }}>✅ Applied Fixes</h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {appliedFixes.map((fix, index) => (
              <div 
                key={index}
                style={{
                  border: '1px solid #e1e8ed',
                  borderRadius: '6px',
                  padding: '12px',
                  background: '#f8f9fa',
                  borderLeft: '4px solid #27ae60'
                }}
              >
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  marginBottom: '5px'
                }}>
                  <strong style={{ color: '#2c3e50' }}>{fix.title}</strong>
                  <span style={{ color: '#666', fontSize: '0.9rem' }}>
                    {new Date(fix.timestamp).toLocaleString()}
                  </span>
                </div>
                <div style={{ color: '#27ae60', fontWeight: '600' }}>
                  {fix.result.message}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default AiFixer;
