import React, { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import { api } from '../config/apiConfig';

const IntegrationPage: React.FC = () => {
  const { token } = useAuth();
  const [apiKey, setApiKey] = useState<string>('');
  const [embedCode, setEmbedCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      if (!token) return;
      setIsLoading(true);
      try {
        // Fetch API key
        const apiKeyRes = await api.getWidgetConfig(token);
        if (apiKeyRes.ok) {
          const apiKeyData = await apiKeyRes.json();
          setApiKey(apiKeyData.api_key);
        }

        // Fetch embed code
        const embedRes = await api.getWidgetEmbedCode(token);
        if (embedRes.ok) {
          const embedData = await embedRes.json();
          setEmbedCode(embedData.embed_code);
        }
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, [token]);

  const handleRegenerate = async () => {
    if (!token) return;
    setIsLoading(true);
    try {
      // Regenerate API key
      const res = await api.regenerateApiKey(token);
      if (res.ok) {
        const data = await res.json();
        setApiKey(data.api_key);

        // Fetch updated embed code with new API key
        const embedRes = await api.getWidgetEmbedCode(token);
        if (embedRes.ok) {
          const embedData = await embedRes.json();
          setEmbedCode(embedData.embed_code);
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      padding: '25.6px',
      minHeight: 'calc(100vh - 56px)'
    }}>
      <div style={{
        width: '100%',
        maxWidth: 1400,
        padding: 25.6,
        marginTop: 6.4,
      }}>
        <h2 style={{ fontSize: 24, fontWeight: 800, marginBottom: 28.8, color: '#fff', letterSpacing: 0.8, alignSelf: 'flex-start', fontFamily: 'Poppins, Inter, -apple-system, BlinkMacSystemFont, sans-serif' }}>
          Integration & API Key
        </h2>
        <div style={{
          background: 'rgba(255,255,255,0.10)',
          borderRadius: 19.2,
          boxShadow: '0 6.4px 25.6px 0 rgba(31, 38, 135, 0.18)',
          padding: '2rem 2.8rem 2rem 2.8rem',
          color: 'white',
          border: '2px solid rgba(255,255,255,0.18)',
          backdropFilter: 'blur(19.2px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
          justifyContent: 'flex-start',
          width: '100%',
        }}>
          <div style={{ width: '100%', marginBottom: 32 }}>
            <div style={{ fontWeight: 600, marginBottom: 6.4, color: '#bfcfff' }}>Your API Key</div>
            <div style={{
              wordBreak: 'break-all',
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              gap: '0.8rem',
              background: 'rgba(255,255,255,0.08)',
              borderRadius: 9.6,
              padding: '0.8rem 1.2rem',
              fontSize: 12.8,
              color: '#fff',
            }}>
              {apiKey || 'Loading API key...'}
              <button
                onClick={handleRegenerate}
                style={{
                  background: '#4a5568',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3.2px',
                  padding: '0.2rem 0.6rem',
                  fontSize: '0.64rem',
                  cursor: 'pointer',
                  opacity: isLoading ? 0.6 : 1,
                }}
                disabled={isLoading}
              >
                {isLoading ? 'Regenerating...' : 'Regenerate'}
              </button>
              <button
                onClick={() => navigator.clipboard.writeText(apiKey)}
                style={{
                  background: 'rgba(255,255,255,0.2)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '3.2px',
                  padding: '0.2rem 0.4rem',
                  fontSize: '0.56rem',
                  cursor: 'pointer',
                }}
                disabled={!apiKey}
              >
                Copy
              </button>
            </div>
            <div style={{ fontSize: '0.76rem', color: '#bfcfff', marginTop: 6.4 }}>Use this API key to authenticate your widget and API requests. Keep it secret!</div>
          </div>
          <div style={{ width: '100%' }}>
            <div style={{ fontWeight: 600, marginBottom: 6.4, color: '#bfcfff' }}>Embed Code</div>
            <div style={{
              background: '#181c2f',
              borderRadius: 9.6,
              padding: '1.2rem',
              border: '1.2px solid #333',
              marginBottom: 6.4,
              fontFamily: 'monospace',
              fontSize: 12,
              color: '#fff',
              position: 'relative',
            }}>
              <pre style={{
                margin: 0,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
                background: 'none',
                fontFamily: 'inherit',
                fontSize: 'inherit',
                color: 'inherit',
              }}>{embedCode}</pre>
              <button
                onClick={() => navigator.clipboard.writeText(embedCode)}
                style={{
                  position: 'absolute',
                  top: 12.8,
                  right: 12.8,
                  background: '#4a5568',
                  color: 'white',
                  border: 'none',
                  borderRadius: 3.2,
                  padding: '0.2rem 0.6rem',
                  fontSize: '0.64rem',
                  cursor: 'pointer',
                  opacity: 0.85,
                }}
                disabled={!embedCode}
              >
                Copy
              </button>
            </div>
            <div style={{ fontSize: '0.76rem', color: '#bfcfff' }}>Paste this code into your website to embed the Virtual Try-On widget. Replace <code>YOUR_PRODUCT_ID</code> with your actual product's ID.</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntegrationPage;
