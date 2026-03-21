import React, { useState, useEffect } from 'react';
import {
  Layout, Typography, Table, Button, Input, Card,
  Tag, Tabs, Space, Tooltip, message, Progress,
  Timeline, Badge, Row, Col, Statistic, Divider
} from 'antd';
import {
  LogoutOutlined, DownloadOutlined, HistoryOutlined,
  FileSearchOutlined as CaseIcon, FileProtectOutlined as EvidenceIcon,
  SafetyCertificateOutlined, CheckCircleOutlined, CloseCircleOutlined,
  UserOutlined, ClockCircleOutlined, SwapOutlined
} from '@ant-design/icons';
import api from '../api/axiosClient';
import DashboardStats from '../components/DashboardStats';
import ChainOfCustody from '../components/ChainOfCustody';

const { Content } = Layout;
const { Title, Text } = Typography;

const ACTION_COLOR = {
  UPLOAD: 'green',
  CHECK: 'blue',
  TRANSFER: 'purple',
  VIEW: 'default',
  LOGIN: 'cyan',
  INTEGRITY_FAIL: 'red',
};

const ACTION_ICON = {
  UPLOAD: <SafetyCertificateOutlined />,
  CHECK: <CheckCircleOutlined />,
  TRANSFER: <SwapOutlined />,
  VIEW: <HistoryOutlined />,
  LOGIN: <UserOutlined />,
  INTEGRITY_FAIL: <CloseCircleOutlined style={{ color: 'red' }} />,
};

function JudiciaryDashboard() {
  const [activeTab, setActiveTab] = useState('cases');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [selectedEvidenceId, setSelectedEvidenceId] = useState(null);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [caseIntegrity, setCaseIntegrity] = useState(null);
  const [caseIntegrityLoading, setCaseIntegrityLoading] = useState(false);

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
      const res = await api.get(endpoint, { params: { page, search: searchText } });
      setData(res.data.results || res.data);
      setTotal(res.data.count || res.data.length);
    } catch (err) {
      message.error(`Failed to fetch ${activeTab}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchCaseIntegrity = async (caseId) => {
    if (selectedCaseId === caseId) {
      setSelectedCaseId(null);
      setCaseIntegrity(null);
      return;
    }
    setCaseIntegrityLoading(true);
    setSelectedCaseId(caseId);
    try {
      const res = await api.get(`case-integrity/${caseId}/`);
      setCaseIntegrity(res.data);
    } catch (err) {
      message.error('Failed to load case integrity data');
    } finally {
      setCaseIntegrityLoading(false);
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

  const scoreColor = (score) => {
    if (score >= 80) return '#52c41a';
    if (score >= 50) return '#faad14';
    return '#ff4d4f';
  };

  const caseColumns = [
    { title: 'FIR Number', dataIndex: 'fir_number', key: 'fir', render: (t) => <Text code>{t}</Text> },
    { title: 'Title', dataIndex: 'title', key: 'title' },
    { title: 'Status', dataIndex: 'status', key: 'status', render: (s) => <Tag color={s === 'OPEN' ? 'green' : 'red'}>{s}</Tag> },
    { title: 'Evidence Items', key: 'evidence', render: (_, r) => r.evidence_files?.length ?? 0 },
    { title: 'Created By', dataIndex: 'created_by_name', key: 'created_by' },
    { title: 'Date', dataIndex: 'created_at', key: 'date', render: (d) => new Date(d).toLocaleDateString() },
    {
      title: 'Integrity Report',
      key: 'integrity',
      render: (_, record) => (
        <Button
          size="small"
          type={selectedCaseId === record.id ? 'primary' : 'default'}
          icon={<SafetyCertificateOutlined />}
          loading={caseIntegrityLoading && selectedCaseId === record.id}
          onClick={() => fetchCaseIntegrity(record.id)}
        >
          {selectedCaseId === record.id ? 'Close' : 'View Score'}
        </Button>
      )
    }
  ];

  const evidenceColumns = [
    { title: 'File', dataIndex: 'original_filename', key: 'file', ellipsis: true },
    { title: 'Category', dataIndex: 'category', key: 'cat', render: (c) => <Tag color="purple">{c}</Tag> },
    { title: 'Case', dataIndex: 'case_fir', key: 'case_fir', render: (t) => <Text code>{t}</Text> },
    { title: 'Custodian', dataIndex: 'current_custodian_name', key: 'custodian', render: (u) => <Text>{u || 'Unassigned'}</Text> },
    {
      title: 'SHA-512 Hash',
      dataIndex: 'sha512_hash',
      key: 'hash',
      render: (h) => <Tooltip title={h}><Text code style={{ fontSize: '11px', color: '#1890ff' }}>{h?.slice(0, 16)}...</Text></Tooltip>
    },
    {
      title: 'Verified',
      dataIndex: 'is_verified',
      key: 'verified',
      render: (v) => v
        ? <Tag icon={<CheckCircleOutlined />} color="success">Secure</Tag>
        : <Tag color="warning">Pending</Tag>
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setSelectedEvidenceId(selectedEvidenceId === record.id ? null : record.id)}>
            {selectedEvidenceId === record.id ? 'Hide Custody' : 'Chain'}
          </Button>
          <Button size="small" icon={<DownloadOutlined />} onClick={() => handleDownload(record.id, record.original_filename)} />
        </Space>
      )
    }
  ];

  const auditColumns = [
    { title: 'Time', dataIndex: 'timestamp', key: 'time', render: (t) => new Date(t).toLocaleString() },
    { title: 'User', dataIndex: 'user_name', key: 'user', render: (u) => u || 'System' },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      render: (a) => <Tag color={ACTION_COLOR[a] || 'default'}>{a}</Tag>
    },
    { title: 'Target', dataIndex: 'target', key: 'target', render: (t) => <Text code>{t}</Text> },
    { title: 'IP', dataIndex: 'ip_address', key: 'ip' },
    { title: 'Details', dataIndex: 'details', key: 'details', ellipsis: true },
  ];

  const items = [
    {
      key: 'cases',
      label: <span><CaseIcon /> All Cases</span>,
      children: (
        <div>
          <Table columns={caseColumns} dataSource={data} rowKey="id" loading={loading}
            pagination={{ current: page, total, pageSize: 15, onChange: setPage }} size="middle" />
          {selectedCaseId && caseIntegrity && (
            <Card
              style={{ marginTop: 24, background: '#0d1117', border: '1px solid #30363d' }}
              title={
                <span style={{ color: '#58a6ff' }}>
                  <SafetyCertificateOutlined /> Case Integrity Report — {caseIntegrity.fir_number}
                </span>
              }
            >
              <Row gutter={48} align="middle">
                {/* Integrity Score Circle */}
                <Col span={6} style={{ textAlign: 'center' }}>
                  <Progress
                    type="circle"
                    percent={caseIntegrity.integrity_score}
                    strokeColor={scoreColor(caseIntegrity.integrity_score)}
                    format={(p) => <span style={{ color: '#e6edf3', fontSize: 22 }}>{p}%</span>}
                    size={160}
                  />
                  <div style={{ marginTop: 12, color: '#8b949e' }}>Integrity Trust Score</div>
                </Col>

                {/* Stats */}
                <Col span={6}>
                  <Statistic title={<span style={{ color: '#8b949e' }}>Total Evidence</span>} value={caseIntegrity.total_evidence} valueStyle={{ color: '#e6edf3' }} />
                  <Divider style={{ borderColor: '#30363d' }} />
                  <Statistic title={<span style={{ color: '#8b949e' }}>Verified Items</span>} value={caseIntegrity.verified_evidence} valueStyle={{ color: '#52c41a' }} prefix={<CheckCircleOutlined />} />
                </Col>

                {/* Chain of Custody Timeline */}
                <Col span={12}>
                  <Text style={{ color: '#8b949e', display: 'block', marginBottom: 12 }}>
                    <ClockCircleOutlined /> Chain of Custody Timeline
                  </Text>
                  <div style={{ maxHeight: 320, overflowY: 'auto', paddingRight: 8 }}>
                    <Timeline
                      items={caseIntegrity.timeline.map((entry) => ({
                        color: entry.is_failure ? 'red' : (entry.hash_verified ? 'green' : 'blue'),
                        dot: ACTION_ICON[entry.action],
                        children: (
                          <div style={{ color: '#e6edf3' }}>
                            <Space>
                              <Tag color={ACTION_COLOR[entry.action] || 'default'} style={{ fontSize: 11 }}>{entry.action_label}</Tag>
                              {entry.hash_verified && !entry.is_failure && (
                                <Tag icon={<CheckCircleOutlined />} color="success" style={{ fontSize: 11 }}>Hash Verified ✓</Tag>
                              )}
                              {entry.is_failure && (
                                <Tag icon={<CloseCircleOutlined />} color="error" style={{ fontSize: 11 }}>INTEGRITY FAIL</Tag>
                              )}
                            </Space>
                            <div style={{ color: '#8b949e', fontSize: 12, marginTop: 4 }}>
                              <UserOutlined /> {entry.user} ({entry.role}) &nbsp;·&nbsp;
                              <ClockCircleOutlined /> {new Date(entry.timestamp).toLocaleString()}
                            </div>
                            <div style={{ color: '#8b949e', fontSize: 12 }}>{entry.details}</div>
                          </div>
                        )
                      }))}
                    />
                  </div>
                </Col>
              </Row>
            </Card>
          )}
        </div>
      )
    },
    {
      key: 'evidence',
      label: <span><EvidenceIcon /> Digital Evidence Cases</span>,
      children: (
        <div>
          <Table columns={evidenceColumns} dataSource={data} rowKey="id" loading={loading}
            pagination={{ current: page, total, pageSize: 15, onChange: setPage }} size="middle" />
          {selectedEvidenceId && <ChainOfCustody evidenceId={selectedEvidenceId} />}
        </div>
      )
    },
    {
      key: 'audit',
      label: <span><HistoryOutlined /> Tamper-Evident Audit Trail</span>,
      children: <Table columns={auditColumns} dataSource={data} rowKey={(r, i) => i} loading={loading}
        pagination={{ current: page, total, pageSize: 15, onChange: setPage }} size="middle" />
    }
  ];

  return (
    <Layout className="layout" style={{ minHeight: '100vh', padding: '24px', paddingBottom: '80px' }}>
      <Content>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <Title level={2} style={{ margin: 0 }}>
            Judiciary Dashboard <Tag color="black" style={{ verticalAlign: 'middle', marginLeft: '12px' }}>Read-Only</Tag>
          </Title>
          <Button danger icon={<LogoutOutlined />} onClick={() => { localStorage.clear(); window.location.href = '/login'; }}>
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
            onChange={(k) => { setActiveTab(k); setPage(1); setSearchText(''); setSelectedCaseId(null); setCaseIntegrity(null); }}
            items={items}
          />
        </Card>
      </Content>
    </Layout>
  );
}

export default JudiciaryDashboard;
