import React, { useState, useRef, useLayoutEffect } from 'react';

// Hook to get container width responsively
function useContainerWidth(): [React.RefObject<HTMLDivElement>, number] {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    function updateWidth() {
      if (ref.current) setWidth(ref.current.offsetWidth);
    }
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);
  return [ref as React.RefObject<HTMLDivElement>, width];
}

interface UsageBarChartProps {
  usageHistory: { date: string; credits: number }[];
  period: string;
  height: number;
  accentGradient: [string, string];
  showAs?: 'credits' | 'money';
  costPerCredit?: number;
}

const UsageBarChart: React.FC<UsageBarChartProps> = ({ usageHistory, period, height, accentGradient, showAs = 'credits', costPerCredit = 0 }) => {
  const [hovered, setHovered] = useState<number | null>(null);
  const [containerRef, width] = useContainerWidth();
  const barCount = usageHistory.length;
  // Use either credits or money for the bars
  const values = usageHistory.map(m => showAs === 'credits' ? m.credits : +(m.credits * costPerCredit).toFixed(2));
  const usageMax = Math.max(...values);
  const usageMin = Math.min(...values);
  const usageRange = usageMax - usageMin || 1;
  const labelInterval = Math.ceil(barCount / 10); // Show labels every 10th bar
  return (
    <div ref={containerRef} style={{ width: '100%', height, position: 'relative' }}>
      {width > 0 && (
        <>
          <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} style={{ display: 'block', position: 'absolute', left: 0, top: 0 }}>
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
            {/* Bars */}
            {usageHistory.map((periodData: { date: string; credits: number }, i: number) => {
              const value = values[i];
              const barHeight = ((value - usageMin) / usageRange) * (height - 40);
              const x = (i + 0.5) * (width / barCount);
              return (
                <g key={i} onMouseEnter={() => setHovered(i)} onMouseLeave={() => setHovered(null)} style={{ cursor: 'pointer' }}>
                  <rect
                    x={x - 18}
                    y={height - barHeight - 24}
                    width={36}
                    height={barHeight}
                    rx={8}
                    fill={`url(#bar-gradient)`}
                    style={{ filter: hovered === i ? 'drop-shadow(0 2px 12px #4ecdc488)' : 'none', transition: 'filter 0.2s' }}
                  />
                  {/* Data label (show on hover or always for mobile) */}
                  {(hovered === i) && (
                    <foreignObject x={x - 24} y={height - barHeight - 48} width={64} height={24} style={{ pointerEvents: 'none' }}>
                      <div style={{ color: '#fff', fontSize: 14, fontWeight: 700, background: 'rgba(30,32,38,0.92)', borderRadius: 8, padding: '2px 0', textAlign: 'center', boxShadow: '0 2px 8px 0 rgba(0,0,0,0.12)' }}>
                        {showAs === 'credits' ? value : `$${value}`}
                      </div>
                    </foreignObject>
                  )}
                </g>
              );
            })}
            {/* Gradient for bars */}
            <defs>
              <linearGradient id="bar-gradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accentGradient[0]} />
                <stop offset="100%" stopColor={accentGradient[1]} />
              </linearGradient>
            </defs>
          </svg>
          {/* X-axis labels */}
          <div
            style={{
              position: 'absolute',
              left: 0,
              bottom: -35, // add extra space below the bars
              width: width,
              minWidth: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              fontSize: 12,
              color: 'rgba(255,255,255,0.5)',
              zIndex: 3,
              alignItems: 'flex-end',
              marginBottom: 16, // extra margin for spacing
            }}
          >
            {usageHistory.map((period: { date: string }, i: number) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  textAlign: 'center',
                  height: barCount > 16 ? 48 : 'auto',
                  display: 'flex',
                  alignItems: 'flex-end',
                  justifyContent: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                {(i % labelInterval === 0 || i === barCount - 1) && (
                  <span
                    style={barCount > 16 ? {
                      display: 'inline-block',
                      transform: 'rotate(-45deg)',
                      transformOrigin: 'bottom left',
                      marginBottom: 4,
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
};

export default UsageBarChart;
