import React, { useState, useEffect } from 'react';
import { Tag, Tooltip, Badge } from 'antd';
import { CheckCircleOutlined, WarningOutlined, ApiOutlined } from '@ant-design/icons';
import api from '../api/axiosClient';
import './SystemHealthFooter.css';

function SystemHealthFooter() {
  const [health, setHealth] = useState(null);
  const [tickerIndex, setTickerIndex] = useState(0);

  const fetchHealth = async () => {
    try {
      const res = await api.get('system-health/');
      setHealth(res.data);
    } catch (err) {
      // Silently fail – footer is non-critical
    }
  };

  // Poll every 30 seconds
  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  // Cycle through ticker entries every 4 seconds
  useEffect(() => {
    if (!health?.ticker?.length) return;
    const t = setInterval(() => {
      setTickerIndex(i => (i + 1) % health.ticker.length);
    }, 4000);
    return () => clearInterval(t);
  }, [health]);

  const isHealthy = health?.is_healthy;
  const currentEntry = health?.ticker?.[tickerIndex];

  return (
    <div className={`system-health-footer ${isHealthy === false ? 'anomaly' : ''}`}>
      {/* Left: pulse indicator */}
      <div className="health-left">
        <span className={`pulse-dot ${isHealthy === false ? 'red' : 'green'}`} />
        <span className="health-label">
          {isHealthy === false
            ? <><WarningOutlined /> ANOMALY DETECTED</>
            : <><ApiOutlined /> System Pulse: Active</>
          }
        </span>
        {health && (
          <span className="health-meta">
            &nbsp;&nbsp;|&nbsp;&nbsp;
            Evidence: <strong>{health.evidence_count}</strong> &nbsp;·&nbsp;
            Logs: <strong>{health.upload_log_count}</strong> &nbsp;·&nbsp;
            {health.integrity_failures > 0
              ? <span style={{ color: '#ff7875' }}>⚠ {health.integrity_failures} Integrity Failure(s)</span>
              : <span style={{ color: '#73d13d' }}><CheckCircleOutlined /> No Failures</span>
            }
          </span>
        )}
      </div>

      {/* Right: scrolling audit ticker */}
      <div className="ticker-right">
        {currentEntry && (
          <div className="ticker-entry">
            <Tag color={currentEntry.action === 'INTEGRITY_FAIL' ? 'red' : 'blue'} style={{ fontSize: 10 }}>
              {currentEntry.action}
            </Tag>
            <span className="ticker-text">
              {currentEntry.time} — {currentEntry.target} by {currentEntry.user}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

export default SystemHealthFooter;
