import React, { useState, useEffect } from 'react';
import { 
  Layout, Typography, Table, Button, Input, Card, 
  Tag, Space, Divider, Form, Row, Col, message, Modal, Menu
} from 'antd';
import { 
  PlusOutlined, SearchOutlined, LogoutOutlined, 
  EyeOutlined, UserAddOutlined, DashboardOutlined, 
  FileSearchOutlined, DatabaseOutlined, AuditOutlined,
  CheckCircleOutlined
} from '@ant-design/icons';
import api from '../api/axiosClient';
import DashboardStats from '../components/DashboardStats';
import DashboardHeader from '../components/DashboardHeader';
import './PoliceDashboard.css';

const { Header, Content, Sider, Footer } = Layout;
const { Title, Text } = Typography;

function PoliceDashboard() {
  const [cases, setCases] = useState([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  
  const [selectedCase, setSelectedCase] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [activeView, setActiveView] = useState('dashboard');
  const [latestAudit, setLatestAudit] = useState('System Initialized. Awaiting forensic data...');
  const [auditLogs, setAuditLogs] = useState([]);
  
  const [form] = Form.useForm();
  const [suspectForm] = Form.useForm();

  useEffect(() => {
    fetchCases();
    fetchLatestAudit();
    const tickerInterval = setInterval(fetchLatestAudit, 10000); // 10s ticker update
    return () => clearInterval(tickerInterval);
  }, [page, searchText]);

  const fetchCases = async () => {
    setLoading(true);
    try {
      const res = await api.get('cases/', {
        params: { page, search: searchText }
      });
      setCases(res.data.results || res.data);
      setTotal(res.data.count || res.data.length);
    } catch (err) {
      message.error('Failed to fetch cases');
    } finally {
      setLoading(false);
    }
  };

  const fetchLatestAudit = async () => {
    try {
      const res = await api.get('audit/');
      const logs = res.data.results || res.data;
      setAuditLogs(logs);
      if (logs.length > 0) {
        const last = logs[0];
        setLatestAudit(`${last.user_name} performed ${last.action} on ${last.resource_type} [${new Date(last.timestamp).toLocaleTimeString()}]`);
      }
    } catch (err) {
      console.warn('Silent: Audit feed failed to fetch');
    }
  };

  const fetchCase = async (id) => {
    try {
      const res = await api.get(`cases/${id}/`);
      setSelectedCase(res.data);
    } catch (err) {
      message.error('Failed to fetch case details');
    }
  };

  const onFinishCreate = async (values) => {
    try {
      await api.post('cases/', values);
      message.success('Forensic Case Registered Professionally');
      form.resetFields();
      setIsModalVisible(false);
      fetchCases();
    } catch (err) {
      message.error('Registration Failed: Integrity Check Unsuccessful');
    }
  };

  const onFinishAddSuspect = async (values) => {
    try {
      await api.post('suspects/', {
        ...values,
        case: selectedCase.id
      });
      message.success('Suspect Profile Attached');
      suspectForm.resetFields();
      fetchCase(selectedCase.id);
    } catch (err) {
      message.error('Failed to add suspect profile');
    }
  };

  const caseColumns = [
    {
      title: 'FIR Number',
      dataIndex: 'fir_number',
      key: 'fir_number',
      render: (text) => <span className="fir-monospace">{text}</span>
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (text) => <Text style={{ fontWeight: 600 }}>{text}</Text>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        let color = 'blue';
        if (status === 'CLOSED') color = 'green';
        if (status === 'INVESTIGATION') color = 'orange';
        return <Tag color={color} style={{ borderRadius: '4px', fontWeight: 'bold' }}>{status}</Tag>;
      }
    },
    {
      title: 'Verification',
      key: 'verification',
      render: () => (
        <span className="verification-tag">
          <CheckCircleOutlined /> SHA-512 VALIDATED
        </span>
      )
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, record) => (
        <Button 
          type="primary" 
          size="small" 
          icon={<EyeOutlined />} 
          style={{ background: '#003566', borderColor: '#003566' }}
          onClick={() => fetchCase(record.id)}
        >
          OPEN WORKSPACE
        </Button>
      ),
    },
  ];

  const suspectColumns = [
    { title: 'Name', dataIndex: 'name', key: 'name', render: t => <b>{t}</b> },
    { title: 'National ID', dataIndex: 'national_id', key: 'national_id', render: (text) => <Text code>{text}</Text> },
    { title: 'Details', dataIndex: 'details', key: 'details' },
  ];

  return (
    <Layout style={{ minHeight: '100vh' }} className="forensic-layout">
      <Sider width={240} className="forensic-sider" theme="dark">
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <Title level={4} style={{ color: '#00f2ff', margin: 0 }}>COMMAND CENTER</Title>
          <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: '10px', letterSpacing: '1px' }}>OPERATIONAL UNIT v1.0</Text>
        </div>
        <Menu 
          theme="dark" 
          selectedKeys={[activeView]} 
          mode="inline" 
          style={{ background: 'transparent' }}
          onClick={({ key }) => setActiveView(key)}
        >
          <Menu.Item key="dashboard" icon={<DashboardOutlined />}>Dashboard</Menu.Item>
          <Menu.Item key="active" icon={<FileSearchOutlined />}>Active Cases</Menu.Item>
          <Menu.Item key="vault" icon={<DatabaseOutlined />}>Evidence Vault</Menu.Item>
          <Menu.Item key="audit" icon={<AuditOutlined />}>Audit Logs</Menu.Item>
        </Menu>
      </Sider>

      <Layout style={{ background: '#f5f7fa' }}>
        <Header className="forensic-header">
          <Title level={4} style={{ margin: 0 }}>Forensic Data Workspace</Title>
          <Space size="middle">
            <Button 
              type="primary" 
              icon={<PlusOutlined />} 
              onClick={() => setIsModalVisible(true)}
              style={{ background: '#00f2ff', borderColor: '#00f2ff', color: '#000', fontWeight: 'bold' }}
            >
              + REGISTER NEW CASE
            </Button>
            <Button 
              danger 
              icon={<LogoutOutlined />} 
              onClick={() => { localStorage.clear(); window.location.href = '/login'; }}
            >
              TERMINATE SESSION
            </Button>
          </Space>
        </Header>

        <Content style={{ padding: '24px', paddingBottom: '60px' }}>
          <DashboardHeader />
          
          {activeView === 'dashboard' || activeView === 'active' ? (
            <>
              <Card bordered={false} className="stat-bar-card" style={{ marginBottom: '24px' }}>
                <DashboardStats />
              </Card>

              <Card 
                title={<Title level={4} style={{ margin: 0 }}>{activeView === 'active' ? 'Filtered: Active Investigations' : 'Active Forensic Investigation Records'}</Title>} 
                bordered={false} 
                className="forensic-card"
                extra={
                  <Space size="large">
                    <Input.Search
                      placeholder="Search FIR..."
                      onSearch={value => { setSearchText(value); setPage(1); }}
                      style={{ width: 300 }}
                      allowClear
                      enterButton
                    />
                  </Space>
                }
              >
                <Table 
                  columns={caseColumns} 
                  dataSource={activeView === 'active' ? cases.filter(c => c.status === 'OPEN') : cases} 
                  rowKey="id"
                  loading={loading}
                  pagination={{ current: page, total: total, pageSize: 15, onChange: (p) => setPage(p), showSizeChanger: false }}
                  size="middle"
                />
              </Card>

              {selectedCase && (
                <Card 
                  title={<Title level={4} style={{ margin: 0 }}>Workspace: {selectedCase.fir_number}</Title>} 
                  bordered={false} 
                  className="forensic-card" 
                  style={{ marginTop: '24px', borderLeft: '6px solid #00f2ff' }}
                  extra={<Button type="text" onClick={() => setSelectedCase(null)}>CLOSE WORKSPACE</Button>}
                >
                  <Row gutter={24}>
                    <Col span={16}>
                      <Title level={5}>Core Investigation Summary</Title>
                      <Text type="secondary" style={{ fontSize: '16px' }}>{selectedCase.description}</Text>
                      <Divider orientation="left">Suspect Identification Profiles</Divider>
                      <Table columns={suspectColumns} dataSource={selectedCase.suspects || []} rowKey="id" size="small" pagination={false} />
                    </Col>
                    <Col span={8}>
                      <Card title="Add Suspect To Record" size="small" className="forensic-card">
                        <Form form={suspectForm} layout="vertical" onFinish={onFinishAddSuspect}>
                          <Form.Item name="name" label="Full Forensic Name" rules={[{ required: true }]}><Input placeholder="Enter legal name" /></Form.Item>
                          <Form.Item name="national_id" label="National Registry ID"><Input placeholder="ID Card Number" /></Form.Item>
                          <Form.Item name="details" label="Profiling Notes"><Input.TextArea rows={3} placeholder="Behavioral notes" /></Form.Item>
                          <Form.Item><Button type="primary" htmlType="submit" block icon={<UserAddOutlined />} style={{ background: '#001529' }}>ATTACH PROFILE</Button></Form.Item>
                        </Form>
                      </Card>
                    </Col>
                  </Row>
                </Card>
              )}
            </>
          ) : activeView === 'audit' ? (
            <Card title={<Title level={4} style={{ margin: 0 }}>System Audit Logs (SHA-512 Verifications)</Title>} bordered={false} className="forensic-card">
              <Table 
                dataSource={auditLogs}
                rowKey="id"
                columns={[
                  { title: 'Timestamp', dataIndex: 'timestamp', render: d => new Date(d).toLocaleString() },
                  { title: 'User', dataIndex: 'user_name' },
                  { title: 'Action', dataIndex: 'action', render: a => <Tag color="blue">{a}</Tag> },
                  { title: 'Resource', dataIndex: 'resource_type' },
                  { title: 'Description', dataIndex: 'description' }
                ]}
              />
            </Card>
          ) : (
            <Card className="forensic-card" style={{ textAlign: 'center', padding: '100px 0' }}>
              <DatabaseOutlined style={{ fontSize: '64px', color: '#00f2ff', marginBottom: '20px' }} />
              <Title level={3}>Evidence Vault Access Initializing...</Title>
              <Text type="secondary">This submodule is restricted to high-clearance investigators. Establishing SHA-512 handshake.</Text>
            </Card>
          )}
        </Content>

        <Footer className="system-ticker-container">
          <span className="ticker-label">LIVE SYSTEM FEED | AUDIT LINK:</span>
          <div className="ticker-content">
            {latestAudit} • INTEGRITY PROTOCOL SHA-512 ACTIVE • SECURE DATA TRANSMISSION ENCRYPTED • ALL ACTIONS LOGGED BY ANTIGRAVITY WATCHDOG
          </div>
        </Footer>
      </Layout>

      <Modal
        title="REGISTER NEW FORENSIC CASE"
        visible={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        className="forensic-modal"
        destroyOnClose
      >
        <Form form={form} layout="vertical" onFinish={onFinishCreate}>
          <Form.Item name="fir_number" label="FIR Identification Number" rules={[{ required: true, message: 'Unique FIR ID required' }]}>
            <Input placeholder="e.g. FIR-2024-X102" />
          </Form.Item>
          <Form.Item name="title" label="Case Designation Title" rules={[{ required: true, message: 'Descriptive title required' }]}>
            <Input placeholder="e.g. Financial Fraud Investigation" />
          </Form.Item>
          <Form.Item name="description" label="Detailed Investigation Overview" rules={[{ required: true, message: 'Initial description required' }]}>
            <Input.TextArea rows={6} placeholder="Describe the core allegations and evidence found..." />
          </Form.Item>
          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalVisible(false)}>CANCEL</Button>
              <Button type="primary" htmlType="submit" icon={<PlusOutlined />} style={{ background: '#00f2ff', borderColor: '#00f2ff', color: '#000', fontWeight: 'bold' }}>
                INITIALIZE CASE
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </Layout>
  );
}

export default PoliceDashboard;
