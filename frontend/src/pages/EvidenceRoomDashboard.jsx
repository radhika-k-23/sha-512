import React, { useState, useEffect } from 'react';
import { 
  Layout, Typography, Table, Button, Input, Card, 
  Tag, Space, message, Tooltip, Divider, notification
} from 'antd';
import { 
  LogoutOutlined, CheckCircleOutlined, WarningOutlined, 
  InboxOutlined, SafetyCertificateOutlined, DownloadOutlined
} from '@ant-design/icons';
import api from '../api/axiosClient';
import './ForensicTheme.css';
import DashboardStats from '../components/DashboardStats';

const { Content } = Layout;
const { Title, Text } = Typography;

function EvidenceRoomDashboard() {
  const [evidenceList, setEvidenceList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [processing, setProcessing] = useState({});

  useEffect(() => {
    fetchEvidence();
  }, [page, searchText]);

  const fetchEvidence = async () => {
    setLoading(true);
    try {
      const res = await api.get('evidence/', {
        params: {
          page: page,
          search: searchText
        }
      });
      setEvidenceList(res.data.results || res.data);
      setTotal(res.data.count || res.data.length);
    } catch (err) {
      message.error('Failed to fetch evidence');
    } finally {
      setLoading(false);
    }
  };

  const receiveEvidence = async (id) => {
    setProcessing(prev => ({ ...prev, [id]: true }));
    try {
      const res = await api.post(`evidence/${id}/receive/`);
      notification.success({
        message: 'Digital Handshake Verified',
        description: `Integrity check PASSED. Hash: ${res.data.sha512_hash?.slice(0, 16)}... Custody transferred successfully.`,
        placement: 'topRight',
        duration: 5,
      });
      fetchEvidence();
    } catch (err) {
      console.error('Handshake Error:', err.response?.data);
      const errorData = err.response?.data;
      let errorMsg = 'Failed to receive evidence';

      if (typeof errorData === 'object' && errorData !== null) {
        errorMsg = Object.entries(errorData)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(' ') : val}`)
          .join(' | ');
      } else if (typeof errorData === 'string') {
        errorMsg = errorData;
      }

      notification.error({
        message: 'SECURITY ALERT: Integrity Failure',
        description: errorMsg,
        placement: 'topRight',
        duration: 0, // Stay until closed
      });
    } finally {
      setProcessing(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleDownload = (id, filename) => {
    api.get(`evidence/${id}/download/`, { responseType: 'blob' })
      .then(response => {
        const url = window.URL.createObjectURL(new Blob([response.data]));
        const link = document.createElement('a');
        link.href = url;
        link.setAttribute('download', filename);
        document.body.appendChild(link);
        link.click();
        link.remove();
      })
      .catch(() => message.error('Download failed'));
  };

  const columns = [
    { title: 'File Name', dataIndex: 'original_filename', key: 'file', ellipsis: true },
    { title: 'Category', dataIndex: 'category', key: 'cat', render: (c) => <Tag color="purple">{c}</Tag> },
    { title: 'Case', dataIndex: 'case_fir', key: 'case_fir', render: (t) => <Text code>{t}</Text> },
    { title: 'Current Custodian', dataIndex: 'current_custodian_name', key: 'custodian', render: (u) => <Text strong>{u || 'System'}</Text> },
    { 
      title: 'Custody Status', 
      dataIndex: 'custody_status', 
      key: 'status',
      render: (s) => {
        let color = 'gold';
        if (s === 'IN_EVIDENCE_ROOM') color = 'blue';
        if (s === 'IN_FSL') color = 'cyan';
        if (s === 'PENDING_TRANSFER') color = 'volcano';
        return (
          <Tag color={color}>
            {s.replace(/_/g, ' ')}
          </Tag>
        );
      }
    },
    { 
      title: 'SHA-512 Hash', 
      dataIndex: 'sha512_hash', 
      key: 'hash', 
      render: (h) => (
        <Tooltip title={h}>
          <Text code style={{ fontSize: '11px', color: '#1890ff' }}>{h?.slice(0, 12)}...</Text>
        </Tooltip>
      )
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Space>
          {record.custody_status !== 'IN_EVIDENCE_ROOM' ? (
            <Button 
              type="primary" 
              size="small" 
              icon={<SafetyCertificateOutlined />} 
              loading={processing[record.id]}
              onClick={() => receiveEvidence(record.id)}
              style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
            >
              Verify & Accept
            </Button>
          ) : (
            <Tag color="success" icon={<CheckCircleOutlined />}>Handshake Verified</Tag>
          )}
          <Button 
            size="small" 
            icon={<DownloadOutlined />} 
            onClick={() => handleDownload(record.id, record.original_filename)}
          />
        </Space>
      )
    }
  ];

  return (
    <Layout className="forensic-layout-dark">
      <Content style={{ padding: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', background: 'rgba(5, 5, 16, 0.8)', padding: '15px 24px', borderBottom: '1px solid rgba(0, 242, 255, 0.2)', backdropFilter: 'blur(10px)', borderRadius: '8px' }}>
          <Title level={2} style={{ margin: 0, color: '#00f2ff' }}>
            <InboxOutlined /> <span style={{ color: '#00f2ff' }}>Evidence Custody Center</span>
          </Title>
          <Button 
            danger 
            icon={<LogoutOutlined />} 
            onClick={() => { localStorage.clear(); window.location.href = '/#/login'; }}
          >
            Logout
          </Button>
        </div>

        <DashboardStats />

        <div className="animate-fade" style={{ margin: '24px 0' }}>
          <Alert
            message={<span style={{ fontWeight: 'bold' }}>Forensic Integrity Protocol SHA-512 Active</span>}
            description="All evidence intake actions are logged in the immutable audit trail with automated handshake verification."
            type="info"
            showIcon
            className="forensic-panel"
            style={{ background: 'rgba(0, 242, 255, 0.05)', border: '1px solid rgba(0, 242, 255, 0.3)', color: '#00f2ff' }}
          />
        </div>

        <div className="animate-fade" style={{ animationDelay: '0.1s' }}>
          <Card 
            title={<span style={{ color: '#00f2ff' }}>Evidence Intake & Storage Vault</span>} 
            bordered={false} 
            className="forensic-panel"
            extra={
              <Input.Search
                placeholder="Search evidence ID or filename..."
                onSearch={v => { setSearchText(v); setPage(1); }}
                className="forensic-input"
                style={{ width: 300 }}
                allowClear
              />
            }
          >
            <div style={{ marginBottom: '16px' }}>
              <Text style={{ color: '#8fb1cc' }}>
                <SafetyCertificateOutlined style={{ color: '#52c41a', marginRight: '6px' }} /> 
                Every intake triggers an automated SHA-512 integrity re-verification handshake.
              </Text>
            </div>
            <Table 
              className="forensic-table"
              columns={columns} 
              dataSource={evidenceList} 
              rowKey="id"
              loading={loading}
              pagination={{
                current: page,
                total: total,
                pageSize: 15,
                onChange: (p) => setPage(p),
                showSizeChanger: false
              }}
              size="middle"
            />
          </Card>
        </div>
      </Content>
    </Layout>
  );
}

export default EvidenceRoomDashboard;
