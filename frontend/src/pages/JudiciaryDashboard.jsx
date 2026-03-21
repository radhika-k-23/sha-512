import React, { useState, useEffect } from 'react';
import { 
  Layout, Typography, Table, Button, Input, Card, 
  Tag, Tabs, Space, Tooltip, message
} from 'antd';
import { 
  LogoutOutlined, DownloadOutlined, HistoryOutlined, 
  FileSearchOutlined as CaseIcon, FileProtectOutlined as EvidenceIcon,
  SafetyCertificateOutlined
} from '@ant-design/icons';
import api from '../api/axiosClient';
import DashboardStats from '../components/DashboardStats';
import ChainOfCustody from '../components/ChainOfCustody';

const { Content } = Layout;
const { Title, Text } = Typography;

function JudiciaryDashboard() {
  const [activeTab, setActiveTab] = useState('cases');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [selectedEvidenceId, setSelectedEvidenceId] = useState(null);

  useEffect(() => {
    fetchData();
  }, [activeTab, page, searchText]);

  const fetchData = async () => {
    setLoading(true);
    let endpoint = '';
    if (activeTab === 'cases') endpoint = 'cases/';
    else if (activeTab === 'evidence') endpoint = 'evidence/';
    else if (activeTab === 'audit') endpoint = 'audit/';

    try {
      const res = await api.get(endpoint, {
        params: {
          page: page,
          search: searchText
        }
      });
      setData(res.data.results || res.data);
      setTotal(res.data.count || res.data.length);
    } catch (err) {
      message.error(`Failed to fetch ${activeTab}`);
    } finally {
      setLoading(false);
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

  const caseColumns = [
    { title: 'FIR Number', dataIndex: 'fir_number', key: 'fir', render: (t) => <Text code>{t}</Text> },
    { title: 'Title', dataIndex: 'title', key: 'title' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag color={s === 'OPEN' ? 'green' : 'red'}>{s}</Tag> },
    { title: 'Suspects', key: 'suspects', render: (_, r) => r.suspects?.length || 0 },
    { title: 'Created By', dataIndex: 'created_by_name', key: 'created_by' },
    { title: 'Date', dataIndex: 'created_at', key: 'date', render: (d) => new Date(d).toLocaleDateString() },
  ];

  const evidenceColumns = [
    { title: 'File', dataIndex: 'original_filename', key: 'file' },
    { title: 'Category', dataIndex: 'category', key: 'cat', render: (c) => <Tag>{c}</Tag> },
    { title: 'Case', dataIndex: 'case_fir', key: 'case_fir', render: (t) => <Text code>{t}</Text> },
    { 
      title: 'SHA-512 Hash', 
      dataIndex: 'sha512_hash', 
      key: 'hash', 
      render: (h) => <Tooltip title={h}><Text code style={{ fontSize: '11px' }}>{h?.slice(0, 16)}...</Text></Tooltip>
    },
    { 
      title: 'Verified', 
      dataIndex: 'is_verified', 
      key: 'verified', 
      render: (v) => v ? <Tag color="green">Secure</Tag> : <Tag color="warning">Pending</Tag> 
    },
    { title: 'Uploaded', dataIndex: 'uploaded_at', key: 'uploaded', render: (d) => new Date(d).toLocaleDateString() },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button 
            size="small" 
            onClick={() => setSelectedEvidenceId(selectedEvidenceId === record.id ? null : record.id)}
          >
            {selectedEvidenceId === record.id ? 'Hide Custody' : 'Show Custody'}
          </Button>
          <Button 
            size="small" 
            icon={<DownloadOutlined />} 
            onClick={() => handleDownload(record.id, record.original_filename)}
          />
        </Space>
      )
    }
  ];

  const auditColumns = [
    { title: 'Timestamp', dataIndex: 'timestamp', key: 'time', render: (t) => new Date(t).toLocaleString() },
    { title: 'User', dataIndex: 'user_name', key: 'user', render: (u) => u || 'System' },
    { 
      title: 'Action', 
      dataIndex: 'action', 
      key: 'action', 
      render: (a) => (
        <Tag color={a === 'INTEGRITY_FAIL' ? 'red' : a === 'UPLOAD' ? 'green' : 'blue'}>
          {a}
        </Tag>
      ) 
    },
    { title: 'Target', dataIndex: 'target', key: 'target', render: (t) => <Text code>{t}</Text> },
    { title: 'IP', dataIndex: 'ip_address', key: 'ip' },
    { title: 'Details', dataIndex: 'details', key: 'details', ellipsis: true },
  ];

  const items = [
    {
      key: 'cases',
      label: <span><CaseIcon /> All Cases</span>,
      children: <Table columns={caseColumns} dataSource={data} rowKey="id" loading={loading} pagination={{ current: page, total: total, pageSize: 15, onChange: setPage }} size="middle" />
    },
    {
      key: 'evidence',
      label: <span><EvidenceIcon /> Digital Evidence Cases</span>,
      children: (
        <div>
          <Table columns={evidenceColumns} dataSource={data} rowKey="id" loading={loading} pagination={{ current: page, total: total, pageSize: 15, onChange: setPage }} size="middle" />
          {selectedEvidenceId && <ChainOfCustody evidenceId={selectedEvidenceId} />}
        </div>
      )
    },
    {
      key: 'audit',
      label: <span><HistoryOutlined /> Tamper-Evident Audit Trail</span>,
      children: <Table columns={auditColumns} dataSource={data} rowKey={(r, i) => i} loading={loading} pagination={{ current: page, total: total, pageSize: 15, onChange: setPage }} size="middle" />
    }
  ];

  return (
    <Layout className="layout" style={{ minHeight: '100vh', padding: '24px' }}>
      <Content>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <Title level={2}>
            Judiciary Dashboard <Tag color="black" style={{ verticalAlign: 'middle', marginLeft: '12px' }}>Read-Only</Tag>
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
          bordered={false} 
          className="shadow-sm" 
          extra={
            <Input.Search
              placeholder={`Search ${activeTab}...`}
              onSearch={v => { setSearchText(v); setPage(1); }}
              style={{ width: 250 }}
              allowClear
            />
          }
        >
          <Tabs 
            activeKey={activeTab} 
            onChange={(k) => { setActiveTab(k); setPage(1); setSearchText(''); }} 
            items={items}
          />
        </Card>
      </Content>
    </Layout>
  );
}

export default JudiciaryDashboard;
