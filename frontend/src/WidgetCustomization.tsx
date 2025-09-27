import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { api } from './config/apiConfig';
import { defaultWidgetConfig } from './widget/defaultWidgetConfig';
import VirtualTryOnWidget from './widget/VirtualTryOnWidget';

export interface WidgetConfig {
  // Colors
  primaryColor: string;
  secondaryColor: string;
  backgroundColor: string;
  textColor: string;

  // Typography
  fontFamily: string;
  fontSize: string;
  fontWeight: string;

  // Button styles
  buttonStyle: 'rounded' | 'square' | 'pill';
  buttonSize: 'small' | 'medium' | 'large';
  buttonText: string;

  // Layout
  widgetSize: 'small' | 'medium' | 'large';
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left' | 'center';

  // Content
  title: string;
  subtitle: string;
  callToAction: string;

  // Features
  showBranding: boolean;
  enableAR: boolean;
  enableSharing: boolean;

  // Animation
  animationType: 'fade' | 'slide' | 'bounce' | 'none';
  animationSpeed: 'slow' | 'normal' | 'fast';

  // New field
  uploadButtonText: string;
}

const defaultConfig: WidgetConfig = defaultWidgetConfig as WidgetConfig;

// Add a helper hook for responsive breakpoint
function useIsNarrow(width = 600) {
  const [isNarrow, setIsNarrow] = useState(false);
  useEffect(() => {
    function handleResize() {
      setIsNarrow(window.innerWidth < width);
    }
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [width]);
  return isNarrow;
}

const WidgetCustomization: React.FC = () => {
  const { token } = useAuth();
  const [config, setConfig] = useState<WidgetConfig>(defaultConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [embedCode, setEmbedCode] = useState<string>('');
  const [isLoadingEmbedCode, setIsLoadingEmbedCode] = useState(false);
  const isNarrow = useIsNarrow(700);

  // Load saved configuration from backend
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const response = await api.getWidgetConfig(token || '');

        if (response.ok) {
          const data = await response.json();
          // If config exists and is not empty, use it; otherwise use defaultConfig
          if (data.config && Object.keys(data.config).length > 0) {
            setConfig(data.config);
          } else {
            setConfig(defaultConfig);
          }
        } else {
          console.error('Failed to load widget config:', response.statusText);
        }
      } catch (error) {
        console.error('Failed to load saved widget config:', error);
      }
    };

    if (token) {
      loadConfig();
    }
  }, [token]);

  const updateConfig = (updates: Partial<WidgetConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const saveConfiguration = async () => {
    setIsSaving(true);
    setSaveMessage('');
    try {
      const response = await api.saveWidgetConfig(config, token || '');
      if (response.ok) {
        setSaveMessage('Configuration saved successfully!');
        setTimeout(() => setSaveMessage(''), 3000);
      } else {
        const errorData = await response.json();
        setSaveMessage(`Failed to save configuration: ${errorData.detail || response.statusText}`);
      }
    } catch (error) {
      setSaveMessage('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const resetToDefault = () => {
    setConfig(defaultConfig);
    localStorage.removeItem('widgetConfig');
  };

  // Use default config if config is empty (for preview)
  const mergedConfig = (config && Object.keys(config).length > 0) ? config : defaultConfig;

  return (
    <div style={{
      display: 'flex',
      height: 'calc(110vh - 56px)',
      gap: 0,
      alignItems: 'stretch',
    }}>
      {/* Builder Panel - Left Side */}
      <div style={{
        width: '50%',
        background: 'rgba(255,255,255,0.05)',
        borderRight: '1px solid rgba(255,255,255,0.1)',
        padding: '1.6rem',
        overflowY: 'auto',
        height: '100%',
        boxSizing: 'border-box',
      }}>
        <div style={{ marginBottom: '1.6rem' }}>
          <h2 style={{
            fontSize: '1.6rem',
            fontWeight: 700,
            color: 'white',
            marginBottom: '0.4rem',
            fontFamily: 'Poppins, Inter, -apple-system, BlinkMacSystemFont, sans-serif'
          }}>
            Widget Customization
          </h2>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '0.8rem' }}>
            Customize your virtual try-on widget to match your brand
          </p>
        </div>

        {/* Colors Section */}
        <div style={{ marginBottom: '1.6rem' }}>
          <h3 style={{ color: 'white', fontSize: '0.96rem', marginBottom: '0.8rem' }}>Colors</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.72rem', display: 'block', marginBottom: '0.4rem' }}>
                Primary Color
              </label>
              <input
                type="color"
                value={config.primaryColor}
                onChange={(e) => updateConfig({ primaryColor: e.target.value })}
                style={{ width: '100%', height: '32px', border: 'none', borderRadius: '6.4px' }}
              />
            </div>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.72rem', display: 'block', marginBottom: '0.4rem' }}>
                Secondary Color
              </label>
              <input
                type="color"
                value={config.secondaryColor}
                onChange={(e) => updateConfig({ secondaryColor: e.target.value })}
                style={{ width: '100%', height: '32px', border: 'none', borderRadius: '6.4px' }}
              />
            </div>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.72rem', display: 'block', marginBottom: '0.4rem' }}>
                Background Color
              </label>
              <input
                type="color"
                value={config.backgroundColor}
                onChange={(e) => updateConfig({ backgroundColor: e.target.value })}
                style={{ width: '100%', height: '32px', border: 'none', borderRadius: '6.4px' }}
              />
            </div>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.72rem', display: 'block', marginBottom: '0.4rem' }}>
                Text Color
              </label>
              <input
                type="color"
                value={config.textColor}
                onChange={(e) => updateConfig({ textColor: e.target.value })}
                style={{ width: '100%', height: '32px', border: 'none', borderRadius: '6.4px' }}
              />
            </div>
          </div>
        </div>

        {/* Typography Section */}
        <div style={{ marginBottom: '1.6rem' }}>
          <h3 style={{ color: 'white', fontSize: '0.96rem', marginBottom: '0.8rem' }}>Typography</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.72rem', display: 'block', marginBottom: '0.4rem' }}>
                Font Family
              </label>
              <select
                value={config.fontFamily}
                onChange={(e) => updateConfig({ fontFamily: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.6rem',
                  borderRadius: '6.4px',
                  border: '1px solid #444',
                  background: 'rgba(30,34,54,0.95)',
                  color: '#fff',
                  fontSize: '0.72rem',
                }}
              >
                <option value="Inter">Inter</option>
                <option value="Roboto">Roboto</option>
                <option value="Open Sans">Open Sans</option>
                <option value="Poppins">Poppins</option>
                <option value="Arial">Arial</option>
                <option value="Lato">Lato</option>
                <option value="Montserrat">Montserrat</option>
                <option value="Nunito">Nunito</option>
                <option value="Source Sans Pro">Source Sans Pro</option>
                <option value="Raleway">Raleway</option>
                <option value="Ubuntu">Ubuntu</option>
              </select>
            </div>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.72rem', display: 'block', marginBottom: '0.4rem' }}>
                Font Size
              </label>
              <select
                value={config.fontSize}
                onChange={(e) => updateConfig({ fontSize: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.6rem',
                  borderRadius: '6.4px',
                  border: '1px solid #444',
                  background: 'rgba(30,34,54,0.95)',
                  color: '#fff',
                  fontSize: '0.72rem',
                }}
              >
                <option value="14px">Small (14px)</option>
                <option value="16px">Medium (16px)</option>
                <option value="18px">Large (18px)</option>
                <option value="20px">Extra Large (20px)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Button Styles Section */}
        <div style={{ marginBottom: '1.6rem' }}>
          <h3 style={{ color: 'white', fontSize: '0.96rem', marginBottom: '0.8rem' }}>Button Style</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem' }}>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.72rem', display: 'block', marginBottom: '0.4rem' }}>
                Button Style
              </label>
              <select
                value={config.buttonStyle}
                onChange={(e) => updateConfig({ buttonStyle: e.target.value as any })}
                style={{
                  width: '100%',
                  padding: '0.6rem',
                  borderRadius: '6.4px',
                  border: '1px solid #444',
                  background: 'rgba(30,34,54,0.95)',
                  color: '#fff',
                  fontSize: '0.72rem',
                }}
              >
                <option value="rounded">Rounded</option>
                <option value="square">Square</option>
                <option value="pill">Pill</option>
              </select>
            </div>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.72rem', display: 'block', marginBottom: '0.4rem' }}>
                Button Size
              </label>
              <select
                value={config.buttonSize}
                onChange={(e) => updateConfig({ buttonSize: e.target.value as any })}
                style={{
                  width: '100%',
                  padding: '0.6rem',
                  borderRadius: '6.4px',
                  border: '1px solid #444',
                  background: 'rgba(30,34,54,0.95)',
                  color: '#fff',
                  fontSize: '0.72rem',
                }}
              >
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </div>
          </div>
          <div style={{ marginTop: '0.8rem' }}>
            <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.72rem', display: 'block', marginBottom: '0.4rem' }}>
              Button Text
            </label>
            <input
              type="text"
              value={config.buttonText}
              onChange={(e) => updateConfig({ buttonText: e.target.value })}
              style={{
                width: '100%',
                padding: '0.6rem',
                borderRadius: '6.4px',
                border: '1px solid #444',
                background: 'rgba(30,34,54,0.95)',
                color: '#fff',
                fontSize: '0.72rem',
              }}
            />
          </div>
          <div style={{ marginTop: '0.8rem' }}>
            <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.72rem', display: 'block', marginBottom: '0.4rem' }}>
              Second Button Text
            </label>
            <input
              type="text"
              value={config.uploadButtonText}
              onChange={(e) => updateConfig({ uploadButtonText: e.target.value })}
              style={{
                width: '100%',
                padding: '0.6rem',
                borderRadius: '6.4px',
                border: '1px solid #444',
                background: 'rgba(30,34,54,0.95)',
                color: '#fff',
                fontSize: '0.72rem',
              }}
            />
          </div>
        </div>

        {/* Content Section */}
        <div style={{ marginBottom: '1.6rem' }}>
          <h3 style={{ color: 'white', fontSize: '0.96rem', marginBottom: '0.8rem' }}>Content</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.72rem', display: 'block', marginBottom: '0.4rem' }}>
                Title
              </label>
              <input
                type="text"
                value={config.title}
                onChange={(e) => updateConfig({ title: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.6rem',
                  borderRadius: '6.4px',
                  border: '1px solid #444',
                  background: 'rgba(30,34,54,0.95)',
                  color: '#fff',
                  fontSize: '0.72rem',
                }}
              />
            </div>
            <div>
              <label style={{ color: 'rgba(255,255,255,0.8)', fontSize: '0.72rem', display: 'block', marginBottom: '0.4rem' }}>
                Subtitle
              </label>
              <input
                type="text"
                value={config.subtitle}
                onChange={(e) => updateConfig({ subtitle: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.6rem',
                  borderRadius: '6.4px',
                  border: '1px solid #444',
                  background: 'rgba(30,34,54,0.95)',
                  color: '#fff',
                  fontSize: '0.72rem',
                }}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', gap: '0.8rem', marginTop: '1.6rem' }}>
          <button
            onClick={saveConfiguration}
            disabled={isSaving}
            style={{
              padding: '0.6rem 1.2rem',
              background: 'var(--accent-gradient)',
              color: 'white',
              border: 'none',
              borderRadius: '6.4px',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
              opacity: isSaving ? 0.6 : 1,
            }}
          >
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
          <button
            onClick={resetToDefault}
            style={{
              padding: '0.6rem 1.2rem',
              background: 'rgba(255,255,255,0.1)',
              color: 'white',
              border: '1px solid rgba(255,255,255,0.2)',
              borderRadius: '6.4px',
              fontSize: '0.72rem',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Reset to Default
          </button>
        </div>

        {saveMessage && (
          <div style={{
            marginTop: '0.8rem',
            padding: '0.6rem',
            borderRadius: '6.4px',
            background: saveMessage.includes('success') ? 'rgba(76, 175, 80, 0.2)' : 'rgba(244, 67, 54, 0.2)',
            color: saveMessage.includes('success') ? '#4caf50' : '#f44336',
            fontSize: '0.72rem',
          }}>
            {saveMessage}
          </div>
        )}
      </div>

      {/* Preview Panel - Right Side */}
      <div style={{
        width: '50%',
        background: '#f5f5f5',
        padding: isNarrow ? '0.8%' : '1.6%',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        boxSizing: 'border-box',
      }}>
        <div style={{ marginBottom: '1.6rem' }}>
          <h3 style={{ color: '#333', fontSize: '1.2rem', marginBottom: '0.4rem' }}>
            Live Preview
          </h3>
          <p style={{ color: '#666', fontSize: '0.72rem' }}>
            This is how your widget will appear on your website
          </p>
          {isLoadingEmbedCode && (
            <div style={{
              marginTop: '0.4rem',
              padding: '0.4rem',
              background: '#e3f2fd',
              borderRadius: '3.2px',
              fontSize: '0.64rem',
              color: '#1976d2',
            }}>
              ⚡ Updating preview...
            </div>
          )}
        </div>

        {/* Widget Preview */}
        <div style={{
          flex: 1,
          background: '#f8f9fa',
          borderRadius: '9.6px',
          padding: isNarrow ? '0.8%' : '1.6%',
          position: 'relative',
          overflow: 'auto',
          boxShadow: '0 3.2px 16px rgba(0,0,0,0.1)',
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: '1.6%',
          boxSizing: 'border-box',
          maxHeight: '100%',
          minWidth: 0,
        }}>
          <VirtualTryOnWidget config={mergedConfig} previewMode />
        </div>
      </div>
    </div>
  );
};

export default WidgetCustomization;
