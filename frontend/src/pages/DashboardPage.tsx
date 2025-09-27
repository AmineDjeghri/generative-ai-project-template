import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { api, apiCall } from '../config/apiConfig';
import { getApiBaseUrl } from '../widget/apiUtils';

interface DashboardData {
  products: {
    total: number;
    recent: Array<{
      id: string;
      name: string;
      sku: string;
      category?: string;
      images: string[];
    }>;
  };
  analytics: {
    totalTryOns: number;
    widgetOpens: number;
    conversionRate: number;
    errorRate: number;
    uniqueVisitors: number;
    uniqueSessions: number;
  };
  subscription: {
    currentCredits: number;
    totalCredits: number;
    usedThisPeriod: number;
    costPerCredit: number;
    totalSpent: number;
  };
  recentTransactions: Array<{
    id: string;
    date: string;
    amount: number;
    description: string;
  }>;
}

const DashboardPage: React.FC = () => {
  const { token } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!token) return;

      try {
        setLoading(true);
        setError(null);

        // Fetch products
        const productsRes = await api.getProducts(token);
        const productsData = await productsRes.json();

        // Fetch analytics (last 30 days)
        const endDate = new Date().toISOString().slice(0, 10);
        const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
        const analyticsRes = await fetch(`${getApiBaseUrl()}/api/analytics/summary?start_date=${startDate}&end_date=${endDate}&period=daily`);
        const analyticsData = await analyticsRes.json();

        // Fetch subscription data
        const creditsRes = await apiCall('/credits', { method: 'GET' }, token);
        const creditsData = await creditsRes.json();

        // Fetch usage analytics to get proper cost per credit calculation
        const usageRes = await apiCall('/usage/analytics?period=monthly', { method: 'GET' }, token);
        const usageData = await usageRes.json();

        // Fetch recent transactions from credit_purchase table
        const transactionsRes = await apiCall('/credit-purchases?limit=3', { method: 'GET' }, token);
        const transactionsData = await transactionsRes.json();

        // Calculate conversion rate
        const conversionRate = analyticsData.kpis?.widgetOpens
          ? (analyticsData.kpis.totalTryOns / analyticsData.kpis.widgetOpens) * 100
          : 0;

        // Calculate error rate
        const errorRate = analyticsData.kpis?.totalEvents
          ? (analyticsData.kpis.totalErrors / analyticsData.kpis.totalEvents) * 100
          : 0;

        setData({
          products: {
            total: productsData.length,
            recent: productsData.slice(0, 5) // Last 5 products
          },
          analytics: {
            totalTryOns: analyticsData.kpis?.totalTryOns || 0,
            widgetOpens: analyticsData.kpis?.widgetOpens || 0,
            conversionRate,
            errorRate,
            uniqueVisitors: analyticsData.kpis?.uniqueVisitors || 0,
            uniqueSessions: analyticsData.kpis?.uniqueSessions || 0
          },
          subscription: {
            currentCredits: creditsData.credits || 0,
            totalCredits: usageData.totalCredits || 0,
            usedThisPeriod: usageData.usedThisPeriod || 0,
            costPerCredit: usageData.costPerCredit || 0,
            totalSpent: usageData.totalMoney || 0
          },
          recentTransactions: transactionsData.slice(0, 3) // Last 3 transactions
        });
      } catch (err) {
        setError('Failed to load dashboard data');
        console.error('Dashboard data error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [token]);

  const getImageUrl = (url: string) => {
    if (url.startsWith('http') || url.startsWith('blob:')) {
      return url;
    }
    return `${getApiBaseUrl()}/api/${url.startsWith('/') ? url.substring(1) : url}`;
  };

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '32px',
        minHeight: 'calc(100vh - 70px)'
      }}>
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 400
        }}>
          <div style={{
            width: 48,
            height: 48,
            border: '6px solid #e5e7eb',
            borderTop: '6px solid #667eea',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            marginBottom: 18
          }} />
          <div style={{ color: 'white', fontSize: 18, fontWeight: 500 }}>Loading dashboard...</div>
          <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '32px',
        minHeight: 'calc(100vh - 70px)'
      }}>
        <div style={{ color: '#ff6b6b', fontSize: 18 }}>{error}</div>
      </div>
    );
  }

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
      }}>
        <h2 style={{
          fontWeight: 700,
          fontSize: 32,
          color: 'white',
          letterSpacing: 1,
          marginBottom: 24
        }}>
          Dashboard Overview
        </h2>

        {/* KPI Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: 24,
          marginBottom: 32
        }}>
          <div style={{
            background: 'rgba(255,255,255,0.10)',
            borderRadius: 20,
            padding: 24,
            border: '1.5px solid rgba(255,255,255,0.18)',
          }}>
            <h3 style={{ color: 'white', marginBottom: 12, fontSize: 16 }}>Total Products</h3>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#667eea' }}>
              {data?.products.total || 0}
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>
              Products in catalog
            </div>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.10)',
            borderRadius: 20,
            padding: 24,
            border: '1.5px solid rgba(255,255,255,0.18)',
          }}>
            <h3 style={{ color: 'white', marginBottom: 12, fontSize: 16 }}>Current Credits</h3>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <div style={{ fontSize: 32, fontWeight: 700, color: '#4ecdc4' }}>
                {data?.subscription.currentCredits || 0}
              </div>
              {data?.subscription.costPerCredit && data.subscription.costPerCredit > 0 && (
                <div style={{ fontSize: 16, color: 'rgba(255,255,255,0.7)' }}>
                  ≈ €{((data.subscription.currentCredits || 0) * data.subscription.costPerCredit).toFixed(2)}
                </div>
              )}
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>
              credits available
            </div>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.10)',
            borderRadius: 20,
            padding: 24,
            border: '1.5px solid rgba(255,255,255,0.18)',
          }}>
            <h3 style={{ color: 'white', marginBottom: 12, fontSize: 16 }}>Total Try-Ons</h3>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#f093fb' }}>
              {data?.analytics.totalTryOns || 0}
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>
              Widget interactions
            </div>
          </div>

          <div style={{
            background: 'rgba(255,255,255,0.10)',
            borderRadius: 20,
            padding: 24,
            border: '1.5px solid rgba(255,255,255,0.18)',
          }}>
            <h3 style={{ color: 'white', marginBottom: 12, fontSize: 16 }}>Conversion Rate</h3>
            <div style={{ fontSize: 32, fontWeight: 700, color: '#43e97b' }}>
              {data?.analytics.conversionRate ? `${data.analytics.conversionRate.toFixed(1)}%` : '0%'}
            </div>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)', marginTop: 8 }}>
              Try-on completion rate
            </div>
          </div>
        </div>



        {/* Recent Activity & Usage Overview */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 32
        }}>
          {/* Recent Products */}
          <div style={{
            background: 'rgba(255,255,255,0.10)',
            borderRadius: 20,
            padding: 24,
            border: '1.5px solid rgba(255,255,255,0.18)',
          }}>
            <h3 style={{ color: 'white', fontWeight: 600, fontSize: 18, marginBottom: 16 }}>
              Recent Products
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {data?.products.recent.map((product, index) => (
                <div key={product.id} style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 12,
                  background: 'rgba(255,255,255,0.05)',
                  borderRadius: 8
                }}>
                  {product.images.length > 0 && (
                    <img
                      src={getImageUrl(product.images[0])}
                      alt={product.name}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 6,
                        objectFit: 'cover'
                      }}
                    />
                  )}
                  <div style={{ flex: 1 }}>
                    <div style={{ color: 'white', fontWeight: 500, fontSize: 14 }}>
                      {product.name}
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                      SKU: {product.sku}
                    </div>
                  </div>
                </div>
              ))}
              {(!data?.products.recent || data.products.recent.length === 0) && (
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', padding: 20 }}>
                  No products yet
                </div>
              )}
            </div>
          </div>

          {/* Usage Overview */}
          <div style={{
            background: 'rgba(255,255,255,0.10)',
            borderRadius: 20,
            padding: 24,
            border: '1.5px solid rgba(255,255,255,0.18)',
          }}>
            <h3 style={{ color: 'white', fontWeight: 600, fontSize: 18, marginBottom: 8 }}>
              Usage Overview
            </h3>
            <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 16 }}>
              Last 30 days ({new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toLocaleDateString()} - {new Date().toLocaleDateString()})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: '1px solid rgba(255,255,255,0.1)'
              }}>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>Widget Opens</span>
                <span style={{ color: 'white', fontWeight: 600 }}>{data?.analytics.widgetOpens || 0}</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 0',
                borderBottom: '1px solid rgba(255,255,255,0.1)'
              }}>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>Unique Visitors</span>
                <span style={{ color: 'white', fontWeight: 600 }}>{data?.analytics.uniqueVisitors || 0}</span>
              </div>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '12px 0'
              }}>
                <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>Error Rate</span>
                <span style={{ color: '#ff6b6b', fontWeight: 600 }}>
                  {data?.analytics.errorRate ? `${data.analytics.errorRate.toFixed(1)}%` : '0%'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        {data?.recentTransactions && data.recentTransactions.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <h3 style={{ color: 'white', fontWeight: 600, fontSize: 18, marginBottom: 16 }}>
              Recent Transactions
            </h3>
            <div style={{
              background: 'rgba(255,255,255,0.10)',
              borderRadius: 20,
              padding: 24,
              border: '1.5px solid rgba(255,255,255,0.18)',
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {data.recentTransactions.map((transaction) => (
                  <div key={transaction.id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '12px 0',
                    borderBottom: '1px solid rgba(255,255,255,0.1)'
                  }}>
                    <div>
                      <div style={{ color: 'white', fontWeight: 500, fontSize: 14 }}>
                        {transaction.description}
                      </div>
                      <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12 }}>
                        {new Date(transaction.date).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ color: '#4ecdc4', fontWeight: 600, fontSize: 16 }}>
                      ${transaction.amount.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DashboardPage;
