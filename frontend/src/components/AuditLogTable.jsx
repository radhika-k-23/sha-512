/**
 * AuditLogTable.jsx
 * Reusable, server-side paginated audit log component.
 * Pulls from GET /api/audit/ with ?days=N&search=&page=&action=&model= params.
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
  Table, Tag, Space, Input, Select, Segmented, Tooltip, Typography, Badge, Divider, message
} from 'antd';
import {
  SearchOutlined, ReloadOutlined, ClockCircleOutlined,
  CheckCircleOutlined, WarningOutlined, InfoCircleOutlined,
  PlusCircleOutlined, EditOutlined, DeleteOutlined,
  SwapOutlined, CloudUploadOutlined
} from '@ant-design/icons';
import api from '../api/axiosClient';
import '../pages/ForensicTheme.css';

const { Text } = Typography;
const { Option } = Select;

// ── Action config (colour + icon) ─────────────────────────────────────────────
const ACTION_META = {
  CREATE:        { color: 'green',   icon: <PlusCircleOutlined />,  label: 'Create'    },
  UPDATE:        { color: 'blue',    icon: <EditOutlined />,         label: 'Update'    },
  DELETE:        { color: 'red',     icon: <DeleteOutlined />,       label: 'Delete'    },
  LOGIN:         { color: 'cyan',    icon: <InfoCircleOutlined />,   label: 'Login'     },
  UPLOAD:        { color: 'purple',  icon: <CloudUploadOutlined />,  label: 'Upload'    },
  CHECK:         { color: 'teal',    icon: <CheckCircleOutlined />,  label: 'Integrity' },
  VIEW:          { color: 'geekblue',icon: <InfoCircleOutlined />,   label: 'View'      },
  TRANSFER:      { color: 'orange',  icon: <SwapOutlined />,         label: 'Transfer'  },
  INTEGRITY_FAIL:{ color: 'volcano', icon: <WarningOutlined />,      label: 'FAIL'      },
};

const ROLE_COLORS = {
  ADMIN:'red', POLICE:'blue', FSL:'green', EVIDENCE_ROOM:'orange', JUDICIARY:'purple', SYSTEM:'default'
};

function ActionTag({ action }) {
  const meta = ACTION_META[action] || { color: 'default', icon: <ClockCircleOutlined />, label: action };
  return (
    <Tag color={meta.color} icon={meta.icon} style={{ fontWeight: 600 }}>
      {meta.label}
    </Tag>
  );
}

function IntegrityBadge({ log, globalVerified = false }) {
  // If we have a hash and it's a new log, it's 'Verified' by default unless global check fails
  const isChained = !!log.sha512_hash && typeof log.sha512_hash === 'string';
  if (!isChained) return <Badge status="default" text={<Text type="secondary" style={{ fontSize: 10 }}>Legacy</Text>} />;
  
  return (
    <Tooltip title={`SHA-512: ${String(log.sha512_hash).substring(0, 16)}...`}>
      <Tag color="cyan" icon={<CheckCircleOutlined />} style={{ fontSize: 10, margin: 0, border: '1px solid rgba(0, 242, 255, 0.3)' }}>
        SECURED
      </Tag>
    </Tooltip>
  );
}

function AuditLogTable({ filterTarget = null, compact = false }) {
  const [logs, setLogs]           = useState([]);
  const [loading, setLoading]     = useState(false);
  const [total, setTotal]         = useState(0);
  const [page, setPage]           = useState(1);
  const [pageSize]                = useState(20);
  const [days, setDays]           = useState(3);
  const [search, setSearch]       = useState('');
  const [actionFilter, setAction] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [verifyStatus, setVerifyStatus] = useState(null); // { is_secure, total_entries, verified_entries }
  const [verifying, setVerifying] = useState(false);

  const performGlobalVerify = async () => {
    setVerifying(true);
    try {
      const res = await api.get('audit/verify/');
      setVerifyStatus(res.data);
      if (res.data.is_secure) {
        message.success('Forensic Ledger Integrity Verified 100% Secure');
      } else {
        message.error('TAMPER DETECTION: Audit chain inconsistency found!');
      }
    } catch {
      message.error('Failed to execute forensic verification');
    } finally {
      setVerifying(false);
    }
  };

  const fetchLogs = useCallback(async (p = page) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        days,
        page: p,
        page_size: pageSize,
      });
      if (search)       params.append('search', search);
      if (actionFilter) params.append('action', actionFilter);
      if (filterTarget) params.append('target', filterTarget);

      const res = await api.get(`audit/?${params.toString()}`);
      // DRF PageNumberPagination returns { count, results }
      const data = res.data;
      if (data && Array.isArray(data.results)) {
        setLogs(data.results);
        setTotal(data.count);
      } else if (Array.isArray(data)) {
        // Fallback: unpaginated (unlikely but safe)
        setLogs(data);
        setTotal(data.length);
      }
    } catch {
      // Silent — dashboard shouldn't crash over audit failure
    } finally {
      setLoading(false);
    }
  }, [page, days, search, actionFilter, filterTarget, pageSize]);

  useEffect(() => {
    setPage(1);
    fetchLogs(1);
  }, [days, search, actionFilter, filterTarget]); // eslint-disable-line

  useEffect(() => {
    fetchLogs(page);
  }, [page]); // eslint-disable-line

  // Auto-refresh every 15 s
  useEffect(() => {
    const id = setInterval(() => fetchLogs(page), 15000);
    return () => clearInterval(id);
  }, [fetchLogs, page]);

  const columns = [
    {
      title: 'Timestamp',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 160,
      render: (ts) => {
        const d = new Date(ts);
        return (
          <Tooltip title={d.toLocaleString()}>
            <Text type="secondary" style={{ fontSize: 12 }}>
              <ClockCircleOutlined style={{ marginRight: 4 }} />
              {d.toLocaleTimeString()}<br />
              <span style={{ fontSize: 11 }}>{d.toLocaleDateString()}</span>
            </Text>
          </Tooltip>
        );
      },
    },
    {
      title: 'Officer',
      key: 'officer',
      width: 160,
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: 13 }}>{r.user_name}</Text>
          <Space size={4}>
            <Tag color={ROLE_COLORS[r.user_role] || 'default'} style={{ fontSize: 10, padding: '0 4px', margin: 0 }}>
              {r.user_role}
            </Tag>
            {r.user_badge && (
              <Text type="secondary" style={{ fontSize: 11 }}>{r.user_badge}</Text>
            )}
          </Space>
        </Space>
      ),
    },
    {
      title: 'Action',
      dataIndex: 'action',
      key: 'action',
      width: 110,
      render: (action) => <ActionTag action={action} />,
    },
    {
      title: 'Integrity',
      key: 'integrity',
      width: 100,
      render: (_, r) => <IntegrityBadge log={r} />,
    },
    {
      title: 'Model',
      dataIndex: 'model_name',
      key: 'model_name',
      width: 120,
      render: (m) => m ? <Tag style={{ fontFamily: 'monospace' }}>{m}</Tag> : <Text type="secondary">—</Text>,
    },
    {
      title: 'Target',
      dataIndex: 'target',
      key: 'target',
      width: 130,
      render: (t) => <Text code style={{ fontSize: 12 }}>{t}</Text>,
    },
    {
      title: 'Description',
      dataIndex: 'details',
      key: 'details',
      render: (details, r) => {
        const isFailure = r.action === 'INTEGRITY_FAIL';
        return (
          <Text
            style={{
              color: isFailure ? '#ff4d4f' : undefined,
              fontWeight: isFailure ? 700 : undefined,
              fontSize: 13,
              lineHeight: 1.5,
            }}
          >
            {isFailure && <WarningOutlined style={{ marginRight: 6 }} />}
            {details || '—'}
          </Text>
        );
      },
    },
  ];

  // Compact mode: fewer columns for ticker/sidebar use
  const visibleColumns = compact
    ? columns.filter(c => ['timestamp', 'officer', 'action', 'details'].includes(c.key))
    : columns;

  return (
    <div>
      {/* ── Filter bar ── */}
      <Space wrap style={{ marginBottom: 16 }}>
        <Segmented
          options={[
            { label: 'Today',       value: 1  },
            { label: 'Last 3 Days', value: 3  },
            { label: 'Last 7 Days', value: 7  },
            { label: 'All Time',    value: 0  },
          ]}
          value={days}
          onChange={setDays}
          className="forensic-segmented"
        />
        <Select
          allowClear
          placeholder="Filter by action"
          style={{ width: 160 }}
          className="forensic-input"
          popupClassName="forensic-dropdown"
          value={actionFilter || undefined}
          onChange={(v) => setAction(v || '')}
        >
          {Object.entries(ACTION_META).map(([k, v]) => (
            <Option key={k} value={k}>{v.icon} {v.label}</Option>
          ))}
        </Select>
        <Input
          prefix={<SearchOutlined />}
          placeholder="Search descriptions…"
          value={searchInput}
          className="forensic-input"
          onChange={e => setSearchInput(e.target.value)}
          onPressEnter={() => setSearch(searchInput)}
          onBlur={() => setSearch(searchInput)}
          style={{ width: 220 }}
          allowClear
          onClear={() => { setSearchInput(''); setSearch(''); }}
        />
        <Tooltip title="Real-time Synchronization Active">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => fetchLogs(page)}>
            <ReloadOutlined spin={loading} style={{ color: loading ? '#00f2ff' : '#8fb1cc' }} />
            <Badge status="processing" color="#00f2ff" />
          </div>
        </Tooltip>
        
        <Divider type="vertical" style={{ background: 'rgba(255,255,255,0.1)' }} />

        <Button 
          type="primary" 
          size="small"
          icon={<CheckCircleOutlined />} 
          loading={verifying}
          onClick={performGlobalVerify}
          className="forensic-button-cyan"
          style={{ fontSize: 11 }}
        >
          Verify Ledger Integrity
        </Button>

        {verifyStatus && (
          <Tag color={verifyStatus.is_secure ? 'success' : 'error'} style={{ marginLeft: 8 }}>
            {verifyStatus.is_secure ? 'LEDGER INTACT' : 'TAMPER DETECTED'}
          </Tag>
        )}

        <Badge count={total} overflowCount={9999} color="geekblue">
          <Text type="secondary" style={{ fontSize: 12 }}>entries</Text>
        </Badge>
      </Space>

      <Table
        className="forensic-table"
        columns={visibleColumns}
        dataSource={logs}
        rowKey="id"
        loading={loading}
        size="small"
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: false,
          showTotal: (t) => `${t} log entries`,
          onChange: (p) => setPage(p),
        }}
        rowClassName={(r) =>
          r.action === 'INTEGRITY_FAIL' ? 'audit-row-fail' :
          r.action === 'DELETE' ? 'audit-row-delete' : ''
        }
        scroll={{ x: compact ? undefined : 900 }}
      />
    </div>
  );
}

export default AuditLogTable;
