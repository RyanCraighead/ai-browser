import React, { useState, useEffect } from 'react';
import { CerebrasService, CerebrasConfig } from './CerebrasService';

interface SettingsPanelProps {
  onClose?: () => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ onClose }) => {
  const [config, setConfig] = useState<CerebrasConfig>({
    apiKey: '',
    model: 'zai-glm-4.7',
    temperature: 1,
    topP: 0.95,
    maxTokens: 40000,
    disableReasoning: false
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);

  const cerebrasService = CerebrasService.getInstance();

  useEffect(() => {
    const loadedConfig = cerebrasService.getConfig();
    setConfig(loadedConfig);
  }, []);

  const handleConfigChange = (field: keyof CerebrasConfig, value: any) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    cerebrasService.saveConfig(config);
    setTestResult({ success: true, message: 'Settings saved successfully!' });
    setTimeout(() => setTestResult(null), 3000);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);

    try {
      // Temporarily update service config for testing
      cerebrasService.saveConfig(config);
      
      // Test with a simple request
      const response = await cerebrasService.chat('Hello! This is a test message.', 'You are a helpful assistant.');
      
      setTestResult({ success: true, message: 'Connection successful! API is working correctly.' });
    } catch (error: any) {
      setTestResult({ 
        success: false, 
        message: `Connection failed: ${error.message}` 
      });
    } finally {
      setIsTesting(false);
    }
  };

  const handleResetDefaults = () => {
    const defaults: CerebrasConfig = {
      apiKey: config.apiKey, // Keep API key
      model: 'zai-glm-4.7',
      temperature: 1,
      topP: 0.95,
      maxTokens: 40000,
      disableReasoning: false
    };
    setConfig(defaults);
    cerebrasService.saveConfig(defaults);
    setTestResult({ success: true, message: 'Reset to default settings' });
    setTimeout(() => setTestResult(null), 3000);
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--surface-2)',
      color: 'var(--text)',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface-3)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>⚙️</span>
          <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
            Settings
          </span>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--muted)',
              cursor: 'pointer',
              fontSize: '18px',
              padding: 0
            }}
          >
            ×
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {/* API Configuration */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ 
            fontSize: '12px', 
            fontWeight: 'bold', 
            color: '#888', 
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}>
            <span>🔑</span>
            <span>CEREBRAS API CONFIGURATION</span>
          </div>

          {/* API Key */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '12px', 
              color: '#aaa', 
              marginBottom: '6px' 
            }}>
              API Key *
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showApiKey ? 'text' : 'password'}
                value={config.apiKey}
                onChange={(e) => handleConfigChange('apiKey', e.target.value)}
                placeholder="Enter your Cerebras API key"
                style={{
                  width: '100%',
                  padding: '10px 40px 10px 12px',
                  borderRadius: '6px',
                  border: '1px solid var(--border)',
                  background: 'rgba(12, 18, 28, 0.8)',
                  color: 'var(--text)',
                  outline: 'none',
                  fontSize: '13px',
                  fontFamily: 'var(--mono)'
                }}
              />
              <button
                onClick={() => setShowApiKey(!showApiKey)}
                style={{
                  position: 'absolute',
                  right: '8px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  fontSize: '14px',
                  padding: '4px'
                }}
              >
                {showApiKey ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
            <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
              Get your API key from{' '}
              <a 
                href="https://cloud.cerebras.ai" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ color: '#2563eb' }}
              >
                cloud.cerebras.ai
              </a>
            </div>
          </div>

          {/* Model */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '12px', 
              color: '#aaa', 
              marginBottom: '6px' 
            }}>
              Model
            </label>
            <select
              value={config.model}
              onChange={(e) => handleConfigChange('model', e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'rgba(12, 18, 28, 0.8)',
                color: 'var(--text)',
                outline: 'none',
                fontSize: '13px'
              }}
            >
              <option value="zai-glm-4.7">zai-glm-4.7 (Recommended)</option>
              <option value="zai-glm-4.7-mini">zai-glm-4.7-mini</option>
              <option value="gpt-4o-mini">gpt-4o-mini</option>
            </select>
          </div>

          {/* Temperature */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '12px', 
              color: '#aaa', 
              marginBottom: '6px' 
            }}>
              Temperature: {config.temperature}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={config.temperature}
              onChange={(e) => handleConfigChange('temperature', parseFloat(e.target.value))}
              style={{
                width: '100%',
                marginBottom: '4px'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: '#666' }}>
              <span>0.0 (Precise)</span>
              <span>1.0 (Balanced)</span>
              <span>2.0 (Creative)</span>
            </div>
          </div>

          {/* Top P */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '12px', 
              color: '#aaa', 
              marginBottom: '6px' 
            }}>
              Top P: {config.topP}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={config.topP}
              onChange={(e) => handleConfigChange('topP', parseFloat(e.target.value))}
              style={{
                width: '100%',
                marginBottom: '4px'
              }}
            />
            <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
              Controls diversity of responses. Recommended: 0.95
            </div>
          </div>

          {/* Max Tokens */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'block', 
              fontSize: '12px', 
              color: '#aaa', 
              marginBottom: '6px' 
            }}>
              Max Tokens
            </label>
            <input
              type="number"
              min="1000"
              max="40000"
              step="1000"
              value={config.maxTokens}
              onChange={(e) => handleConfigChange('maxTokens', parseInt(e.target.value))}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'rgba(12, 18, 28, 0.8)',
                color: 'var(--text)',
                outline: 'none',
                fontSize: '13px'
              }}
            />
            <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
              Maximum response length (up to 40,000 tokens)
            </div>
          </div>

          {/* Reasoning Toggle */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              fontSize: '12px', 
              color: '#aaa', 
              cursor: 'pointer' 
            }}>
              <input
                type="checkbox"
                checked={config.disableReasoning}
                onChange={(e) => handleConfigChange('disableReasoning', e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              <span>Disable Reasoning (faster responses)</span>
            </label>
            <div style={{ fontSize: '11px', color: '#666', marginTop: '4px', marginLeft: '20px' }}>
              Disable for simple tasks to reduce latency. Enable for complex analysis.
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{ 
            fontSize: '12px', 
            fontWeight: 'bold', 
            color: '#888', 
            marginBottom: '12px' 
          }}>
            ACTIONS
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={handleSave}
              style={{
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid rgba(34, 211, 238, 0.6)',
                background: 'var(--accent)',
                color: '#0b0f14',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: 'bold'
              }}
            >
              💾 Save Settings
            </button>

            <button
              onClick={handleTestConnection}
              disabled={isTesting || !config.apiKey}
              style={{
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
                color: isTesting || !config.apiKey ? 'var(--muted)' : 'var(--text)',
                cursor: isTesting || !config.apiKey ? 'not-allowed' : 'pointer',
                fontSize: '13px'
              }}
            >
              {isTesting ? '⏳ Testing...' : '🧪 Test Connection'}
            </button>

            <button
              onClick={handleResetDefaults}
              style={{
                padding: '12px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--surface-2)',
                color: 'var(--text)',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              🔄 Reset to Defaults
            </button>
          </div>

          {/* Test Result */}
          {testResult && (
            <div style={{
              marginTop: '12px',
              padding: '12px',
              borderRadius: '6px',
              background: testResult.success ? 'rgba(34, 197, 94, 0.15)' : 'rgba(244, 63, 94, 0.15)',
              border: `1px solid ${testResult.success ? 'var(--success)' : 'var(--danger)'}`,
              fontSize: '12px',
              color: testResult.success ? 'var(--success)' : 'var(--danger)'
            }}>
              {testResult.success ? '✓ ' : '✗ '}{testResult.message}
            </div>
          )}
        </div>

        {/* Help Section */}
        <div>
          <div style={{ 
            fontSize: '12px', 
            fontWeight: 'bold', 
            color: '#888', 
            marginBottom: '12px' 
          }}>
            📚 HELP & RESOURCES
          </div>

          <div style={{ 
            background: 'rgba(12, 18, 28, 0.8)', 
            borderRadius: '6px', 
            padding: '12px',
            border: '1px solid var(--border)' 
          }}>
            <div style={{ marginBottom: '8px' }}>
              <a 
                href="https://cloud.cerebras.ai" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  color: '#2563eb', 
                  fontSize: '12px',
                  textDecoration: 'none'
                }}
              >
                🌐 Cerebras Cloud Console
              </a>
            </div>
            <div style={{ marginBottom: '8px' }}>
              <a 
                href="https://inference-docs.cerebras.ai" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ 
                  color: '#2563eb', 
                  fontSize: '12px',
                  textDecoration: 'none'
                }}
              >
                📖 API Documentation
              </a>
            </div>
            <div style={{ fontSize: '11px', color: '#666', lineHeight: '1.5' }}>
              <strong>Recommended Settings:</strong><br />
              • Model: zai-glm-4.7<br />
              • Temperature: 1.0<br />
              • Top P: 0.95<br />
              • Max Tokens: 40000
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
