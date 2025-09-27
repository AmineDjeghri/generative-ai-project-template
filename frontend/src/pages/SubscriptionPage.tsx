import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import type { FC, JSX } from 'react';
import { apiCall, buildApiUrl } from '../config/apiConfig';
import { useAuth } from '../AuthContext';
import { loadStripe } from '@stripe/stripe-js';
import { useLocation } from 'react-router-dom';
import UsageBarChart from '../components/UsageBarChart';

// Mock data types
interface CreditPackage {
  id: string;
  name: string;
  credits: number;
  price: number;
  originalPrice?: number;
  popular?: boolean;
  features: string[];
}

interface UsageData {
  currentCredits: number;
  totalCredits: number;
  usedThisPeriod: number;
  period: string;
  usageHistory: { date: string; credits: number }[];
  start: string;
  end: string;
  average: number;
  balanceHistory: { date: string; balance: number }[];
  costPerCredit: number;
  totalMoney: number;
  totalCreditsPurchased: number;
}

type Invoice = {
  id: string;
  date: string;
  amount: number;
  description: string;
  downloadUrl?: string;
};

const API_BASE = process.env.REACT_APP_BACK_API_URL || '';

const creditPackages: CreditPackage[] = [
  {
    id: 'starter',
    name: 'Starter',
    credits: 100,
    price: 29,
    features: ['100 AI Credits', 'Basic Support', 'Standard Processing']
  },
  {
    id: 'pro',
    name: 'Professional',
    credits: 500,
    price: 99,
    originalPrice: 145,
    popular: true,
    features: ['500 AI Credits', 'Priority Support', 'Fast Processing', 'Analytics Dashboard']
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    credits: 2000,
    price: 299,
    originalPrice: 580,
    features: ['2000 AI Credits', '24/7 Support', 'Ultra Fast Processing', 'Advanced Analytics', 'Custom Integration']
  }
];

const invoices: Invoice[] = [
  {
    id: 'INV-2024-001',
    date: '2024-06-15',
    amount: 99.00,
    description: 'Professional Plan - 500 Credits',
    downloadUrl: '#'
  },
  {
    id: 'INV-2024-002',
    date: '2024-05-15',
    amount: 99.00,
    description: 'Professional Plan - 500 Credits',
    downloadUrl: '#'
  },
  {
    id: 'INV-2024-003',
    date: '2024-04-15',
    amount: 99.00,
    description: 'Professional Plan - 500 Credits',
    downloadUrl: '#'
  },
  {
    id: 'INV-2024-004',
    date: '2024-03-15',
    amount: 29.00,
    description: 'Starter Plan - 100 Credits',
    downloadUrl: '#'
  }
];

const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY!);

const SubscriptionPage: React.FC = () => {
  const { token } = useAuth();
  const location = useLocation();
  const [selectedPackage, setSelectedPackage] = useState<string>('pro');
  const [activeTab, setActiveTab] = useState<'overview' | 'billing' | 'usage'>('overview');
  const [credits, setCredits] = useState<number | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [modalStatus, setModalStatus] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [usageData, setUsageData] = useState<UsageData | null>(null);
  const [usageLoading, setUsageLoading] = useState(false);
  const [usageError, setUsageError] = useState<string | null>(null);
  // Default to weekly for the last 3 months
  const today = new Date();
  const dayOfWeek = today.getDay() === 0 ? 6 : today.getDay() - 1; // Monday=0, Sunday=6
  const end = new Date(today);
  end.setDate(end.getDate() + 1); // Set end date to tomorrow by default
  const start = new Date(today);
  start.setMonth(start.getMonth() - 1);
  // Move start to the Monday of that week
  const startDayOfWeek = start.getDay() === 0 ? 6 : start.getDay() - 1;
  start.setDate(start.getDate() - startDayOfWeek);
  const formatDate = (d: Date) => d.toISOString().slice(0, 10);
  const [period, setPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [startDate, setStartDate] = useState<string>(formatDate(start));
  const [endDate, setEndDate] = useState<string>(formatDate(end));
  // In SubscriptionPage component, add state for toggle
  const [showAs, setShowAs] = useState<'credits' | 'money'>('credits');
  const [invoicesLoading, setInvoicesLoading] = useState(false);

  // Fetch credits for Overview tab
  useEffect(() => {
    if (activeTab === 'overview' && token) {
      setLoading(true);
      setError(null);
      apiCall('/credits', { method: 'GET' }, token)
        .then(res => res.ok ? res.json() : Promise.reject(res))
        .then(data => setCredits(data.credits))
        .catch(err => setError('Failed to load credits'))
        .finally(() => setLoading(false));
    }
  }, [activeTab, token]);

  // Fetch invoices for Billing tab
  useEffect(() => {
    if (activeTab === 'billing' && token) {
      setInvoicesLoading(true);
      setError(null);
      apiCall('/stripe/transactions', { method: 'GET' }, token)
        .then(res => res.ok ? res.json() : Promise.reject(res))
        .then(data => setInvoices(data))
        .catch(err => setError('Failed to load invoices'))
        .finally(() => setInvoicesLoading(false));
    }
  }, [activeTab, token]);

  // Usage Analytics filter state and effect (local to Usage tab)
  const [analyticsPeriod, setAnalyticsPeriod] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [analyticsStartDate, setAnalyticsStartDate] = useState<string>(formatDate(start));
  const [analyticsEndDate, setAnalyticsEndDate] = useState<string>(formatDate(end));
  useEffect(() => {
    if (activeTab === 'usage' && token) {
      setUsageLoading(true);
      setUsageError(null);
      const params = new URLSearchParams();
      params.append('period', analyticsPeriod);
      if (analyticsStartDate) params.append('start_date', analyticsStartDate);
      if (analyticsEndDate) params.append('end_date', analyticsEndDate);
      apiCall(`/usage/analytics?${params.toString()}`, { method: 'GET' }, token)
        .then(res => res.ok ? res.json() : Promise.reject(res))
        .then(data => setUsageData(data))
        .catch(err => setUsageError('Failed to load usage analytics'))
        .finally(() => setUsageLoading(false));
    }
  }, [activeTab, token, analyticsPeriod, analyticsStartDate, analyticsEndDate]);

  useEffect(() => {
    // Show modal if status param is present
    const params = new URLSearchParams(location.search);
    const status = params.get('status');
    if (status === 'success' || status === 'cancel' || status === 'failed') {
      setModalStatus(status);
      setShowModal(true);
    }
  }, [location.search, token]);

  useEffect(() => {
    if (showModal) {
      const timer = setTimeout(() => setShowModal(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [showModal]);

  const fetchUsageData = async (selectedPeriod = period, sDate = startDate, eDate = endDate) => {
    setUsageLoading(true);
    setUsageError(null);
    try {
      const params = new URLSearchParams();
      params.append('period', selectedPeriod);
      if (sDate) params.append('start_date', sDate);
      if (eDate) params.append('end_date', eDate);
      const safeToken = token || undefined;
      const res = await apiCall(`/usage/analytics?${params.toString()}`, { method: 'GET' }, safeToken);
      if (!res.ok) {
        const errText = await res.text();
        throw new Error(errText);
      }
      const data = await res.json();
      setUsageData(data);
    } catch (err: any) {
      setUsageError(err.message || 'Failed to load usage analytics');
    } finally {
      setUsageLoading(false);
    }
  };

  useEffect(() => {
    if (token) fetchUsageData();
    // eslint-disable-next-line
  }, [token]);

  const handleStripePurchase = async (pkg: CreditPackage) => {
    setBuying(true);
    setBuyError(null);
    setSuccessMsg(null);
    try {
      const safeToken = token || undefined;
      const res = await apiCall('/stripe/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: pkg.price,
          credits: pkg.credits
        })
      }, safeToken);
      if (!res.ok) {
        const errText = await res.text();
        console.error('Failed to create Stripe session:', errText);
        throw new Error('Failed to create Stripe session');
      }
      const data = await res.json();
      const stripe = await stripePromise;
      if (stripe && data.checkout_url) {
        window.location.href = data.checkout_url;
      } else {
        throw new Error('Stripe not loaded or checkout_url missing');
      }
    } catch (err: any) {
      setBuyError(err.message || 'Failed to start Stripe checkout');
    } finally {
      setBuying(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return '#4ecdc4';
      case 'pending': return '#ffd93d';
      case 'failed': return '#ff6b6b';
      default: return '#95a5a6';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'Paid';
      case 'pending': return 'Pending';
      case 'failed': return 'Failed';
      default: return 'Unknown';
    }
  };

  // Use backend values from usageData
  const costPerCredit = usageData?.costPerCredit || 0;
  const totalMoney = usageData?.totalMoney || 0;
  const totalCreditsPurchased = usageData?.totalCreditsPurchased || 0;

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      padding: '32px',
      minHeight: 'calc(100vh - 70px)'
    }}>
      <div style={{
        width: '100%',
        maxWidth: 1400,
        padding: 32,
        background: 'rgba(255,255,255,0.05)',
        borderRadius: 24,
        border: '1.5px solid rgba(255,255,255,0.18)',
        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
        backdropFilter: 'blur(8px)',
        position: 'relative'
      }}>
        {loading || credits === null || !usageData || !invoices ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
            <div style={{ width: 48, height: 48, border: '6px solid #e5e7eb', borderTop: '6px solid #4ecdc4', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 18 }} />
            <div style={{ color: '#fff', fontSize: 18, fontWeight: 500 }}>Loading billing data...</div>
            <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
          </div>
        ) : (
          <>
            {showModal && modalStatus && (
              <div style={{
                position: 'fixed',
                top: 32,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 2000,
                minWidth: 340,
                maxWidth: '90vw',
                background: modalStatus === 'success'
                  ? '#4ecdc4'
                  : modalStatus === 'cancel'
                    ? '#ffd93d'
                    : '#ff6b6b',
                color: modalStatus === 'cancel' ? '#333' : 'white',
                borderRadius: 18,
                boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                padding: '28px 40px 24px 40px',
                textAlign: 'center',
                fontFamily: 'Poppins, Inter, -apple-system, BlinkMacSystemFont, sans-serif',
                fontWeight: 600,
                fontSize: 18,
                animation: 'toastSlideDown 0.5s cubic-bezier(0.4,2,0.6,1)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'auto',
              }}>
                <button onClick={() => setShowModal(false)} style={{ position: 'absolute', top: 10, right: 18, background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', opacity: 0.7 }}>×</button>
                {modalStatus === 'success' && (
                  <>
                    {/* Animated checkmark and confetti */}
                    <div style={{ position: 'relative', marginBottom: 12, width: 60, height: 60 }}>
                      <svg width="60" height="60" viewBox="0 0 60 60">
                        <circle cx="30" cy="30" r="28" fill="none" stroke="#fff" strokeWidth="4" opacity="0.2" />
                        <polyline points="18,32 28,42 44,22" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
                          <animate attributeName="stroke-dasharray" from="0,60" to="60,0" dur="0.7s" fill="freeze" />
                        </polyline>
                      </svg>
                      {/* Confetti SVG burst */}
                      <svg width="60" height="60" style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}>
                        <circle cx="10" cy="10" r="3" fill="#ff6b6b">
                          <animate attributeName="cy" from="10" to="-10" dur="0.7s" fill="freeze" />
                        </circle>
                        <circle cx="50" cy="10" r="3" fill="#4ecdc4">
                          <animate attributeName="cy" from="10" to="-10" dur="0.7s" fill="freeze" />
                        </circle>
                        <circle cx="30" cy="50" r="3" fill="#ffd93d">
                          <animate attributeName="cy" from="50" to="70" dur="0.7s" fill="freeze" />
                        </circle>
                      </svg>
                    </div>
                    <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 6 }}>Payment Successful!</div>
                    <div style={{ fontSize: 16, fontWeight: 400 }}>Thank you for your purchase. Your credits will be added shortly.</div>
                  </>
                )}
                {modalStatus === 'cancel' && (
                  <>
                    {/* Animated sad face */}
                    <div style={{ fontSize: 44, marginBottom: 10, animation: 'shake 0.7s' }}>😕</div>
                    <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 6 }}>Payment Canceled</div>
                    <div style={{ fontSize: 16, fontWeight: 400 }}>Your payment was canceled. No credits were added.</div>
                  </>
                )}
                {modalStatus === 'failed' && (
                  <>
                    {/* Animated sad face */}
                    <div style={{ fontSize: 44, marginBottom: 10, animation: 'shake 0.7s' }}>😞</div>
                    <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 6 }}>Payment Failed</div>
                    <div style={{ fontSize: 16, fontWeight: 400 }}>There was an error processing your payment. Please try again or contact support.</div>
                  </>
                )}
                <style>{`
                  @keyframes toastSlideDown { 0% { transform: translate(-50%, -40px); opacity: 0; } 100% { transform: translate(-50%, 0); opacity: 1; } }
                  @keyframes shake { 0% { transform: translateX(0); } 20% { transform: translateX(-8px); } 40% { transform: translateX(8px); } 60% { transform: translateX(-8px); } 80% { transform: translateX(8px); } 100% { transform: translateX(0); } }
                `}</style>
              </div>
            )}
            <h2 style={{ fontWeight: 700, fontSize: 32, color: 'white', letterSpacing: 1, marginBottom: 24 }}>
              Credits & Billing
            </h2>

            {/* Info box about credits */}
            <div style={{
              background: 'rgba(76,205,196,0.12)',
              color: '#4ecdc4',
              borderRadius: 12,
              padding: '16px 24px',
              marginBottom: 24,
              fontSize: 15,
              fontWeight: 500,
              border: '1.5px solid #4ecdc4',
              width: '100%'
            }}>
              <span style={{ color: '#fff', fontWeight: 700 }}>How credits work:</span> Buy credits in advance and use them to generate images. Each image generation consumes credits. Top up anytime—no recurring subscription required.
            </div>

            {/* Tab Navigation */}
            <div style={{
              display: 'flex',
              gap: 8,
              marginBottom: 32,
              borderBottom: '1px solid rgba(255,255,255,0.1)',
              paddingBottom: 16
            }}>
              {[
                { id: 'overview', label: 'Overview' },
                { id: 'billing', label: 'Billing History' },
                { id: 'usage', label: 'Usage Analytics' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  style={{
                    background: activeTab === tab.id ? 'rgba(255,255,255,0.2)' : 'transparent',
                    border: 'none',
                    padding: '12px 24px',
                    borderRadius: 12,
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: 16,
                    fontWeight: activeTab === tab.id ? 600 : 400,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div>
                {/* Current Plan & Credits */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                  gap: 24,
                  marginBottom: 32
                }}>
                  <div style={{
                    background: 'rgba(255,255,255,0.10)',
                    borderRadius: 20,
                    padding: 24,
                    border: '1.5px solid rgba(255,255,255,0.18)',
                  }}>
                    <h3 style={{ color: 'white', marginBottom: 12, fontSize: 18 }}>Current Credits</h3>
                    <div style={{ fontSize: 36, fontWeight: 700, color: '#4ecdc4', marginBottom: 8 }}>
                      {credits ? credits.toLocaleString() : 'Loading...'}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 8 }}>
                      credits available
                    </div>
                  </div>
                  <div />
                  <div />
                </div>

                {/* Credit Packages */}
                <h3 style={{ color: 'white', marginBottom: 24, fontSize: 24, fontWeight: 600 }}>
                  Buy More Credits
                </h3>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
                  gap: 24,
                  marginBottom: 32
                }}>
                  {creditPackages.map(pkg => (
                    <div
                      key={pkg.id}
                      style={{
                        background: pkg.popular ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.10)',
                        borderRadius: 20,
                        padding: 24,
                        border: pkg.popular ? '2px solid #4ecdc4' : '1.5px solid rgba(255,255,255,0.18)',
                        position: 'relative',
                        transition: 'all 0.3s ease',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        height: '100%'
                      }}
                    >
                      {pkg.popular && (
                        <div style={{
                          position: 'absolute',
                          top: -12,
                          left: '50%',
                          transform: 'translateX(-50%)',
                          background: '#4ecdc4',
                          color: 'white',
                          padding: '4px 16px',
                          borderRadius: 12,
                          fontSize: 12,
                          fontWeight: 600,
                          zIndex: 2,
                        }}>
                          MOST POPULAR
                        </div>
                      )}
                      {pkg.originalPrice && (
                        <div style={{
                          position: 'absolute',
                          top: -12,
                          right: 12,
                          background: '#ffd93d',
                          color: '#333',
                          padding: '4px 12px',
                          borderRadius: 12,
                          fontSize: 12,
                          fontWeight: 600,
                          zIndex: 2,
                        }}>
                          Save {Math.round(100 - (pkg.price / pkg.originalPrice) * 100)}%
                        </div>
                      )}
                      <h4 style={{ color: 'white', marginBottom: 8, fontSize: 20, fontWeight: 600, textAlign: 'center' }}>
                        {pkg.name}
                      </h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span style={{ fontSize: 32, fontWeight: 700, color: '#4ecdc4' }}>
                          €{pkg.price}
                        </span>
                        {pkg.originalPrice && (
                          <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', textDecoration: 'line-through', marginLeft: 8 }}>
                            €{pkg.originalPrice}
                          </span>
                        )}
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 }}>
                      </div>
                      <div style={{ marginTop: 12, marginBottom: 12 }}>
                        <ul style={{ paddingLeft: 20, margin: 0 }}>
                          {pkg.features.map((feature, index) => (
                            <li key={index} style={{ color: '#4ecdc4', fontWeight: 500, fontSize: 14, marginBottom: 4, listStyle: 'none', display: 'flex', alignItems: 'center' }}>
                              <span style={{ marginRight: 8 }}>✔️</span> <span style={{ color: 'white' }}>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      <div style={{ marginTop: 'auto' }}>
                        <div style={{ color: '#ffd93d', fontSize: 13, fontWeight: 600, marginBottom: 8, textAlign: 'center' }}>
                          Good for up to {pkg.credits} generations
                        </div>
                        <button
                          onClick={() => handleStripePurchase(pkg)}
                          style={{
                            width: '100%',
                            background: pkg.popular ? '#4ecdc4' : 'rgba(255,255,255,0.1)',
                            color: pkg.popular ? 'white' : 'white',
                            border: 'none',
                            padding: '16px',
                            borderRadius: 12,
                            fontSize: 16,
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          disabled={buying}
                        >
                          Buy
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, marginTop: 12, marginBottom: 32, textAlign: 'center' }}>
                  All prices include VAT. The final amount will be calculated at checkout based on your location.
                </div>
                <h3 style={{ color: 'white', marginBottom: 24, fontSize: 24, fontWeight: 600, textAlign: 'left' }}>
                  FAQ
                </h3>
                <div style={{
                  background: 'rgba(255,255,255,0.07)',
                  borderRadius: 20,
                  border: '1.5px solid rgba(255,255,255,0.13)',
                  boxShadow: '0 2px 16px 0 rgba(76,205,196,0.07)',
                  padding: 32,
                  marginBottom: 32,
                  width: '100%',
                  position: 'relative',
                }}>
                  <details style={{ marginBottom: 12 }}>
                    <summary style={{ fontWeight: 600, fontSize: 16, color: '#4ecdc4', cursor: 'pointer' }}>What are credits?</summary>
                    <div style={{ color: 'white', fontSize: 14, marginTop: 8 }}>
                      Credits are the currency used to access AI features. Each generation or action consumes a certain number of credits.
                    </div>
                  </details>
                  <details style={{ marginBottom: 12 }}>
                    <summary style={{ fontWeight: 600, fontSize: 16, color: '#4ecdc4', cursor: 'pointer' }}>How do I use credits?</summary>
                    <div style={{ color: 'white', fontSize: 14, marginTop: 8 }}>
                      When you use the app’s AI features (e.g., generate images, chat), credits are automatically deducted from your balance.
                    </div>
                  </details>
                  <details style={{ marginBottom: 12 }}>
                    <summary style={{ fontWeight: 600, fontSize: 16, color: '#4ecdc4', cursor: 'pointer' }}>Do credits expire?</summary>
                    <div style={{ color: 'white', fontSize: 14, marginTop: 8 }}>
                      No, credits do not expire as long as your account is active.
                    </div>
                  </details>
                  <details>
                    <summary style={{ fontWeight: 600, fontSize: 16, color: '#4ecdc4', cursor: 'pointer' }}>How is VAT calculated?</summary>
                    <div style={{ color: 'white', fontSize: 14, marginTop: 8 }}>
                      VAT is calculated automatically at checkout based on your billing address and local regulations.
                    </div>
                  </details>
                </div>
              </div>
            )}

            {/* Billing History Tab */}
            {activeTab === 'billing' && (
              <div>
                <h3 style={{ color: 'white', marginBottom: 24, fontSize: 24, fontWeight: 600 }}>
                  Credit Purchase History
                </h3>
                <div style={{ display: 'flex', justifyContent: 'center', width: '100%' }}>
                  <div style={{
                    background: 'rgba(255,255,255,0.10)',
                    borderRadius: 20,
                    padding: 24,
                    border: '1.5px solid rgba(255,255,255,0.18)',
                    maxWidth: 950,
                    width: '100%'
                  }}>
                    {invoicesLoading ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
                        <div style={{ width: 36, height: 36, border: '5px solid #e5e7eb', borderTop: '5px solid #4ecdc4', borderRadius: '50%', animation: 'spin 1s linear infinite', marginBottom: 12 }} />
                        <div style={{ color: '#fff', fontSize: 16, fontWeight: 500 }}>Loading billing history...</div>
                        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
                      </div>
                    ) : (
                      <>
                        <div style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(5, 1fr)',
                          gap: 16,
                          padding: '16px 0',
                          borderBottom: '1px solid rgba(255,255,255,0.1)',
                          fontWeight: 600,
                          color: 'rgba(255,255,255,0.8)',
                          fontSize: 14,
                          textAlign: 'center'
                        }}>
                          <div>Invoice</div>
                          <div>Date</div>
                          <div>Amount</div>
                          <div>Description</div>
                          <div>Actions</div>
                        </div>

                        {invoices.length === 0 && (
                          <div style={{
                            padding: '32px 0',
                            color: 'rgba(255,255,255,0.6)',
                            textAlign: 'center',
                            fontSize: 16,
                            fontWeight: 500
                          }}>
                            No purchases yet. Buy credits to see your billing history here.
                          </div>
                        )}

                        {invoices.map(invoice => {
                          console.log('Invoice ID:', invoice.id, 'Download URL:', invoice.downloadUrl);
                          return (
                            <div
                              key={invoice.id}
                              style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(5, 1fr)',
                                gap: 16,
                                padding: '16px 0',
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                alignItems: 'center',
                                textAlign: 'center'
                              }}
                            >
                              <div style={{ color: 'white', fontWeight: 500, fontSize: 13 }}>
                                #{invoice.id.slice(-5)}
                              </div>
                              <div style={{ color: 'rgba(255,255,255,0.8)' }}>
                                {new Date(invoice.date).toLocaleString(undefined, { month: 'short', day: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </div>
                              <div style={{ color: 'white', fontWeight: 500 }}>${invoice.amount.toFixed(2)}</div>
                              <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14 }}>{invoice.description}</div>
                              <div>
                                <button
                                  style={{
                                    background: invoice.downloadUrl ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                                    border: 'none',
                                    padding: '8px 16px',
                                    borderRadius: 8,
                                    color: invoice.downloadUrl ? 'white' : 'rgba(255,255,255,0.5)',
                                    cursor: invoice.downloadUrl ? 'pointer' : 'not-allowed',
                                    fontSize: 12
                                  }}
                                  disabled={!invoice.downloadUrl}
                                  aria-label={invoice.downloadUrl ? 'View Receipt' : 'Receipt not available'}
                                  onClick={(e) => {
                                    e.preventDefault();
                                    if (invoice.downloadUrl) {
                                      window.open(invoice.downloadUrl, '_blank', 'noopener noreferrer');
                                    }
                                  }}
                                >
                                  View Receipt
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Usage Analytics Tab */}
            {activeTab === 'usage' && (
              <div>
                <h3 style={{ color: 'white', marginBottom: 24, fontSize: 24, fontWeight: 600 }}>
                  Usage Analytics
                </h3>
                {/* Toggle for credits/money and warning message side by side */}
                <div style={{ marginBottom: 24 }}>
                  <div>
                    <button
                      onClick={() => setShowAs('credits')}
                      style={{
                        background: showAs === 'credits' ? '#4ecdc4' : 'rgba(255,255,255,0.08)',
                        color: showAs === 'credits' ? '#fff' : '#4ecdc4',
                        border: 'none',
                        borderRadius: 8,
                        padding: '6px 18px',
                        marginRight: 8,
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Show as Credits
                    </button>
                    <button
                      onClick={() => setShowAs('money')}
                      style={{
                        background: showAs === 'money' ? '#4ecdc4' : 'rgba(255,255,255,0.08)',
                        color: showAs === 'money' ? '#fff' : '#4ecdc4',
                        border: 'none',
                        borderRadius: 8,
                        padding: '6px 18px',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      Show as Money
                    </button>
                  </div>
                  <div style={{ marginTop: 8 }}>
                    <div style={{
                      color: '#e0e0e0',
                      fontSize: 13,
                      lineHeight: 1.4,
                      transition: 'opacity 0.2s',
                      opacity: showAs === 'money' ? 1 : 0,
                      whiteSpace: 'normal',
                      maxWidth: 340,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      wordBreak: 'break-word',
                      fontWeight: 400,
                      pointerEvents: 'none'
                    }}>
                      Money values are estimated using the average cost per credit for this period, based on your purchases. Actual cost may vary due to different plans and bulk discounts.
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 24 }}>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <label htmlFor="period-select" style={{ color: 'white', fontWeight: 500, marginRight: 6 }}>Period:</label>
                    <select
                      id="period-select"
                      value={analyticsPeriod}
                      onChange={e => { setAnalyticsPeriod(e.target.value as any); }}
                      style={{
                        padding: '7px 18px',
                        borderRadius: 10,
                        border: '1.5px solid rgba(255,255,255,0.18)',
                        background: 'rgba(30,32,38,0.92)',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: 15,
                        outline: 'none',
                        boxShadow: '0 2px 8px 0 rgba(0,0,0,0.10)',
                        transition: 'border 0.2s, box-shadow 0.2s, background 0.2s',
                        cursor: 'pointer',
                      }}
                      onFocus={e => e.currentTarget.style.border = '1.5px solid #4ecdc4'}
                      onBlur={e => e.currentTarget.style.border = '1.5px solid rgba(255,255,255,0.18)'}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(40,44,54,1)'}
                      onMouseOut={e => e.currentTarget.style.background = 'rgba(30,32,38,0.92)'}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <label htmlFor="start-date" style={{ color: 'white', fontWeight: 500, marginRight: 6 }}>Start Date:</label>
                    <input
                      id="start-date"
                      type="date"
                      value={analyticsStartDate}
                      onChange={e => { setAnalyticsStartDate(e.target.value); }}
                      style={{
                        padding: '7px 18px',
                        borderRadius: 10,
                        border: '1.5px solid rgba(255,255,255,0.18)',
                        background: 'rgba(30,32,38,0.92)',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: 15,
                        outline: 'none',
                        boxShadow: '0 2px 8px 0 rgba(0,0,0,0.10)',
                        transition: 'border 0.2s, box-shadow 0.2s, background 0.2s',
                        cursor: 'pointer',
                      }}
                      onFocus={e => e.currentTarget.style.border = '1.5px solid #4ecdc4'}
                      onBlur={e => e.currentTarget.style.border = '1.5px solid rgba(255,255,255,0.18)'}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(40,44,54,1)'}
                      onMouseOut={e => e.currentTarget.style.background = 'rgba(30,32,38,0.92)'}
                    />
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center' }}>
                    <label htmlFor="end-date" style={{ color: 'white', fontWeight: 500, marginRight: 6 }}>End Date:</label>
                    <input
                      id="end-date"
                      type="date"
                      value={analyticsEndDate}
                      onChange={e => { setAnalyticsEndDate(e.target.value); }}
                      style={{
                        padding: '7px 18px',
                        borderRadius: 10,
                        border: '1.5px solid rgba(255,255,255,0.18)',
                        background: 'rgba(30,32,38,0.92)',
                        color: '#fff',
                        fontWeight: 600,
                        fontSize: 15,
                        outline: 'none',
                        boxShadow: '0 2px 8px 0 rgba(0,0,0,0.10)',
                        transition: 'border 0.2s, box-shadow 0.2s, background 0.2s',
                        cursor: 'pointer',
                      }}
                      onFocus={e => e.currentTarget.style.border = '1.5px solid #4ecdc4'}
                      onBlur={e => e.currentTarget.style.border = '1.5px solid rgba(255,255,255,0.18)'}
                      onMouseOver={e => e.currentTarget.style.background = 'rgba(40,44,54,1)'}
                      onMouseOut={e => e.currentTarget.style.background = 'rgba(30,32,38,0.92)'}
                    />
                  </div>
                </div>
                {usageLoading ? (
                  <div style={{ color: 'white', fontSize: 16 }}>Loading usage analytics...</div>
                ) : usageError ? (
                  <div style={{ color: '#ff6b6b', fontSize: 16 }}>{usageError}</div>
                ) : usageData && usageData.usageHistory.length > 0 ? (
                  <>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 24, marginBottom: 32 }}>
                      {/* Peak Usage Card */}
                      <div style={{ background: 'rgba(255,255,255,0.10)', borderRadius: 20, padding: 24, border: '1.5px solid rgba(255,255,255,0.18)' }}>
                        <h4 style={{ color: 'white', marginBottom: 12, fontSize: 16 }}>Peak Usage</h4>
                        <div style={{ fontSize: 28, fontWeight: 700, color: '#ff6b6b' }}>
                          {showAs === 'credits'
                            ? (usageData.usageHistory.length > 0 ? Math.max(...usageData.usageHistory.map(m => m.credits)) : 0)
                            : (usageData.usageHistory.length > 0 ? `$${(Math.max(...usageData.usageHistory.map(m => m.credits)) * costPerCredit).toFixed(2)}` : '$0.00')}
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
                          {showAs === 'credits'
                            ? `credits in a ${analyticsPeriod} period`
                            : `money spent in a ${analyticsPeriod} period`}
                        </div>
                      </div>
                      {/* Average Card */}
                      <div style={{ background: 'rgba(255,255,255,0.10)', borderRadius: 20, padding: 24, border: '1.5px solid rgba(255,255,255,0.18)' }}>
                        <h4 style={{ color: 'white', marginBottom: 12, fontSize: 16 }}>Average</h4>
                        <div style={{ fontSize: 28, fontWeight: 700, color: '#667eea' }}>
                          {showAs === 'credits'
                            ? usageData.average
                            : `$${(usageData.average * costPerCredit).toFixed(2)}`}
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
                          {showAs === 'credits'
                            ? `credits per ${analyticsPeriod} period`
                            : `money spent per ${analyticsPeriod} period`}
                        </div>
                      </div>
                      {/* Total Used Card */}
                      <div style={{ background: 'rgba(255,255,255,0.10)', borderRadius: 20, padding: 24, border: '1.5px solid rgba(255,255,255,0.18)' }}>
                        <h4 style={{ color: 'white', marginBottom: 12, fontSize: 16 }}>Total Used</h4>
                        <div style={{ fontSize: 28, fontWeight: 700, color: '#4ecdc4' }}>
                          {showAs === 'credits'
                            ? usageData.totalCredits
                            : `$${(usageData.totalCredits * costPerCredit).toFixed(2)}`}
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14 }}>
                          {showAs === 'credits'
                            ? 'total credits used'
                            : 'total money spent'}
                        </div>
                      </div>
                    </div>
                    {/* Usage Analytics Card */}
                    <div style={{
                      background: 'rgba(255,255,255,0.07)',
                      borderRadius: 20,
                      border: '1.5px solid rgba(255,255,255,0.13)',
                      boxShadow: '0 2px 16px 0 rgba(76,205,196,0.07)',
                      padding: 32,
                      marginBottom: 40,
                      width: '100%',
                      position: 'relative',
                    }}>
                      <div style={{ fontWeight: 600, fontSize: 18, color: 'white', marginBottom: 8 }}>Credit Usage per {analyticsPeriod.charAt(0).toUpperCase() + analyticsPeriod.slice(1)}</div>
                      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 24 }}>The bars below show the number of credits consumed in each period for your account.</div>
                      {/* Before rendering UsageBarChart, calculate costPerCredit for the period */}
                      <UsageBarChart
                        usageHistory={usageData.usageHistory}
                        period={analyticsPeriod}
                        height={320}
                        accentGradient={["#4ecdc4", "#44a08d"]}
                        showAs={showAs}
                        costPerCredit={costPerCredit}
                      />
                    </div>

                    {/* Balance Evolution Card */}
                    <div style={{
                      background: 'rgba(255,255,255,0.07)',
                      borderRadius: 20,
                      border: '1.5px solid rgba(255,255,255,0.13)',
                      boxShadow: '0 2px 16px 0 rgba(76,205,196,0.07)',
                      padding: 32,
                      marginBottom: 32,
                      width: '100%',
                      position: 'relative',
                    }}>
                      <div style={{ fontWeight: 600, fontSize: 18, color: 'white', marginBottom: 8 }}>Balance Evolution</div>
                      <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 24 }}>The curve below shows your remaining credit balance at the end of each period, reflecting top-ups and usage over time.</div>
                      {/* In SubscriptionPage, pass showAs and costPerCredit to BalanceCurve */}
                      <BalanceCurve
                        balanceHistory={usageData.balanceHistory}
                        height={320}
                        accentGradient={["#4ecdc4", "#44a08d"]}
                        showAs={showAs}
                        costPerCredit={costPerCredit}
                      />
                    </div>
                  </>
                ) : null}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default SubscriptionPage;

// Custom hook to measure container width
function useContainerWidth() {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>(0);
  useLayoutEffect(() => {
    function updateWidth() {
      if (ref.current) setWidth(ref.current.offsetWidth);
    }
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);
  return [ref, width] as const;
}

function BalanceCurve({ balanceHistory, height, accentGradient, showAs = 'credits', costPerCredit = 0 }: {
  balanceHistory: { date: string; balance: number }[];
  height: number;
  accentGradient: [string, string];
  showAs?: 'credits' | 'money';
  costPerCredit?: number;
}): JSX.Element {
  const [hovered, setHovered] = useState<number | null>(null);
  const [containerRef, width] = useContainerWidth();
  const n = balanceHistory.length;
  // Use either credits or money for the points
  const values = balanceHistory.map(b => showAs === 'credits' ? b.balance : +(b.balance * costPerCredit).toFixed(2));
  const balanceMax = Math.max(...values);
  const balanceMin = Math.min(...values);
  const balanceRange = balanceMax - balanceMin || 1;
  const labelInterval = Math.ceil(n / 10); // Show labels every 10th bar
  // Smooth path
  function getSmoothPath(points: number[][]): string {
    if (points.length < 2) return '';
    let d = `M${points[0][0]},${points[0][1]}`;
    for (let i = 1; i < points.length; i++) {
      const [x0, y0] = points[i - 1];
      const [x1, y1] = points[i];
      const cx = (x0 + x1) / 2;
      d += ` Q${cx},${y0} ${x1},${y1}`;
    }
    return d;
  }
  const pointList: number[][] = values.map((value, i) => {
    const x = (i + 0.5) * (width / n);
    const y = height - ((value - balanceMin) / balanceRange) * (height - 64) - 16;
    return [x, y];
  });
  const smoothPath = getSmoothPath(pointList);
  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      {width > 0 && (
        <>
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
            {/* Grid lines */}
            {[0.25, 0.5, 0.75].map((frac: number, i: number) => (
              <line
                key={i}
                x1={0}
                x2={width}
                y1={height * frac}
                y2={height * frac}
                stroke="rgba(255,255,255,0.08)"
                strokeWidth={1}
              />
            ))}
            {/* Smooth curve */}
            <path
              d={smoothPath}
              fill="none"
              stroke={`url(#curve-gradient)`}
              strokeWidth={3}
              style={{ filter: 'drop-shadow(0 2px 12px #4ecdc488)' }}
            />
            {/* Points and tooltips */}
            {pointList.map(([x, y]: number[], i: number) => (
              <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
                <circle
                  cx={x}
                  cy={y}
                  r={4}
                  fill="#fff"
                  stroke={accentGradient[0]}
                  strokeWidth={2}
                  style={{ filter: hovered === i ? 'drop-shadow(0 2px 8px #4ecdc488)' : 'none', transition: 'filter 0.2s' }}
                />
                {/* Data label (show on hover or always for mobile) */}
                {(hovered === i) && (
                  <foreignObject x={x - 24} y={y - 40} width={64} height={24} style={{ pointerEvents: 'none' }}>
                    <div style={{ color: '#fff', fontSize: 14, fontWeight: 700, background: 'rgba(30,32,38,0.92)', borderRadius: 8, padding: '2px 0', textAlign: 'center', boxShadow: '0 2px 8px 0 rgba(0,0,0,0.12)' }}>
                      {showAs === 'credits' ? values[i] : `$${values[i]}`}
                    </div>
                  </foreignObject>
                )}
              </g>
            ))}
            {/* Gradient for curve */}
            <defs>
              <linearGradient id="curve-gradient" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={accentGradient[0]} />
                <stop offset="100%" stopColor={accentGradient[1]} />
              </linearGradient>
            </defs>
          </svg>
          {/* X-axis labels below the graph */}
          <div
            style={{
              width: width,
              minWidth: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              color: 'rgba(255,255,255,0.5)',
              marginTop: 32,
              marginBottom: 0,
              alignItems: 'flex-end',
            }}
          >
            {balanceHistory.map((period: { date: string }, i: number) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  height: n > 16 ? 48 : 'auto',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                {(i % labelInterval === 0 || i === n - 1) && (
                  <span
                    style={n > 16 ? {
                      display: 'inline-block',
                      transform: 'rotate(-45deg)',
                      transformOrigin: 'top left',
                      marginTop: 4,
                      marginLeft: 2,
                      marginRight: 2,
                    } : {}}>
                    {period.date}
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
