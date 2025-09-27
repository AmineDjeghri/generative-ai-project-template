import React, { useEffect, useState } from 'react';
import { getApiBaseUrl } from '../widget/apiUtils';
import UsageBarChart from '../components/UsageBarChart';
import { API_CONFIG } from '../config/apiConfig';

// Add helper for percent change
function percentChange(current: number, prev: number): { value: string, up: boolean | null } {
  if (prev === 0 && current === 0) return { value: '0%', up: null };
  if (prev === 0) return { value: '+100%', up: true };
  const change = ((current - prev) / Math.abs(prev)) * 100;
  const up = change > 0 ? true : change < 0 ? false : null;
  return { value: `${change > 0 ? '+' : ''}${change.toFixed(1)}%`, up };
}
// Add sparkline component
const Sparkline: React.FC<{ data: number[], color?: string }> = ({ data, color = '#4ecdc4' }) => {
  if (!data.length) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const width = 80;
  const height = 24;
  return (
    <svg width={width} height={height} style={{ display: 'block', marginTop: 4 }}>
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={data.map((v, i) => `${(i / (data.length - 1)) * width},${height - ((v - min) / range) * (height - 4) - 2}`).join(' ')}
      />
    </svg>
  );
};

const AnalyticsPage: React.FC = () => {
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Add state for date range and aggregation period
  const today = new Date();
  const defaultEnd = today.toISOString().slice(0, 10);
  const [aggregationPeriod, setAggregationPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // Calculate default start date based on period
  const getDefaultStartDate = (period: string) => {
    const today = new Date();
    if (period === 'daily') {
      return new Date(today.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    } else if (period === 'weekly') {
      return new Date(today.getTime() - 21 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    } else { // monthly
      return new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    }
  };

  const [startDate, setStartDate] = useState(getDefaultStartDate('daily'));
  const [endDate, setEndDate] = useState(defaultEnd);

  // Fetch analytics for the selected date range and aggregation period
  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`${getApiBaseUrl()}/api/analytics/summary?start_date=${startDate}&end_date=${endDate}&period=${aggregationPeriod}`)
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch analytics');
        return res.json();
      })
      .then(data => {
        setAnalytics(data);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, [startDate, endDate, aggregationPeriod]);

  // Update date range when period changes
  useEffect(() => {
    setStartDate(getDefaultStartDate(aggregationPeriod));
  }, [aggregationPeriod]);

  const { kpis, trends, eventBreakdown, topProducts, recentEvents } = analytics || {};
  // Prepare previous period KPIs
  const prev = kpis?.prev || {};
  // Prepare sparklines for try-ons
  const tryOnSpark = (trends?.tryOns || []).map((d: any) => d.count);
  // Conversion rates
  const tryOnConv = kpis?.widgetOpens ? (kpis?.totalTryOns / kpis?.widgetOpens) * 100 : 0;
  const prevTryOnConv = prev?.widgetOpens ? (prev?.totalTryOns / prev?.widgetOpens) * 100 : 0;
  const photoConv = kpis?.widgetOpens ? (kpis?.photoUploads / kpis?.widgetOpens) * 100 : 0;
  const prevPhotoConv = prev?.widgetOpens ? (prev?.photoUploads / prev?.widgetOpens) * 100 : 0;
  const errorRate = kpis?.totalEvents ? (kpis?.totalErrors / kpis?.totalEvents) * 100 : 0;
  const prevErrorRate = prev?.totalEvents ? (prev?.totalErrors / prev?.totalEvents) * 100 : 0;
  // Engagement
  const avgTryOnsPerVisitor = kpis?.uniqueVisitors ? (kpis?.totalTryOns / kpis?.uniqueVisitors) : 0;
  const prevAvgTryOnsPerVisitor = prev?.uniqueVisitors ? (prev?.totalTryOns / prev?.uniqueVisitors) : 0;
  const avgTryOnsPerSession = kpis?.uniqueSessions ? (kpis?.totalTryOns / kpis?.uniqueSessions) : 0;
  const prevAvgTryOnsPerSession = prev?.uniqueSessions ? (prev?.totalTryOns / prev?.uniqueSessions) : 0;
  // Repeat visitors (dummy, needs backend for real repeat count)
  // For now, show N/A

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      padding: '32px',
      minHeight: 'calc(100vh - 70px)'
      // background removed to inherit global background
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
        <h2 style={{
          fontWeight: 700,
          fontSize: 32,
          color: 'white',
          letterSpacing: 1,
          marginBottom: 24
        }}>
          Analytics Dashboard
        </h2>
        {/* Date Range and Aggregation Filters */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 32, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ color: '#fff', fontWeight: 500, marginRight: 6 }}>Period:</label>
            <select
              value={aggregationPeriod}
              onChange={e => setAggregationPeriod(e.target.value as 'daily' | 'weekly' | 'monthly')}
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
            <label style={{ color: '#fff', fontWeight: 500 }}>Start Date:</label>
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={e => setStartDate(e.target.value)}
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
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <label style={{ color: '#fff', fontWeight: 500 }}>End Date:</label>
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={defaultEnd}
              onChange={e => setEndDate(e.target.value)}
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
            />
          </div>
        </div>

        {loading ? (
          <div style={{ color: '#fff', fontSize: 18, fontWeight: 500, minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Loading analytics...
          </div>
        ) : error ? (
          <div style={{ color: '#ff6b6b', fontSize: 18, fontWeight: 500, minHeight: 400, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {error}
          </div>
        ) : (
          <>
            {/* KPI Cards - General KPIs */}
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ color: '#fff', fontWeight: 700, fontSize: 20, marginBottom: 16, letterSpacing: 0.5 }}>General KPIs</h3>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 16, lineHeight: 1.5 }}>
                Core metrics showing widget performance. Percentage changes compare current period vs previous period of equal duration.
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 24,
              }}>
                {/* Try-Ons */}
                <div style={{ background: 'rgba(255,255,255,0.10)', borderRadius: 20, padding: 24, border: '1.5px solid rgba(255,255,255,0.18)' }}>
                  <div style={{ color: '#fff', fontSize: 16, marginBottom: 6 }}>Total Try-Ons</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: '#667eea', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {kpis?.totalTryOns ?? 'N/A'}
                    {kpis && prev && (
                      (() => { const pc = percentChange(kpis.totalTryOns, prev.totalTryOns); return pc.up !== null ? <span style={{ color: pc.up ? '#36d399' : '#ff6b6b', fontSize: 18 }}>{pc.up ? '▲' : '▼'} {pc.value}</span> : null; })()
                    )}
                  </div>
                  <Sparkline data={tryOnSpark} color="#667eea" />
                </div>
                {/* Error Rate */}
                <div style={{ background: 'rgba(255,255,255,0.10)', borderRadius: 20, padding: 24, border: '1.5px solid rgba(255,255,255,0.18)' }}>
                  <div style={{ color: '#fff', fontSize: 16, marginBottom: 6 }}>Error Rate</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: '#ff6b6b', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {kpis?.totalEvents ? `${errorRate.toFixed(1)}%` : 'N/A'}
                    {kpis && prev && (
                      (() => { const pc = percentChange(errorRate, prevErrorRate); return pc.up !== null ? <span style={{ color: pc.up ? '#ff6b6b' : '#36d399', fontSize: 18 }}>{pc.up ? '▲' : '▼'} {pc.value}</span> : null; })()
                    )}
                  </div>
                  <Sparkline data={tryOnSpark} color="#ff6b6b" />
                </div>
                {/* Unique Visitors */}
                <div style={{ background: 'rgba(255,255,255,0.10)', borderRadius: 20, padding: 24, border: '1.5px solid rgba(255,255,255,0.18)' }}>
                  <div style={{ color: '#fff', fontSize: 16, marginBottom: 6 }}>Unique Visitors</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: '#36d399', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {kpis?.uniqueVisitors ?? 'N/A'}
                    {kpis && prev && (
                      (() => { const pc = percentChange(kpis.uniqueVisitors, prev.uniqueVisitors); return pc.up !== null ? <span style={{ color: pc.up ? '#36d399' : '#ff6b6b', fontSize: 18 }}>{pc.up ? '▲' : '▼'} {pc.value}</span> : null; })()
                    )}
                  </div>
                  <Sparkline data={tryOnSpark} color="#36d399" />
                </div>
                {/* Unique Sessions */}
                <div style={{ background: 'rgba(255,255,255,0.10)', borderRadius: 20, padding: 24, border: '1.5px solid rgba(255,255,255,0.18)' }}>
                  <div style={{ color: '#fff', fontSize: 16, marginBottom: 6 }}>Unique Sessions</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: '#fbbf24', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {kpis?.uniqueSessions ?? 'N/A'}
                    {kpis && prev && (
                      (() => { const pc = percentChange(kpis.uniqueSessions, prev.uniqueSessions); return pc.up !== null ? <span style={{ color: pc.up ? '#36d399' : '#ff6b6b', fontSize: 18 }}>{pc.up ? '▲' : '▼'} {pc.value}</span> : null; })()
                    )}
                  </div>
                  <Sparkline data={tryOnSpark} color="#fbbf24" />
                </div>
              </div>
            </div>
            {/* Conversion Rates */}
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ color: '#fff', fontWeight: 700, fontSize: 20, marginBottom: 16, letterSpacing: 0.5 }}>Conversion Rates</h3>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 16, lineHeight: 1.5 }}>
                Conversion rates show how effectively visitors engage with the widget. Try-On Conversion = (Total Try-Ons / Widget Opens) × 100.
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 24,
              }}>
                {/* Try-On Conversion Rate */}
                <div style={{ background: 'rgba(255,255,255,0.10)', borderRadius: 20, padding: 24, border: '1.5px solid rgba(255,255,255,0.18)' }}>
                  <div style={{ color: '#fff', fontSize: 16, marginBottom: 6 }}>Try-On Conversion</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: '#36d399', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {kpis?.widgetOpens ? `${tryOnConv.toFixed(1)}%` : 'N/A'}
                    {kpis && prev && (
                      (() => { const pc = percentChange(tryOnConv, prevTryOnConv); return pc.up !== null ? <span style={{ color: pc.up ? '#36d399' : '#ff6b6b', fontSize: 18 }}>{pc.up ? '▲' : '▼'} {pc.value}</span> : null; })()
                    )}
                  </div>
                  <Sparkline data={tryOnSpark} color="#36d399" />
                </div>
              </div>
            </div>
            {/* Engagement */}
            <div style={{ marginBottom: 32 }}>
              <h3 style={{ color: '#fff', fontWeight: 700, fontSize: 20, marginBottom: 16, letterSpacing: 0.5 }}>Engagement</h3>
              <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 16, lineHeight: 1.5 }}>
                Engagement metrics show how deeply users interact with the widget. Higher averages indicate better user engagement and widget effectiveness.
              </p>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                gap: 24,
              }}>
                {/* Avg Try-Ons per Visitor */}
                <div style={{ background: 'rgba(255,255,255,0.10)', borderRadius: 20, padding: 24, border: '1.5px solid rgba(255,255,255,0.18)' }}>
                  <div style={{ color: '#fff', fontSize: 16, marginBottom: 6 }}>Avg Try-Ons/Visitor</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: '#4ecdc4', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {kpis?.uniqueVisitors ? avgTryOnsPerVisitor.toFixed(2) : 'N/A'}
                    {kpis && prev && (
                      (() => { const pc = percentChange(avgTryOnsPerVisitor, prevAvgTryOnsPerVisitor); return pc.up !== null ? <span style={{ color: pc.up ? '#36d399' : '#ff6b6b', fontSize: 18 }}>{pc.up ? '▲' : '▼'} {pc.value}</span> : null; })()
                    )}
                  </div>
                  <Sparkline data={tryOnSpark} color="#4ecdc4" />
                </div>
                {/* Avg Try-Ons per Session */}
                <div style={{ background: 'rgba(255,255,255,0.10)', borderRadius: 20, padding: 24, border: '1.5px solid rgba(255,255,255,0.18)' }}>
                  <div style={{ color: '#fff', fontSize: 16, marginBottom: 6 }}>Avg Try-Ons/Session</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: '#667eea', display: 'flex', alignItems: 'center', gap: 8 }}>
                    {kpis?.uniqueSessions ? avgTryOnsPerSession.toFixed(2) : 'N/A'}
                    {kpis && prev && (
                      (() => { const pc = percentChange(avgTryOnsPerSession, prevAvgTryOnsPerSession); return pc.up !== null ? <span style={{ color: pc.up ? '#36d399' : '#ff6b6b', fontSize: 18 }}>{pc.up ? '▲' : '▼'} {pc.value}</span> : null; })()
                    )}
                  </div>
                  <Sparkline data={tryOnSpark} color="#667eea" />
                </div>
                {/* Repeat Visitors (placeholder) */}
                <div style={{ background: 'rgba(255,255,255,0.10)', borderRadius: 20, padding: 24, border: '1.5px solid rgba(255,255,255,0.18)' }}>
                  <div style={{ color: '#fff', fontSize: 16, marginBottom: 6 }}>Repeat Visitors</div>
                  <div style={{ fontSize: 32, fontWeight: 700, color: '#bfcfff', display: 'flex', alignItems: 'center', gap: 8 }}>
                    N/A
                  </div>
                  <Sparkline data={tryOnSpark} color="#bfcfff" />
                </div>
              </div>
            </div>

            {/* Trends Over Time */}
            <div style={{
              background: 'rgba(255,255,255,0.07)',
              borderRadius: 20,
              border: '1.5px solid rgba(255,255,255,0.13)',
              boxShadow: '0 2px 16px 0 rgba(76,205,196,0.07)',
              padding: 32,
              marginBottom: 40,
              width: '100%',
              position: 'relative'
            }}>
              <div style={{ fontWeight: 600, fontSize: 18, color: 'white', marginBottom: 8 }}>Try-Ons Over Time</div>
              <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 14, marginBottom: 24 }}>The bars below show the number of try-ons per {aggregationPeriod.slice(0, -1)} for your account.</div>
              <UsageBarChart
                usageHistory={(trends?.tryOns || []).map((d: any) => ({ date: d.date, credits: d.count }))}
                period={aggregationPeriod}
                height={320}
                accentGradient={["#667eea", "#4ecdc4"]}
                showAs={'credits'}
              />
            </div>

            {/* Top Products */}
            <div style={{
              background: 'rgba(255,255,255,0.07)',
              borderRadius: 20,
              border: '1.5px solid rgba(255,255,255,0.13)',
              boxShadow: '0 2px 16px 0 rgba(76,205,196,0.07)',
              padding: 32,
              marginBottom: 40,
              width: '100%',
              position: 'relative'
            }}>
              <div style={{ fontWeight: 600, fontSize: 18, color: 'white', marginBottom: 8 }}>Top Products</div>
              <div style={{ display: 'flex', gap: 24 }}>
                {(topProducts || []).map((p: any, i: number) => (
                  <div key={i} style={{
                    background: 'rgba(255,255,255,0.10)',
                    borderRadius: 12,
                    padding: '18px 24px',
                    minWidth: 160,
                    textAlign: 'center',
                    boxShadow: '0 1px 6px rgba(44,62,80,0.06)',
                    fontWeight: 600,
                    color: '#ffd93d',
                    fontSize: 18
                  }}>
                    {p.image && (
                      <img src={p.image.startsWith('http') ? p.image : `${API_CONFIG.BASE_URL}${p.image}`} alt={p.name} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 8, marginBottom: 8, background: '#222' }} />
                    )}
                    <div style={{ fontSize: 15, color: '#fff', marginBottom: 4 }}>{p.name}</div>
                    <div style={{ color: '#ffd93d', fontSize: 22, fontWeight: 700 }}>{p.count}</div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPage;
