import { useState, useEffect, useCallback } from 'react';
import { auth } from '../lib/firebase';
import { Shield, Users, Calendar, AlertTriangle, CheckCircle, XCircle, Lock, Unlock, FileText, BarChart3, RefreshCw } from 'lucide-react';

interface AdminStats {
  total_users: number;
  total_weeks: number;
  total_exchanges: number;
  total_commission: number;
}

interface PendingWeek {
  id: string;
  resort: string;
  cidade: string;
  estado: string;
  owner_id: string;
  contract_pdf_url?: string;
  resort_proof_pdf_url?: string;
  week_points: number;
  check_in: string;
  check_out: string;
}

interface AdminUser {
  uid: string;
  name: string;
  email: string;
  credits_balance: number;
  account_status: string;
  is_admin: boolean;
  avg_rating: number;
  review_count: number;
}

interface AuditLog {
  id: string;
  action: string;
  user_id: string;
  created_at: any;
  [key: string]: any;
}

const API_URL = import.meta.env.VITE_API_URL || '';

async function adminFetch(path: string, options?: RequestInit) {
  const token = await auth.currentUser?.getIdToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      ...(options?.headers || {}),
    },
  });
  return res.json();
}

type Tab = 'stats' | 'docs' | 'users' | 'logs';

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<Tab>('stats');
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [pendingWeeks, setPendingWeeks] = useState<PendingWeek[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState('');

  const fetchStats = useCallback(async () => {
    const data = await adminFetch('/api/admin/stats');
    if (data.total_users !== undefined) setStats(data);
  }, []);

  const fetchPendingWeeks = useCallback(async () => {
    const data = await adminFetch('/api/admin/weeks-pending-docs');
    if (data.weeks) setPendingWeeks(data.weeks);
  }, []);

  const fetchUsers = useCallback(async () => {
    const data = await adminFetch('/api/admin/users');
    if (data.users) setUsers(data.users);
  }, []);

  const fetchLogs = useCallback(async () => {
    const data = await adminFetch('/api/admin/audit-logs');
    if (data.logs) setLogs(data.logs);
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  useEffect(() => {
    if (activeTab === 'docs') fetchPendingWeeks();
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'logs') fetchLogs();
  }, [activeTab, fetchPendingWeeks, fetchUsers, fetchLogs]);

  const verifyWeek = async (weekId: string, approved: boolean) => {
    const reason = approved ? '' : prompt('Motivo da reprovação:') || '';
    setLoading(true);
    const data = await adminFetch('/api/admin/verify-week', {
      method: 'POST',
      body: JSON.stringify({ weekId, approved, reason }),
    });
    setLoading(false);
    if (data.success) {
      setActionMsg(approved ? '✅ Documentos aprovados!' : '❌ Documentos reprovados!');
      fetchPendingWeeks();
      setTimeout(() => setActionMsg(''), 3000);
    }
  };

  const toggleUserLock = async (uid: string, currentStatus: string) => {
    const lock = currentStatus !== 'RISK_LOCKED';
    const reason = lock ? prompt('Motivo do bloqueio:') || '' : '';
    setLoading(true);
    const data = await adminFetch('/api/admin/toggle-user-lock', {
      method: 'POST',
      body: JSON.stringify({ targetUserId: uid, lock, reason }),
    });
    setLoading(false);
    if (data.success) {
      setActionMsg(lock ? '🔒 Usuário bloqueado!' : '🔓 Usuário desbloqueado!');
      fetchUsers();
      setTimeout(() => setActionMsg(''), 3000);
    }
  };

  const tabs: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'stats', label: 'Estatísticas', icon: <BarChart3 size={16} /> },
    { key: 'docs', label: `Documentos (${pendingWeeks.length})`, icon: <FileText size={16} /> },
    { key: 'users', label: 'Usuários', icon: <Users size={16} /> },
    { key: 'logs', label: 'Audit Logs', icon: <AlertTriangle size={16} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-900 text-white px-6 py-6">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <Shield size={28} className="text-indigo-300" />
          <div>
            <h1 className="text-2xl font-black">Painel Admin</h1>
            <p className="text-slate-300 text-sm">WeekSwap — Área Restrita</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Mensagem de ação */}
        {actionMsg && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl font-medium">
            {actionMsg}
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 bg-white rounded-2xl p-1.5 shadow-sm border border-gray-100 w-fit">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-colors ${
                activeTab === tab.key
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* TAB: STATS */}
        {activeTab === 'stats' && stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: 'Usuários', value: stats.total_users, icon: <Users size={24} />, color: 'indigo' },
              { label: 'Semanas Cadastradas', value: stats.total_weeks, icon: <Calendar size={24} />, color: 'blue' },
              { label: 'Trocas Finalizadas', value: stats.total_exchanges, icon: <CheckCircle size={24} />, color: 'green' },
              { label: 'Comissão Total', value: `R$ ${(stats.total_commission || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: <BarChart3 size={24} />, color: 'yellow' },
            ].map(stat => (
              <div key={stat.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className={`text-${stat.color}-500 mb-3`}>{stat.icon}</div>
                <p className="text-3xl font-black text-gray-800">{stat.value}</p>
                <p className="text-sm text-gray-500 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* TAB: DOCUMENTOS */}
        {activeTab === 'docs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-gray-800">Semanas aguardando verificação de documentos</h2>
              <button onClick={fetchPendingWeeks} className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-sm">
                <RefreshCw size={14} /> Atualizar
              </button>
            </div>
            {pendingWeeks.length === 0 && (
              <div className="bg-white rounded-2xl p-8 text-center text-gray-500 shadow-sm border border-gray-100">
                ✅ Nenhuma semana aguardando verificação!
              </div>
            )}
            {pendingWeeks.map(week => (
              <div key={week.id} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-bold text-gray-800">{week.resort}</h3>
                    <p className="text-sm text-gray-500">📍 {week.cidade}, {week.estado}</p>
                    <p className="text-sm text-gray-500">📅 {week.check_in} → {week.check_out}</p>
                    <p className="text-sm text-indigo-600 font-medium mt-1">{(week.week_points || 0).toLocaleString('pt-BR')} pts</p>
                    <p className="text-xs text-gray-400 mt-1">Owner ID: {week.owner_id}</p>
                  </div>
                  <div className="flex flex-col gap-2 shrink-0">
                    {week.contract_pdf_url && (
                      <a href={week.contract_pdf_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-lg hover:bg-blue-100 transition-colors">
                        📄 Contrato
                      </a>
                    )}
                    {week.resort_proof_pdf_url && (
                      <a href={week.resort_proof_pdf_url} target="_blank" rel="noopener noreferrer"
                        className="text-xs bg-blue-50 text-blue-600 px-3 py-1 rounded-lg hover:bg-blue-100 transition-colors">
                        📄 Comprovante
                      </a>
                    )}
                    <button
                      onClick={() => verifyWeek(week.id, true)}
                      disabled={loading}
                      className="flex items-center gap-1 text-sm bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-50"
                    >
                      <CheckCircle size={14} /> Aprovar
                    </button>
                    <button
                      onClick={() => verifyWeek(week.id, false)}
                      disabled={loading}
                      className="flex items-center gap-1 text-sm bg-red-100 hover:bg-red-200 text-red-600 px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-50"
                    >
                      <XCircle size={14} /> Reprovar
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB: USUÁRIOS */}
        {activeTab === 'users' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-gray-800">Usuários cadastrados</h2>
              <button onClick={fetchUsers} className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-sm">
                <RefreshCw size={14} /> Atualizar
              </button>
            </div>
            {users.map(u => (
              <div key={u.uid} className={`bg-white rounded-2xl p-4 shadow-sm border ${u.account_status === 'RISK_LOCKED' ? 'border-red-200 bg-red-50' : 'border-gray-100'}`}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-800 truncate">{u.name || 'Sem nome'}</p>
                      {u.is_admin && <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">ADMIN</span>}
                      {u.account_status === 'RISK_LOCKED' && <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">🔒 BLOQUEADO</span>}
                    </div>
                    <p className="text-sm text-gray-500 truncate">{u.email}</p>
                    <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                      <span>💰 {(u.credits_balance || 0).toLocaleString('pt-BR')} pts</span>
                      {u.review_count > 0 && <span>⭐ {u.avg_rating}/5 ({u.review_count} avaliações)</span>}
                    </div>
                  </div>
                  <button
                    onClick={() => toggleUserLock(u.uid, u.account_status)}
                    disabled={loading || u.is_admin}
                    className={`flex items-center gap-1 text-sm px-4 py-2 rounded-xl font-medium transition-colors disabled:opacity-30 shrink-0 ${
                      u.account_status === 'RISK_LOCKED'
                        ? 'bg-green-100 text-green-700 hover:bg-green-200'
                        : 'bg-red-100 text-red-600 hover:bg-red-200'
                    }`}
                  >
                    {u.account_status === 'RISK_LOCKED' ? <><Unlock size={14} /> Desbloquear</> : <><Lock size={14} /> Bloquear</>}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* TAB: AUDIT LOGS */}
        {activeTab === 'logs' && (
          <div className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-lg font-bold text-gray-800">Logs de auditoria (últimos 100)</h2>
              <button onClick={fetchLogs} className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-sm">
                <RefreshCw size={14} /> Atualizar
              </button>
            </div>
            {logs.map(log => (
              <div key={log.id} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 text-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded text-gray-700 font-bold">{log.action}</span>
                    <span className="text-gray-500 ml-2 text-xs">por {log.user_id?.substring(0,8)}...</span>
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">
                    {log.created_at?.toDate?.()?.toLocaleString('pt-BR') || '—'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
