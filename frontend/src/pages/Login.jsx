import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import { 
  Form, Input, Button, Typography, 
  message, Spin 
} from 'antd';
import { UserOutlined, LockOutlined, SafetyCertificateOutlined, LoadingOutlined } from '@ant-design/icons';
import api from '../api/axiosClient';
import LiquidEther from '../components/LiquidEther';
import './Login.css';

const { Title, Text } = Typography;

function Login() {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const onFinish = async (values) => {
    setLoading(true);
    try {
      const res = await api.post('token/', values);
      
      localStorage.setItem('access', res.data.access);
      localStorage.setItem('refresh', res.data.refresh);
      
      const decodedInfo = jwtDecode(res.data.access);
      const role = decodedInfo.role || 'POLICE';
      
      message.success(`Access Granted: ${role} Profile Initialized`);

      if (role === 'POLICE') navigate('/police-dashboard');
      else if (role === 'FSL') navigate('/fsl-dashboard');
      else if (role === 'JUDICIARY') navigate('/judiciary-dashboard');
      else if (role === 'EVIDENCE_ROOM') navigate('/evidence-room-dashboard');
      else if (role === 'ADMIN') navigate('/admin-dashboard');
      else navigate('/');
      
    } catch (err) {
      message.error('Authentication Error: Access Denied.');
    } finally {
      setLoading(false);
    }
  };

  const antIcon = <LoadingOutlined style={{ fontSize: 24, color: '#00f2ff' }} spin />;

  return (
    <div className="login-container">
      <LiquidEther 
        colors={['#003566', '#00f2ff', '#000814']} 
        mouseForce={15} 
        cursorSize={80} 
      />
      <div className="glass-card-wrapper" style={{ zIndex: 10 }}>
        <div className="glass-card">
          <div className="terminal-header">
            <SafetyCertificateOutlined style={{ fontSize: '48px', color: '#00f2ff', marginBottom: '20px' }} />
            <Title level={2} className="glow-text">DIGITAL EVIDENCE PROTECTION</Title>
            <div className="status-indicator">
              <div className="pulse-dot"></div>
              SECURE LOGIN STATION
            </div>
          </div>

          <Form
            name="terminal_login"
            layout="vertical"
            onFinish={onFinish}
            size="large"
            disabled={loading}
          >
            <Form.Item
              name="username"
              className="terminal-input"
              rules={[{ required: true, message: 'Authorization ID Required' }]}
            >
              <Input 
                prefix={<UserOutlined />} 
                placeholder="Authorization ID" 
                autoComplete="off"
              />
            </Form.Item>
            <Form.Item
              name="password"
              className="terminal-input"
              rules={[{ required: true, message: 'Security Key Required' }]}
            >
              <Input.Password 
                prefix={<LockOutlined />} 
                placeholder="Security Key" 
              />
            </Form.Item>
            <Form.Item style={{ marginTop: '40px' }}>
              <Button 
                type="primary" 
                htmlType="submit" 
                block 
                className="authenticate-btn"
                loading={loading}
              >
                {loading ? 'Decrypting...' : 'Authenticate'}
              </Button>
              {loading && <div style={{ textAlign: 'center' }}>
                <Text className="decrypting-text">INITIALIZING SECURE PROTOCOL...</Text>
              </div>}
            </Form.Item>
          </Form>
          
          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <Text style={{ color: 'rgba(0, 242, 255, 0.4)', fontSize: '10px', letterSpacing: '2px' }}>
              SHA-512 ENCRYPTION ACTIVE
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;
