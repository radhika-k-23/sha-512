import React, { useState, useEffect } from 'react';
import { 
  Layout, Typography, Table, Button, Card, Tabs,
  Tag, Space, Form, Input, Select, Modal, Alert, notification, Tooltip
} from 'antd';
import { 
  UserAddOutlined, LogoutOutlined, SafetyOutlined, 
  CopyOutlined, ReloadOutlined, SafetyCertificateOutlined, HistoryOutlined
} from '@ant-design/icons';
import api from '../api/axiosClient';
import AuditLogTable from '../components/AuditLogTable';
import './ForensicTheme.css';
import './AdminDashboard.css';

const { Header, Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

function TextType({ text }) {
  const [internalText, setInternalText] = useState('');

  useEffect(() => {
    setInternalText('');
    let i = 0;
    const timer = setInterval(() => {
      setInternalText(text.substring(0, i + 1));
      i++;
      if (i === text.length) clearInterval(timer);
    }, 50);
    return () => clearInterval(timer);
  }, [text]);

  return <p className="typewriter-text">{internalText}</p>;
}

function AdminDashboard() {
  const [officers, setOfficers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [successInfo, setSuccessInfo] = useState(null);
  const [typewriterMsg, setTypewriterMsg] = useState('Connection Secure. Root Terminal Active.');

  const [form] = Form.useForm();
  
  // Extract user info from token
  const tokenPayload = JSON.parse(atob(localStorage.getItem('access').split('.')[1]));
  const myBadge = tokenPayload.badge_number || 'ROOT';

  useEffect(() => {
    fetchOfficers();
  }, []);

  const fetchOfficers = async () => {
    setLoading(true);
    setTypewriterMsg('Decrypting Data... Syncing Officer Table...');
    try {
      const res = await api.get('accounts/admin/officers/');
      setOfficers(res.data);
      setTypewriterMsg('System Status: User Database Synchronized [SHA-512 SECURE]');
    } catch (err) {
      notification.error({ message: 'Sync Failed', description: 'Could not retrieve officer list.' });
      setTypewriterMsg('Warning: Connection to User Database Interrupted.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (values) => {
    setSubmitting(true);
    setTypewriterMsg('Generating secure officer credentials...');
    try {
      const res = await api.post('accounts/admin/create-officer/', values);
      notification.success({ 
        message: 'Account Provisioned', 
        description: 'Officer identity secured with SHA-512 backend hash.',
        icon: <SafetyCertificateOutlined style={{ color: '#00f2ff' }} />
      });
      setSuccessInfo(res.data);
      form.resetFields();
      fetchOfficers();
    } catch (err) {
      console.error('Provisioning Error:', err.response?.data);
      const errorData = err.response?.data;
      let errorMsg = 'Could not provision account.';

      if (typeof errorData === 'object' && errorData !== null) {
        errorMsg = Object.entries(errorData)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val.join(' ') : val}`)
          .join(' | ');
      }

      notification.error({ 
        message: 'Registration Error', 
        description: errorMsg,
        duration: 8
      });
      setTypewriterMsg('Error: Account provisioning interrupted.');
    } finally {
      setSubmitting(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    notification.success({ message: 'Copied to Clipboard', placement: 'bottomRight' });
  };

  const columns = [
    {
      title: 'Badge Number',
      dataIndex: 'badge_number',
      key: 'badge_number',
      render: (text) => <Text code style={{ fontSize: '14px', background: 'rgba(0,0,0,0.4)', color: '#00f2ff', border: '1px solid #00f2ff' }}>{text}</Text>
    },
    {
      title: 'Full Name',
      key: 'fullname',
      render: (_, record) => <Text style={{ color: '#fff' }}>{record.first_name} {record.last_name}</Text>
    },
    {
      title: 'Role Designator',
      dataIndex: 'role',
      key: 'role',
      render: (role) => {
        const colors = {
          ADMIN: 'red', POLICE: 'blue', FSL: 'green', EVIDENCE_ROOM: 'orange', JUDICIARY: 'purple'
        };
        return <Tag color={colors[role] || 'blue'} style={{ fontWeight: 'bold' }}>{role}</Tag>;
      }
    },
    {
      title: 'Department',
      dataIndex: 'department',
      key: 'department',
      render: t => <span style={{ color: '#a0b0c0' }}>{t || 'Unassigned'}</span>
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      render: active => active ? <Tag color="green">ACTIVE</Tag> : <Tag color="red">SUSPENDED</Tag>
    }
  ];

  return (
    <Layout className="forensic-layout-dark">
      <Header className="admin-header">
        <Space size="middle" align="center">
          <SafetyOutlined style={{ fontSize: '28px', color: '#00f2ff', textShadow: '0 0 10px #00f2ff' }} />
          <div>
            <Title level={4} style={{ color: '#fff', margin: 0, textShadow: '0 0 10px rgba(0,242,255,0.5)' }}>Master Forensic System</Title>
            <Text style={{ color: '#00f2ff', fontSize: '11px', letterSpacing: '2px' }}>ZERO-TRUST ARCHITECTURE</Text>
          </div>
        </Space>
        
        <Space size="large">
          <Tag color="black" style={{ border: '1px solid #00f2ff', padding: '4px 12px', fontSize: '14px' }}>
            <span style={{ color: '#8fb1cc', marginRight: '8px' }}>Active Session:</span> 
            <span style={{ color: '#00f2ff', fontWeight: 'bold' }}>{myBadge}</span>
          </Tag>
          <Button 
            danger 
            ghost
            icon={<LogoutOutlined />} 
            onClick={() => { localStorage.clear(); window.location.href = '/#/login'; }}
            style={{ fontWeight: 'bold' }}
          >
            TERMINATE
          </Button>
        </Space>
      </Header>

      <Content style={{ padding: '40px 60px', position: 'relative', zIndex: 1 }}>
        
        {/* Typewriter feedback block */}
        <div style={{ marginBottom: '30px', background: 'rgba(0,0,0,0.5)', padding: '15px 20px', borderRadius: '8px', borderLeft: '4px solid #00f2ff' }}>
          <TextType text={typewriterMsg} />
        </div>

        <Tabs
          defaultActiveKey="officers"
          size="large"
          items={[
            {
              key: 'officers',
              label: <Space><SafetyOutlined />Authorized Personnel</Space>,
              children: (
                <Card
                  className="forensic-panel"
                  bordered={false}
                  extra={
                    <Space>
                      <Button type="text" onClick={fetchOfficers} icon={<ReloadOutlined style={{ color: '#00f2ff' }} />} />
                      <Button
                        className="neon-btn"
                        icon={<UserAddOutlined />}
                        onClick={() => { setSuccessInfo(null); setIsModalVisible(true); }}
                      >
                        + ADD OFFICER
                      </Button>
                    </Space>
                  }
                >
                  <Table
                    className="forensic-table"
                    columns={columns}
                    dataSource={officers}
                    rowKey="id"
                    loading={loading}
                    pagination={{ pageSize: 12, style: { color: '#00f2ff' } }}
                  />
                </Card>
              )
            },
            {
              key: 'audit',
              label: <Space><HistoryOutlined />Global Audit Trail</Space>,
              children: (
                <Card className="forensic-panel" bordered={false}>
                  <AuditLogTable />
                </Card>
              )
            },
            {
              key: 'integrity',
              label: <Space><SafetyCertificateOutlined />Forensic Ledger Health</Space>,
              children: (
                <Card className="forensic-panel" bordered={false}>
                  <div style={{ textAlign: 'center', padding: '40px' }}>
                    <SafetyCertificateOutlined style={{ fontSize: '64px', color: '#00f2ff', marginBottom: '24px', opacity: 0.8 }} />
                    <Title level={3} style={{ color: '#fff' }}>SHA-512 Cryptographic Chaining</Title>
                    <Text style={{ color: '#8fb1cc', fontSize: '16px', display: 'block', marginBottom: '32px' }}>
                      The system audit trail is currently protected by an immutable hash-chain.<br />
                      Every action is permanently linked to the previous state of the database.
                    </Text>
                    <AuditLogTable compact />
                  </div>
                </Card>
              )
            }
          ]}
        />

      </Content>

      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <SafetyCertificateOutlined style={{ fontSize: '20px', color: '#00f2ff' }} />
            <span>PROVISION SECURE OFFICER ACCOUNT</span>
          </div>
        }
        open={isModalVisible}
        onCancel={() => !submitting && setIsModalVisible(false)}
        footer={null}
        className="glass-modal"
        destroyOnClose
      >
        {successInfo ? (
          <div style={{ padding: '20px 0' }}>
            <Alert
              className="secure-alert"
              message="Account Provisioned Successfully"
              description={
                <div style={{ marginTop: '10px' }}>
                  <p style={{ margin: '0 0 5px 0', color: '#d8e8f8' }}>The officer identity has been secured with a SHA-512 hashed password.</p>
                  <div style={{ background: 'rgba(0,0,0,0.5)', padding: '10px', borderRadius: '4px', border: '1px solid #333', marginTop: '15px' }}>
                    <p style={{ color: '#8fb1cc', margin: 0, fontSize: '12px' }}>ASSIGNED BADGE NUMBER</p>
                    <p style={{ color: '#00f2ff', margin: '0 0 10px 0', fontSize: '18px', fontWeight: 'bold' }}>{successInfo.badge_number}</p>
                    
                    <p style={{ color: '#8fb1cc', margin: 0, fontSize: '12px' }}>ONE-TIME PASSWORD (COPY NOW)</p>
                    <Space style={{ marginTop: '5px' }}>
                      <Text code copyable style={{ fontSize: '16px' }}>{successInfo.temp_password}</Text>
                      <Tooltip title="Copy Password">
                        <Button 
                          size="small" 
                          icon={<CopyOutlined />} 
                          onClick={() => copyToClipboard(successInfo.temp_password)}
                        />
                      </Tooltip>
                    </Space>
                  </div>
                  <p style={{ color: '#ff4d4f', fontSize: '11px', marginTop: '15px' }}>
                    * WARNING: This password cannot be retrieved again due to one-way SHA-512 hashing.
                  </p>
                </div>
              }
              type="success"
              showIcon
            />
            <Button 
              type="primary" 
              className="neon-btn" 
              block 
              style={{ marginTop: '20px' }}
              onClick={() => setIsModalVisible(false)}
            >
              ACKNOWLEDGE & CLOSE
            </Button>
          </div>
        ) : (
          <Form form={form} layout="vertical" onFinish={handleRegister}>
            <Form.Item name="username" label="System Login ID" rules={[{ required: true, message: 'Username is required' }]}>
              <Input placeholder="e.g. john.doe" />
            </Form.Item>
            
            <Space style={{ display: 'flex', marginBottom: 8 }} align="baseline">
              <Form.Item name="first_name" label="First Name" rules={[{ required: true }]}>
                <Input placeholder="Legal given name" />
              </Form.Item>
              <Form.Item name="last_name" label="Last Name" rules={[{ required: true }]}>
                <Input placeholder="Legal family name" />
              </Form.Item>
            </Space>

            <Form.Item name="email" label="Secure Contact Email" rules={[{ required: true, type: 'email' }]}>
              <Input placeholder="officer@department.gov" />
            </Form.Item>

            <Form.Item name="role" label="Clearance Level Designator" rules={[{ required: true }]}>
              <Select placeholder="Select clearance role">
                <Option value="POLICE">POLICE - Investigative Division</Option>
                <Option value="FSL">FSL - Forensics Laboratory</Option>
                <Option value="EVIDENCE_ROOM">EVIDENCE_ROOM - Vault Security</Option>
                <Option value="JUDICIARY">JUDICIARY - Judicial Oversight</Option>
                <Option value="ADMIN">ADMIN - System Root</Option>
              </Select>
            </Form.Item>

            <Form.Item name="department" label="Assigned Department / Precinct">
              <Input placeholder="e.g. Cyber Crimes Unit" />
            </Form.Item>

            <div style={{ marginTop: '24px', textAlign: 'right' }}>
              <Space>
                <Button onClick={() => setIsModalVisible(false)} style={{ background: 'transparent', color: '#fff' }}>CANCEL</Button>
                <Button 
                  htmlType="submit" 
                  loading={submitting}
                  className="neon-btn"
                  icon={<SafetyOutlined />}
                >
                  PROVISION SECURE KEY
                </Button>
              </Space>
            </div>
          </Form>
        )}
      </Modal>
    </Layout>
  );
}

export default AdminDashboard;
