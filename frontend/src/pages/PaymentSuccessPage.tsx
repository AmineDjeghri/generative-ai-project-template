import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const PaymentSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  useEffect(() => {
    const timer = setTimeout(() => navigate('/subscription'), 4000);
    return () => clearTimeout(timer);
  }, [navigate]);

  return (
    <>
      <div className="animated-bg"></div>
      <div className="floating-orbs">
        <div className="orb"></div>
        <div className="orb"></div>
        <div className="orb"></div>
      </div>
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <h1 style={{ color: 'white', fontSize: 36, marginBottom: 16, fontWeight: 700, letterSpacing: 1 }}>Payment Successful!</h1>
        <p style={{ color: 'white', fontSize: 18, marginBottom: 32 }}>Thank you for your purchase. Your credits will be added shortly.<br/>Redirecting to Credits & Billing...</p>
        <button onClick={() => navigate('/subscription')} style={{ padding: '12px 32px', borderRadius: 8, background: '#4ecdc4', color: 'white', fontWeight: 600, fontSize: 18, border: 'none', cursor: 'pointer', marginTop: 12 }}>Go to Credits & Billing</button>
      </div>
    </>
  );
};

export default PaymentSuccessPage;
