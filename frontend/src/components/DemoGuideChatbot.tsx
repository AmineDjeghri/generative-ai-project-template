import React, { useState, useEffect, useRef } from 'react';

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

interface DemoGuideChatbotProps {
  onProductTryOn?: (productName: string) => void;
  customSteps?: GuideStep[];
}

// Default guide steps for the demo store
const defaultGuideSteps: GuideStep[] = [
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

const DemoGuideChatbot: React.FC<DemoGuideChatbotProps> = ({
  onProductTryOn,
  customSteps
}) => {
  const [showChatbot, setShowChatbot] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [chatbotMinimized, setChatbotMinimized] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const guideSteps = customSteps || defaultGuideSteps;

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
  }, [showChatbot, guideSteps]);

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

  // Handle product try-on (called from parent component)
  useEffect(() => {
    if (onProductTryOn) {
      // This will be called when parent component triggers product try-on
      const handleProductTryOn = (productName: string) => {
        if (showChatbot && !chatbotMinimized) {
          setMessages(prev => [...prev, {
            id: Date.now().toString(),
            type: 'bot',
            content: `Great! You've opened the virtual try-on for "${productName}". Now you can take a photo or upload one to see how it looks on you! 📸`,
            timestamp: new Date()
          }]);
        }
      };

      // Expose the function to parent component
      (window as any).handleProductTryOn = handleProductTryOn;
    }
  }, [showChatbot, chatbotMinimized, onProductTryOn]);

  return (
    <div style={{
      position: 'fixed',
      bottom: '30px',
      right: '30px',
      zIndex: 1000,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-end'
    }}>
      {/* Chatbot Window */}
      {showChatbot && !chatbotMinimized && (
        <div style={{
          width: '350px',
          height: '500px',
          background: 'rgba(15, 17, 25, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '20px',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}>
          {/* Chat Header */}
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                background: 'rgba(255, 255, 255, 0.2)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px'
              }}>
                🤖
              </div>
              <div>
                <div style={{ color: 'white', fontWeight: 600, fontSize: '14px' }}>
                  AI Shopping Assistant
                </div>
                <div style={{ color: 'rgba(255, 255, 255, 0.8)', fontSize: '12px' }}>
                  Online • Ready to help
                </div>
              </div>
            </div>
            <button
              onClick={() => setChatbotMinimized(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'white',
                fontSize: '20px',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              −
            </button>
          </div>

          {/* Chat Messages */}
          <div style={{
            flex: 1,
            padding: '16px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  display: 'flex',
                  justifyContent: message.type === 'bot' ? 'flex-start' : 'flex-end'
                }}
              >
                <div style={{
                  maxWidth: '80%',
                  padding: '12px 16px',
                  borderRadius: message.type === 'bot' ? '18px 18px 18px 4px' : '18px 18px 4px 18px',
                  background: message.type === 'bot'
                    ? 'rgba(255, 255, 255, 0.1)'
                    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  fontSize: '14px',
                  lineHeight: '1.4'
                }}>
                  {message.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Actions */}
          <div style={{
            padding: '16px',
            borderTop: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            {currentStep < guideSteps.length - 1 && (
              <button
                onClick={() => handleUserResponse('Continue')}
                style={{
                  width: '100%',
                  background: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '12px',
                  borderRadius: '12px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s ease'
                }}
              >
                {guideSteps[currentStep]?.action || 'Continue'}
              </button>
            )}
            <div style={{
              display: 'flex',
              gap: '8px',
              marginTop: '8px'
            }}>
              <button
                onClick={() => handleUserResponse('Tell me more')}
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  border: 'none',
                  padding: '8px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Tell me more
              </button>
              <button
                onClick={() => handleUserResponse('Skip')}
                style={{
                  flex: 1,
                  background: 'rgba(255, 255, 255, 0.1)',
                  color: 'white',
                  border: 'none',
                  padding: '8px',
                  borderRadius: '8px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Chat Button */}
      <button
        onClick={() => {
          if (!showChatbot) {
            setShowChatbot(true);
            setChatbotMinimized(false);
          } else {
            setChatbotMinimized(!chatbotMinimized);
          }
        }}
        style={{
          width: '60px',
          height: '60px',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          border: 'none',
          borderRadius: '50%',
          color: 'white',
          fontSize: '24px',
          cursor: 'pointer',
          boxShadow: '0 8px 24px rgba(102, 126, 234, 0.3)',
          transition: 'all 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          position: 'relative'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 12px 32px rgba(102, 126, 234, 0.4)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.3)';
        }}
      >
        {showChatbot && !chatbotMinimized ? '−' : '💬'}
      </button>
    </div>
  );
};

export default DemoGuideChatbot;
