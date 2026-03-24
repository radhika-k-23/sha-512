import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Tooltip } from 'antd';
import { FileProtectOutlined, FolderOpenOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import api from '../api/axiosClient';

const DashboardStats = () => {
  const [stats, setStats] = useState({
    open_cases: 0,
    pending_evidence: 0,
    integrity_ok: true
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await api.get('dashboard-stats/');
        setStats(res.data);
      } catch (err) {
        console.error('Failed to fetch stats', err);
      }
    };
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // 30s refresh
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ marginBottom: '24px' }}>
      <Row gutter={16}>
        <Col span={8}>
          <Card bordered={false} className="forensic-panel">
            <Statistic
              title={<span style={{ color: '#8fb1cc' }}>Open Cases</span>}
              value={stats.open_cases}
              prefix={<FolderOpenOutlined style={{ color: '#00f2ff' }} />}
              valueStyle={{ color: '#00f2ff', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} className="forensic-panel">
            <Statistic
              title={<span style={{ color: '#8fb1cc' }}>Pending Evidence Checks</span>}
              value={stats.pending_evidence}
              prefix={<FileProtectOutlined style={{ color: stats.pending_evidence > 0 ? '#faad14' : '#52c41a' }} />}
              valueStyle={{ color: stats.pending_evidence > 0 ? '#faad14' : '#52c41a', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} className="forensic-panel">
            <Statistic
              title={<span style={{ color: '#8fb1cc' }}>System Integrity</span>}
              value={stats.integrity_ok ? 'Secured' : 'Warning'}
              prefix={stats.integrity_ok ? <CheckCircleOutlined style={{ color: '#52c41a' }} /> : <WarningOutlined style={{ color: '#f5222d' }} />}
              valueStyle={{ color: stats.integrity_ok ? '#52c41a' : '#f5222d', fontWeight: 'bold' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardStats;
