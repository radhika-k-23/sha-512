import React, { useEffect, useState } from 'react';
import { Timeline, Card, Typography, Spin, Empty, Tag } from 'antd';
import { ClockCircleOutlined, UserOutlined } from '@ant-design/icons';
import api from '../api/axiosClient';

const { Text } = Typography;

function ChainOfCustody({ evidenceId }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!evidenceId) return;
    
    setLoading(true);
    api.get(`audit/?target=evidence:${evidenceId}`)
      .then(res => {
        // DRF might return paginated results
        const rawLogs = res.data.results || res.data;
        const sortedLogs = [...rawLogs].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        setLogs(sortedLogs);
      })
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [evidenceId]);

  const getActionColor = (action) => {
    switch (action) {
      case 'UPLOAD': return 'green';
      case 'TRANSFER': return 'blue';
      case 'INTEGRITY_FAIL': return 'red';
      case 'CHECK': return 'cyan';
      default: return 'gray';
    }
  };

  return (
    <Card 
      title={`Chain of Custody (Evidence #${evidenceId})`} 
      size="small" 
      className="shadow-sm mt-3" 
      style={{ borderLeft: '4px solid #001529' }}
    >
      {loading ? (
        <div style={{ textAlign: 'center', padding: '20px' }}><Spin /></div>
      ) : logs.length === 0 ? (
        <Empty description="No chain of custody events recorded." image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <Timeline 
          mode="left"
          items={logs.map((log, idx) => ({
            color: getActionColor(log.action),
            label: new Date(log.timestamp).toLocaleString(),
            children: (
              <>
                <Tag color={getActionColor(log.action)} style={{ fontWeight: 'bold' }}>{log.action}</Tag>
                <br />
                <Text strong><UserOutlined /> {log.user || 'System'}</Text>
                <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                  {log.details || 'No additional details.'}
                </div>
              </>
            )
          }))}
        />
      )}
    </Card>
  );
}

export default ChainOfCustody;
