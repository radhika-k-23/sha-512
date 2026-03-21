import React, { useState, useEffect } from 'react';
import { 
  Layout, Typography, Table, Button, Input, Card, 
  Tag, Space, message, Tooltip, Divider
} from 'antd';
import { 
  LogoutOutlined, CheckCircleOutlined, WarningOutlined, 
  InboxOutlined, SafetyCertificateOutlined, DownloadOutlined
} from '@ant-design/icons';
import api from '../api/axiosClient';
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
      await api.post(`evidence/${id}/receive/`);
      message.success('Evidence received and integrity re-verified successfully!');
      fetchEvidence();
    } catch (err) {
      const errorMsg = err.response?.data?.error || 'Failed to receive evidence';
      message.error(`CRITICAL: ${errorMsg}`);
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
    { title: 'Category', dataIndex: 'category', key: 'cat', render: (c) => <Tag>{c}</Tag> },
    { title: 'Case', dataIndex: 'case_fir', key: 'case_fir', render: (t) => <Text code>{t}</Text> },
    { 
      title: 'Custody Status', 
      dataIndex: 'custody_status', 
      key: 'status',
      render: (s) => (
        <Tag color={s === 'EVIDENCE_ROOM' ? 'blue' : s === 'FSL' ? 'green' : 'orange'}>
          {s.replace('_', ' ')}
        </Tag>
      )
    },
    { 
      title: 'SHA-512 Hash', 
      dataIndex: 'sha512_hash', 
      key: 'hash', 
      render: (h) => (
        <Tooltip title={h}>
          <Text code style={{ fontSize: '11px' }}>{h?.slice(0, 12)}...</Text>
        </Tooltip>
      )
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Space>
          {record.custody_status !== 'EVIDENCE_ROOM' ? (
            <Button 
              type="primary" 
              size="small" 
              icon={<InboxOutlined />} 
              loading={processing[record.id]}
              onClick={() => receiveEvidence(record.id)}
            >
              Receive
            </Button>
          ) : (
            <Tag color="success" icon={<CheckCircleOutlined />}>Stored & Verified</Tag>
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
    <Layout className="layout" style={{ minHeight: '100vh', padding: '24px' }}>
      <Content>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <Title level={2}>
            <InboxOutlined /> Evidence Room Cabinet
          </Title>
          <Button 
            danger 
            icon={<LogoutOutlined />} 
            onClick={() => { localStorage.clear(); window.location.href = '/login'; }}
          >
            Logout
          </Button>
        </div>

        <DashboardStats />

        <Card 
          title="Evidence Intake & Storage" 
          bordered={false} 
          className="shadow-sm"
          extra={
            <Input.Search
              placeholder="Search evidence..."
              onSearch={v => { setSearchText(v); setPage(1); }}
              style={{ width: 300 }}
              allowClear
            />
          }
        >
          <div style={{ marginBottom: '16px' }}>
            <Text type="secondary">
              <SafetyCertificateOutlined style={{ color: '#52c41a' }} /> Every intake triggers an automated SHA-512 integrity re-verification.
            </Text>
          </div>
          <Table 
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
      </Content>
    </Layout>
  );
}

export default EvidenceRoomDashboard;
