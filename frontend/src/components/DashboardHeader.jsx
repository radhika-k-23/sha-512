import { Card, Space } from 'antd';
import { ShieldCheck } from 'lucide-react';
import TextType from './TextType';

const DashboardHeader = () => {
  return (
    <Card style={{ marginBottom: 20, background: '#141414', border: '1px solid #303030', borderRadius: '12px' }}>
      <Space align="start">
        <ShieldCheck size={24} color="#52c41a" style={{ marginTop: 4 }} />
        <div>
          <h2 style={{ color: '#fff', marginBottom: 0 }}>Police Command Center</h2>
          <TextType 
            text={[
              "Establishing secure connection to Evidence Vault...",
              "System Integrity: SHA-512 Handshake Verified.",
              "Welcome, Investigator. All systems are SECURE."
            ]}
            typingSpeed={30}
            deletingSpeed={15}
            pauseDuration={2500}
            loop={true}
            className="forensic-terminal"
            textColors={['#8c8c8c', '#8c8c8c', '#52c41a']} 
            cursorCharacter="_"
          />
        </div>
      </Space>
    </Card>
  );
};

export default DashboardHeader;
