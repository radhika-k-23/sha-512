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
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Open Cases"
              value={stats.open_cases}
              prefix={<FolderOpenOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="Pending Evidence Checks"
              value={stats.pending_evidence}
              prefix={<FileProtectOutlined />}
              valueStyle={{ color: stats.pending_evidence > 0 ? '#faad14' : '#52c41a' }}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card bordered={false} className="shadow-sm">
            <Statistic
              title="System Integrity"
              value={stats.integrity_ok ? 'Secured' : 'Warning'}
              prefix={stats.integrity_ok ? <CheckCircleOutlined /> : <WarningOutlined />}
              valueStyle={{ color: stats.integrity_ok ? '#52c41a' : '#f5222d' }}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default DashboardStats;
