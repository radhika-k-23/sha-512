import React, { useState, useEffect } from 'react';
import { 
  Layout, Typography, Table, Button, Input, Card, 
  Tag, Space, Select, Form, Row, Col, message, Tooltip, Upload
} from 'antd';
import { 
  UploadOutlined, SearchOutlined, LogoutOutlined, 
  CheckCircleOutlined, WarningOutlined, DownloadOutlined,
  FileSearchOutlined
} from '@ant-design/icons';
import api from '../api/axiosClient';
import DashboardStats from '../components/DashboardStats';

const { Content } = Layout;
const { Title, Text } = Typography;
const { Option } = Select;

const CATEGORIES = ['DIGITAL', 'DOCUMENT', 'BIOLOGICAL', 'PHYSICAL', 'OTHER'];

function FSLDashboard() {
  const [cases, setCases] = useState([]);
  const [evidenceList, setEvidenceList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [searchText, setSearchText] = useState('');
  const [integrityLoading, setIntegrityLoading] = useState({});
  const [integrityResult, setIntegrityResult] = useState({});
  
  const [form] = Form.useForm();

  useEffect(() => {
    api.get('cases/').then(r => {
      // Handle potential paginated response from cases too
      setCases(r.data.results || r.data);
    }).catch(() => message.error('Failed to fetch cases'));
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

  const handleUpload = async (values) => {
    if (!values.file || !values.file.file) {
      message.warning('Please select a file');
      return;
    }
    
    const formData = new FormData();
    formData.append('case', values.case);
    formData.append('file', values.file.file);
    formData.append('description', values.description || '');
    formData.append('category', values.category);
    
    setUploading(true);
    try {
      await api.post('evidence/', formData, { 
        headers: { 'Content-Type': 'multipart/form-data' } 
      });
      message.success('Evidence uploaded and secured with SHA-512');
      form.resetFields();
      fetchEvidence();
    } catch (err) {
      message.error('Upload failed. Check case selection and permissions.');
    } finally {
      setUploading(false);
    }
  };

  const checkIntegrity = async (id) => {
    setIntegrityLoading(prev => ({ ...prev, [id]: true }));
    try {
      const res = await api.post(`evidence/${id}/check_integrity/`);
      setIntegrityResult(prev => ({ ...prev, [id]: res.data }));
      if (res.data.integrity) {
        message.success('Integrity Verified: File is secure.');
      } else {
        message.error('INTEGRITY ALERT: File has been tampered with!');
      }
    } catch (err) {
      message.error('Integrity check failed');
    } finally {
      setIntegrityLoading(prev => ({ ...prev, [id]: false }));
    }
  };

  const handleDownload = (id, filename) => {
    // Open in new tab for streaming
    const url = `${api.defaults.baseURL}evidence/${id}/download/`;
    const token = localStorage.getItem('access');
    
    // We can't easily add auth headers to a simple window.open
    // For a production app, we'd use a temporary download blob or a signed URL
    // For now, we'll try to fetch and create a blob
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
    {
      title: 'File Name',
      dataIndex: 'original_filename',
      key: 'filename',
      ellipsis: true,
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      render: (cat) => <Tag>{cat}</Tag>
    },
    {
      title: 'SHA-512 Hash',
      dataIndex: 'sha512_hash',
      key: 'hash',
      render: (hash) => (
        <Tooltip title={hash}>
          <Text code style={{ fontSize: '11px' }}>{hash?.slice(0, 12)}...</Text>
        </Tooltip>
      )
    },
    {
      title: 'Verified',
      dataIndex: 'is_verified',
      key: 'verified',
      render: (verified) => (
        verified 
          ? <Tag color="green">Verified</Tag>
          : <Tag color="warning">Pending</Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => {
        const result = integrityResult[record.id];
        return (
          <Space>
            <Button 
              size="small" 
              icon={<FileSearchOutlined />} 
              loading={integrityLoading[record.id]}
              onClick={() => checkIntegrity(record.id)}
            >
              Verify
            </Button>
            <Tooltip title={`SHA-512: ${record.sha512_hash}`}>
              <Button 
                size="small" 
                icon={<DownloadOutlined />} 
                onClick={() => handleDownload(record.id, record.original_filename)}
              />
            </Tooltip>
            {result && (
              result.integrity 
                ? <CheckCircleOutlined style={{ color: '#52c41a' }} />
                : <WarningOutlined style={{ color: '#f5222d' }} />
            )}
          </Space>
        );
      }
    }
  ];

  return (
    <Layout className="layout" style={{ minHeight: '100vh', padding: '24px' }}>
      <Content>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <Title level={2}>Forensics (FSL) Dashboard</Title>
          <Button 
            danger 
            icon={<LogoutOutlined />} 
            onClick={() => { localStorage.clear(); window.location.href = '/login'; }}
          >
            Logout
          </Button>
        </div>

        <DashboardStats />

        <Row gutter={24}>
          <Col span={8}>
            <Card title="Upload Digital Evidence" bordered={false} className="shadow-sm">
              <Form form={form} layout="vertical" onFinish={handleUpload} initialValues={{ category: 'DIGITAL' }}>
                <Form.Item name="case" label="Associated Case" rules={[{ required: true }]}>
                  <Select placeholder="Select case">
                    {cases.map(c => (
                      <Option key={c.id} value={c.id}>
                        {c.fir_number} — {c.title}
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
                <Form.Item name="category" label="Category" rules={[{ required: true }]}>
                  <Select>
                    {CATEGORIES.map(cat => <Option key={cat} value={cat}>{cat}</Option>)}
                  </Select>
                </Form.Item>
                <Form.Item name="description" label="Description">
                  <Input.TextArea rows={2} />
                </Form.Item>
                <Form.Item name="file" label="Evidence File" rules={[{ required: true }]}>
                  <Upload beforeUpload={() => false} maxCount={1}>
                    <Button icon={<UploadOutlined />}>Select File</Button>
                  </Upload>
                </Form.Item>
                <Form.Item>
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    block 
                    loading={uploading}
                    style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                  >
                    Upload & Secure (SHA-512)
                  </Button>
                </Form.Item>
              </Form>
            </Card>
          </Col>

          <Col span={16}>
            <Card 
              title="Uploaded Evidence" 
              bordered={false} 
              className="shadow-sm"
              extra={
                <Input.Search
                  placeholder="Search filename or category"
                  onSearch={value => { setSearchText(value); setPage(1); }}
                  style={{ width: 250 }}
                  allowClear
                />
              }
            >
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
          </Col>
        </Row>
      </Content>
    </Layout>
  );
}

export default FSLDashboard;
