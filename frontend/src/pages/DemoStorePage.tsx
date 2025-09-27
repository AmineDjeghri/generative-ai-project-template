import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../config/apiConfig';
import DemoGuideChatbot from '../components/DemoGuideChatbot';
import { getApiBaseUrl } from '../widget/apiUtils';

// Widget types are now defined in types/widget.d.ts

interface Product {
  id: string;
  name: string;
  sku: string;
  price?: number;
  page_url?: string;
  category?: string;
  images: string[];
}

interface ChatMessage {
  id: string;
  type: 'bot' | 'user';
  content: string;
  timestamp: Date;
}

interface GuideStep {
  id: string;
  title: string;
  message: string;
  action?: string;
  highlight?: string;
}

// Guide steps for the demo store
const guideSteps: GuideStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to the Demo Store! 👋',
    message: 'Hi! I\'m your AI shopping assistant. Let me show you around our virtual try-on demo store. You can explore products and see how our AI technology works!',
    action: 'Let\'s start exploring!'
  },
  {
    id: 'products',
    title: 'Browse Our Products 🛍️',
    message: 'Here you can see all our demo products. Each product has a "Try It On" button that will open our AI-powered virtual try-on widget.',
    action: 'Try clicking on a product!'
  },
  {
    id: 'try-on',
    title: 'Virtual Try-On Experience ✨',
    message: 'When you click "Try It On", our AI widget will open. You can take a photo or upload one, and our AI will show you how the product looks on you!',
    action: 'Click "Try It On" on any product'
  },
  {
    id: 'widget-features',
    title: 'Widget Features 🎯',
    message: 'The widget includes: camera capture, photo upload, AI processing, and realistic try-on results. It\'s designed to be easy and fun to use!',
    action: 'Experience it yourself!'
  },
  {
    id: 'integration',
    title: 'Easy Integration 🔧',
    message: 'This same widget can be easily integrated into any e-commerce website with just a few lines of code. No complex setup required!',
    action: 'Ready to try it?'
  }
];

const DemoStorePage: React.FC<{ isLoggedIn?: boolean }> = ({ isLoggedIn = false }) => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [apiKey, setApiKey] = useState<string | null>(process.env.REACT_APP_API_KEY || '');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showWidget, setShowWidget] = useState(false);

  // Chatbot state
  const [showChatbot, setShowChatbot] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [chatbotMinimized, setChatbotMinimized] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Initialize chatbot with welcome message
  useEffect(() => {
    if (showChatbot && messages.length === 0) {
      const welcomeStep = guideSteps[0];
      setMessages([{
        id: '1',
        type: 'bot',
        content: welcomeStep.message,
        timestamp: new Date()
      }]);
    }
  }, [showChatbot]);

  // Handle next step in guide
  const handleNextStep = () => {
    if (currentStep < guideSteps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      const step = guideSteps[nextStep];
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        type: 'bot',
        content: step.message,
        timestamp: new Date()
      }]);
    }
  };

  // Handle user response
  const handleUserResponse = (response: string) => {
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      type: 'user',
      content: response,
      timestamp: new Date()
    }]);

    // Auto-advance to next step after a short delay
    setTimeout(() => {
      handleNextStep();
    }, 1000);
  };

  // Load widget script
  useEffect(() => {
    const loadWidgetScript = () => {
      const script = document.createElement('script');
      // Use the same logic as the backend embed code
      const frontUrl = process.env.REACT_APP_FRONT_URL || window.location.origin;
      script.src = `${frontUrl}/virtual-tryon-widget.min.js`;
      script.async = true;
      script.onload = () => {
        console.log('Virtual try-on widget loaded successfully');
      };
      script.onerror = () => {
        console.error('Failed to load virtual try-on widget');
      };
      document.head.appendChild(script);
    };

    // Check if script is already loaded
    const scriptSrc = `${process.env.REACT_APP_FRONT_URL || window.location.origin}/virtual-tryon-widget.min.js`;
    if (!document.querySelector(`script[src="${scriptSrc}"]`)) {
      loadWidgetScript();
    }
  }, []);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await fetch(`${getApiBaseUrl()}/api/demo/first-user-products`);
        if (!response.ok) {
          throw new Error('Failed to fetch products');
        }
        const data = await response.json();
        setProducts(data.products || []);
        // Keep the fake API key instead of using the one from backend
        // setApiKey(data.api_key);
      } catch (err) {
        setError('Failed to load products');
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  const openTryOn = (product: Product) => {
    setSelectedProduct(product);
    setShowWidget(true);

    // Trigger chatbot message for product try-on
    if ((window as any).handleProductTryOn) {
      (window as any).handleProductTryOn(product.name);
    }
  };

  const closeWidget = () => {
    setShowWidget(false);
    setSelectedProduct(null);
    // Destroy the widget when closing
    if (window.VirtualTryOnWidget) {
      window.VirtualTryOnWidget.destroy();
    }
  };

  const handleTryOnComplete = (result: any) => {
    console.log('Try-on completed:', result);
    // You can add a success message or redirect here
  };

  // Initialize widget when modal opens
  useEffect(() => {
    if (showWidget && selectedProduct && apiKey) {
      // Wait a bit for the DOM to be ready
      const timer = setTimeout(() => {
        if (window.VirtualTryOnWidget) {
          window.VirtualTryOnWidget.init({
            apiKey: apiKey,
            productId: selectedProduct.id,
            onTryOnComplete: handleTryOnComplete,
            onClose: closeWidget
          });
        } else {
          console.error('VirtualTryOnWidget not available');
        }
      }, 100);

      return () => clearTimeout(timer);
    }
  }, [showWidget, selectedProduct, apiKey]);

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '18px'
      }}>
        <div style={{
          textAlign: 'center'
        }}>
          <div style={{
            width: 40,
            height: 40,
            border: '4px solid #e5e7eb',
            borderTop: '4px solid #3b82f6',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p>Loading store...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        background: '#0a0a0a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: 'white',
        fontSize: '18px'
      }}>
        {error}
      </div>
    );
  }

  return (
    <>
      {/* Animated Background */}
      <div className="animated-bg"></div>
      <div className="floating-orbs">
        <div className="orb"></div>
        <div className="orb"></div>
        <div className="orb"></div>
      </div>

      {/* Header */}
      <header style={{
        background: 'rgba(10,10,10,0.65)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000
      }}>
        <nav className="container">
          <button
            className="logo"
            onClick={() => navigate('/')}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '1.8rem',
              fontWeight: 800,
              color: 'white'
            }}
          >
            VirtualFit
          </button>
          <ul className="nav-links">
            <li><a href="/#features">Features</a></li>
            <li><a href="/#integration">Integration</a></li>
            <li><a href="/#testimonials">Testimonials</a></li>
            <li><a href="/#pricing">Pricing</a></li>
            <li><a href="/demo-store">Demo Store</a></li>
          </ul>
          <button
            className="cta-button"
            onClick={() => navigate(isLoggedIn ? '/dashboard' : '/login')}
            style={{
              background: 'linear-gradient(135deg, #ff6b6b 0%, #4ecdc4 100%)',
              color: 'white',
              padding: '0.8rem 2rem',
              border: 'none',
              borderRadius: '50px',
              fontWeight: 600,
              fontSize: '0.95rem',
              cursor: 'pointer',
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              textDecoration: 'none',
              display: 'inline-block',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {isLoggedIn ? 'Dashboard' : 'Login'}
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <div style={{
        minHeight: '100vh',
        background: 'transparent',
        paddingTop: '120px',
        paddingBottom: '40px'
      }}>
        {/* Store Header */}
        <div className="container" style={{
          marginBottom: '60px'
        }}>
          <div style={{
            textAlign: 'center',
            color: 'white',
            marginBottom: '60px'
          }}>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: '800',
              marginBottom: '1.5rem',
              lineHeight: '1.1',
              background: 'linear-gradient(135deg, #ffffff 0%, #667eea 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              animation: 'slideInUp 1s cubic-bezier(0.4, 0, 0.2, 1)',
              fontFamily: 'Poppins, Inter, -apple-system, BlinkMacSystemFont, sans-serif'
            }}>
              🛍️ Fashion Store
            </h1>
            <p style={{
              fontSize: '1.2rem',
              color: 'rgba(255, 255, 255, 0.8)',
              marginBottom: '1rem',
              lineHeight: '1.6',
              animation: 'slideInUp 1s cubic-bezier(0.4, 0, 0.2, 1) 0.2s both'
            }}>
              Experience the future of shopping with AI-powered virtual try-on
            </p>
            <p style={{
              fontSize: '1rem',
              color: 'rgba(255, 255, 255, 0.7)',
              animation: 'slideInUp 1s cubic-bezier(0.4, 0, 0.2, 1) 0.4s both'
            }}>
              Try on any product before you buy with our revolutionary virtual try-on technology
            </p>
          </div>
        </div>

        {/* Products Grid */}
        <div className="container">
          {products.length === 0 ? (
            <div style={{
              textAlign: 'center',
              color: 'white',
              padding: '60px 20px'
            }}>
              <div style={{
                fontSize: '3rem',
                marginBottom: '16px'
              }}>
                📦
              </div>
              <h2 style={{
                fontSize: '1.5rem',
                marginBottom: '8px'
              }}>
                No Products Available
              </h2>
              <p style={{
                opacity: '0.8'
              }}>
                Check back later for amazing products with virtual try-on!
              </p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '2rem',
              maxWidth: '1400px',
              margin: '0 auto'
            }}>
              {products.map(product => (
                <div key={product.id} style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '20px',
                  padding: '1.5rem',
                  backdropFilter: 'blur(20px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-10px)';
                  e.currentTarget.style.boxShadow = '0 30px 60px rgba(0, 0, 0, 0.3)';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                }}
                >
                  {/* Product Image */}
                  <div style={{
                    marginBottom: '1.2rem',
                    position: 'relative',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    background: 'rgba(255, 255, 255, 0.05)'
                  }}>
                    {product.images && product.images.length > 0 ? (
                      <img
                        src={product.images[0].startsWith('http') ? product.images[0] : `${getApiBaseUrl()}/api/${product.images[0].startsWith('/') ? product.images[0].substring(1) : product.images[0]}`}
                        alt={product.name}
                        style={{
                          width: '100%',
                          height: '200px',
                          objectFit: 'cover',
                          borderRadius: '16px'
                        }}
                      />
                    ) : (
                      <div style={{
                        width: '100%',
                        height: '200px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRadius: '16px',
                        color: 'rgba(255, 255, 255, 0.5)',
                        fontSize: '3rem'
                      }}>
                        🛍️
                      </div>
                    )}

                    {/* Try-On Badge */}
                    <div style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                      color: 'white',
                      padding: '6px 12px',
                      borderRadius: '20px',
                      fontSize: '0.8rem',
                      fontWeight: '600',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
                    }}>
                      ✨ Virtual Try-On
                    </div>
                  </div>

                  {/* Product Info */}
                  <div style={{
                    marginBottom: '1.2rem'
                  }}>
                    <h3 style={{
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      color: 'white',
                      marginBottom: '0.5rem',
                      lineHeight: '1.4'
                    }}>
                      {product.name}
                    </h3>

                    {product.category && (
                      <p style={{
                        fontSize: '0.9rem',
                        color: 'rgba(255, 255, 255, 0.7)',
                        marginBottom: '0.5rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        fontWeight: '500'
                      }}>
                        {product.category}
                      </p>
                    )}

                    <p style={{
                      fontSize: '0.8rem',
                      color: 'rgba(255, 255, 255, 0.5)',
                      marginBottom: '0.8rem',
                      fontFamily: 'monospace'
                    }}>
                      SKU: {product.sku}
                    </p>

                    <div style={{
                      fontSize: '1.5rem',
                      fontWeight: '700',
                      background: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent',
                      backgroundClip: 'text',
                      marginBottom: '1rem'
                    }}>
                      ${product.price ? product.price.toFixed(2) : 'N/A'}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div style={{
                    display: 'flex',
                    gap: '0.8rem'
                  }}>
                    <button
                      onClick={() => openTryOn(product)}
                      style={{
                        flex: '1',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        color: 'white',
                        border: 'none',
                        padding: '0.8rem 1.2rem',
                        borderRadius: '12px',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.transform = 'scale(1.02)';
                        e.currentTarget.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                        e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                      }}
                    >
                      👕 Try It On
                    </button>

                    {product.page_url && (
                      <button
                        onClick={() => window.open(product.page_url, '_blank')}
                        style={{
                          padding: '0.8rem 1rem',
                          background: 'rgba(255, 255, 255, 0.1)',
                          color: 'white',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          borderRadius: '12px',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.3)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                          e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
                        }}
                      >
                        🔗 View
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{
          textAlign: 'center',
          color: 'white',
          marginTop: '80px',
          padding: '40px 20px',
          opacity: '0.8'
        }}>
          <p style={{
            fontSize: '1rem',
            marginBottom: '16px'
          }}>
            Experience the future of fashion shopping
          </p>
          <p style={{
            fontSize: '0.9rem',
            opacity: '0.7'
          }}>
            Powered by AI Virtual Try-On Technology
          </p>
        </div>
      </div>

      {/* Floating Chatbot */}
      <DemoGuideChatbot />

    </>
  );
};

export default DemoStorePage;
