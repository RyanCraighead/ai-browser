import React, { useState, useEffect } from 'react';
import { PageCustomizationService } from './PageCustomizationService';
import {
  PageAnalysis,
  PageTemplate,
  TransformationRule,
  CustomizationMode
} from './types';

interface PageCustomizationPanelProps {
  webview: any;
  url: string;
  title: string;
  onSaveTemplate?: (template: PageTemplate) => void;
  onLoadTemplate?: (template: PageTemplate) => void;
}

export const PageCustomizationPanel: React.FC<PageCustomizationPanelProps> = ({
  webview,
  url,
  title,
  onSaveTemplate,
  onLoadTemplate
}) => {
  const [mode, setMode] = useState<CustomizationMode>('inspect');
  const [analysis, setAnalysis] = useState<PageAnalysis | null>(null);
  const [selectedElements, setSelectedElements] = useState<string[]>([]);
  const [templates, setTemplates] = useState<PageTemplate[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [transformationType, setTransformationType] = useState<TransformationRule['type']>('style');
  const [customStyles, setCustomStyles] = useState<Record<string, string>>({});

  const customizationService = PageCustomizationService.getInstance();

  useEffect(() => {
    customizationService.setWebview(webview);
    loadTemplates();
    analyzePage();
  }, [webview, url]);

  const loadTemplates = () => {
    const saved = localStorage.getItem('pageTemplates');
    if (saved) {
      setTemplates(JSON.parse(saved));
    }
  };

  const saveTemplates = (newTemplates: PageTemplate[]) => {
    localStorage.setItem('pageTemplates', JSON.stringify(newTemplates));
    setTemplates(newTemplates);
  };

  const analyzePage = async () => {
    setIsAnalyzing(true);
    try {
      const pageAnalysis = await customizationService.analyzePage(url);
      setAnalysis(pageAnalysis);
      
      const restructuringSuggestions = await customizationService.getRestructuringSuggestions();
      setSuggestions(restructuringSuggestions);
    } catch (error) {
      console.error('Error analyzing page:', error);
    }
    setIsAnalyzing(false);
  };

  const handleModeChange = (newMode: CustomizationMode) => {
    setMode(newMode);
    customizationService.setMode(newMode);
  };

  const handleGetSelectedElements = async () => {
    const selected = await customizationService.getSelectedElements();
    setSelectedElements(selected);
  };

  const handleClearSelections = async () => {
    await customizationService.clearHighlights();
    setSelectedElements([]);
  };

  const handleApplyTransformation = async (type: TransformationRule['type'], selector?: string) => {
    if (!selector && selectedElements.length === 0) {
      alert('Please select elements first or provide a selector');
      return;
    }

    const rule: TransformationRule = {
      id: crypto.randomUUID(),
      type,
      selector: selector || `[data-ai-selected="true"]`,
      styles: customStyles
    };

    await customizationService.applyTransformation(rule);
    analyzePage(); // Refresh analysis
  };

  const handleSmartRestructure = async (type: 'simplify' | 'clean' | 'focus' | 'readability' | 'mobile') => {
    await customizationService.smartRestructure(type);
    analyzePage();
  };

  const handleSaveTemplate = () => {
    if (!templateName.trim()) {
      alert('Please enter a template name');
      return;
    }

    const template = {
      id: crypto.randomUUID(),
      name: templateName,
      urlPattern: url,
      originalUrl: url,
      title,
      transformations: customizationService.getTransformations(),
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isDefault: false
    };

    const newTemplates = [...templates, template];
    saveTemplates(newTemplates);
    setShowTemplateDialog(false);
    setTemplateName('');
    
    if (onSaveTemplate) {
      onSaveTemplate(template);
    }
  };

  const handleApplyTemplate = async (template: PageTemplate) => {
    await customizationService.applyTemplate(template);
    analyzePage();
    
    if (onLoadTemplate) {
      onLoadTemplate(template);
    }
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      const newTemplates = templates.filter(t => t.id !== templateId);
      saveTemplates(newTemplates);
    }
  };

  const handleResetPage = async () => {
    if (confirm('This will reload the page and reset all changes. Continue?')) {
      await customizationService.resetPage();
      analyzePage();
      setSelectedElements([]);
    }
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      background: '#0d0d0d',
      color: '#fff',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        padding: '12px',
        borderBottom: '1px solid #222',
        background: '#111',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '18px' }}>🎨</span>
          <span style={{ fontWeight: 'bold', fontSize: '14px' }}>
            Page Customization
          </span>
        </div>
        <button
          onClick={analyzePage}
          disabled={isAnalyzing}
          style={{
            padding: '6px 12px',
            borderRadius: '6px',
            border: '1px solid #333',
            background: '#2563eb',
            color: 'white',
            cursor: isAnalyzing ? 'not-allowed' : 'pointer',
            fontSize: '12px'
          }}
        >
          {isAnalyzing ? '⏳ Analyzing...' : '🔄 Analyze'}
        </button>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {/* Mode Selection */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#888', marginBottom: '8px' }}>
            CUSTOMIZATION MODE
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {(['inspect', 'select', 'restructure', 'style'] as CustomizationMode[]).map(m => (
              <button
                key={m}
                onClick={() => handleModeChange(m)}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: mode === m ? '1px solid #2563eb' : '1px solid #333',
                  background: mode === m ? '#2563eb' : '#151515',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: mode === m ? 'bold' : 'normal'
                }}
              >
                {m === 'inspect' && '🔍 Inspect'}
                {m === 'select' && '✅ Select'}
                {m === 'restructure' && '🔄 Restructure'}
                {m === 'style' && '🎨 Style'}
              </button>
            ))}
          </div>
          <div style={{ fontSize: '11px', color: '#666', marginTop: '6px' }}>
            {mode === 'inspect' && 'Hover over elements to inspect them'}
            {mode === 'select' && 'Click elements to select them for modification'}
            {mode === 'restructure' && 'Use AI tools to restructure the page'}
            {mode === 'style' && 'Select elements and apply custom styles'}
          </div>
        </div>

        {/* Page Analysis */}
        {analysis && (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#888', marginBottom: '8px' }}>
              PAGE ANALYSIS
            </div>
            <div style={{
              background: '#111',
              borderRadius: '8px',
              padding: '12px',
              border: '1px solid #222'
            }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '11px' }}>
                <div style={{ color: '#666' }}>Elements:</div>
                <div style={{ color: '#fff' }}>{analysis.elementCount.toLocaleString()}</div>
                
                <div style={{ color: '#666' }}>Images:</div>
                <div style={{ color: '#fff' }}>{analysis.imageCount}</div>
                
                <div style={{ color: '#666' }}>Links:</div>
                <div style={{ color: '#fff' }}>{analysis.linkCount}</div>
                
                <div style={{ color: '#666' }}>Forms:</div>
                <div style={{ color: '#fff' }}>{analysis.formCount}</div>
                
                <div style={{ color: '#666' }}>Reading Time:</div>
                <div style={{ color: '#fff' }}>{analysis.estimatedReadingTime} min</div>
                
                <div style={{ color: '#666' }}>Sections:</div>
                <div style={{ color: '#fff' }}>{analysis.structure.sections.length}</div>
              </div>
            </div>
          </div>
        )}

        {/* Element Selection */}
        {mode === 'select' || mode === 'style' ? (
          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#888', marginBottom: '8px' }}>
              SELECTED ELEMENTS ({selectedElements.length})
            </div>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
              <button
                onClick={handleGetSelectedElements}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #333',
                  background: '#151515',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                📋 Get Selected
              </button>
              <button
                onClick={handleClearSelections}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #333',
                  background: '#151515',
                  color: '#ef4444',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                ✕ Clear
              </button>
            </div>
            
            {selectedElements.length > 0 && (
              <div style={{
                background: '#111',
                borderRadius: '6px',
                padding: '8px',
                border: '1px solid #222',
                maxHeight: '150px',
                overflowY: 'auto'
              }}>
                {selectedElements.map((xpath, idx) => (
                  <div key={idx} style={{
                    padding: '4px 8px',
                    fontSize: '10px',
                    color: '#888',
                    fontFamily: 'monospace',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    borderBottom: idx < selectedElements.length - 1 ? '1px solid #222' : 'none'
                  }}>
                    {xpath}
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : null}

        {/* Transformation Tools */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#888', marginBottom: '8px' }}>
            TRANSFORMATION TOOLS
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <button
              onClick={() => handleApplyTransformation('hide')}
              style={{
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #333',
                background: '#151515',
                color: 'white',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              👁️ Hide
            </button>
            <button
              onClick={() => handleApplyTransformation('remove')}
              style={{
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #333',
                background: '#151515',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              🗑️ Remove
            </button>
            <button
              onClick={() => handleApplyTransformation('highlight')}
              style={{
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #333',
                background: '#151515',
                color: '#f59e0b',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              ✨ Highlight
            </button>
            <button
              onClick={() => handleApplyTransformation('replace')}
              style={{
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #333',
                background: '#151515',
                color: '#10b981',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              📝 Replace
            </button>
          </div>
        </div>

        {/* AI Restructuring */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#888', marginBottom: '8px' }}>
            AI RESTRUCTURING
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
            <button
              onClick={() => handleSmartRestructure('simplify')}
              style={{
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #333',
                background: '#151515',
                color: 'white',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              🧹 Simplify
            </button>
            <button
              onClick={() => handleSmartRestructure('clean')}
              style={{
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #333',
                background: '#151515',
                color: 'white',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              ✨ Clean
            </button>
            <button
              onClick={() => handleSmartRestructure('focus')}
              style={{
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #333',
                background: '#151515',
                color: 'white',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              🎯 Focus
            </button>
            <button
              onClick={() => handleSmartRestructure('readability')}
              style={{
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #333',
                background: '#151515',
                color: 'white',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              📖 Readability
            </button>
            <button
              onClick={() => handleSmartRestructure('mobile')}
              style={{
                padding: '10px',
                borderRadius: '6px',
                border: '1px solid #333',
                background: '#151515',
                color: 'white',
                cursor: 'pointer',
                fontSize: '12px',
                gridColumn: '1 / -1'
              }}
            >
              📱 Mobile Friendly
            </button>
          </div>

          {suggestions.length > 0 && (
            <div style={{
              marginTop: '12px',
              background: '#111',
              borderRadius: '6px',
              padding: '10px',
              border: '1px solid #222'
            }}>
              <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#888', marginBottom: '6px' }}>
                SUGGESTIONS
              </div>
              {suggestions.map((suggestion, idx) => (
                <div key={idx} style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Templates */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ 
            fontSize: '12px', 
            fontWeight: 'bold', 
            color: '#888', 
            marginBottom: '8px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <span>SAVED TEMPLATES ({templates.length})</span>
            <button
              onClick={() => setShowTemplateDialog(true)}
              style={{
                padding: '4px 8px',
                borderRadius: '4px',
                border: '1px solid #333',
                background: '#2563eb',
                color: 'white',
                cursor: 'pointer',
                fontSize: '11px'
              }}
            >
              + Save
            </button>
          </div>
          
          {templates.length === 0 ? (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              color: '#666',
              fontSize: '12px'
            }}>
              No templates saved yet.<br />
              Make changes to this page, then click "Save" to create a template.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {templates.map(template => (
                <div key={template.id} style={{
                  background: '#111',
                  borderRadius: '6px',
                  padding: '10px',
                  border: '1px solid #222'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: '#fff' }}>
                      {template.name}
                    </div>
                    <div style={{ fontSize: '10px', color: '#666' }}>
                      {new Date(template.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div style={{ fontSize: '10px', color: '#666', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {template.urlPattern}
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => handleApplyTemplate(template)}
                      style={{
                        flex: 1,
                        padding: '6px',
                        borderRadius: '4px',
                        border: '1px solid #333',
                        background: '#151515',
                        color: '#10b981',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      ✓ Apply
                    </button>
                    <button
                      onClick={() => handleDeleteTemplate(template.id)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '4px',
                        border: '1px solid #333',
                        background: '#151515',
                        color: '#ef4444',
                        cursor: 'pointer',
                        fontSize: '11px'
                      }}
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Reset Button */}
        <button
          onClick={handleResetPage}
          style={{
            width: '100%',
            padding: '12px',
            borderRadius: '6px',
            border: '1px solid #ef4444',
            background: 'transparent',
            color: '#ef4444',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold'
          }}
        >
          🔄 Reset Page
        </button>
      </div>

      {/* Save Template Dialog */}
      {showTemplateDialog && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: '#111',
            borderRadius: '12px',
            padding: '24px',
            border: '1px solid #333',
            width: '400px',
            maxWidth: '90%'
          }}>
            <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#fff', marginBottom: '16px' }}>
              💾 Save Template
            </div>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px' }}>
                Template Name
              </div>
              <input
                type="text"
                value={templateName}
                onChange={(e) => setTemplateName(e.target.value)}
                placeholder="e.g., Clean Wikipedia"
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #333',
                  background: '#0d0d0d',
                  color: 'white',
                  outline: 'none',
                  fontSize: '13px'
                }}
              />
            </div>
            <div style={{ fontSize: '11px', color: '#666', marginBottom: '16px' }}>
              This will save all current transformations as a template that can be applied to similar pages.
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => {
                  setShowTemplateDialog(false);
                  setTemplateName('');
                }}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #333',
                  background: '#151515',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '12px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTemplate}
                style={{
                  flex: 1,
                  padding: '10px',
                  borderRadius: '6px',
                  border: '1px solid #2563eb',
                  background: '#2563eb',
                  color: 'white',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 'bold'
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};