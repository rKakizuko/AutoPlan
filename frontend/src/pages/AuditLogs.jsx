import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

const AuditLogs = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const token = localStorage.getItem('token');

  const [logs, setLogs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState('');
  const [filters, setFilters] = React.useState({ action: '', entityType: '', actorEmail: '' });

  React.useEffect(() => {
    const fetchLogs = async () => {
      if (!token || user?.role !== 'admin') {
        setLoading(false);
        return;
      }

      const query = new URLSearchParams();
      if (filters.action) query.set('action', filters.action);
      if (filters.entityType) query.set('entityType', filters.entityType);
      if (filters.actorEmail) query.set('actorEmail', filters.actorEmail);

      try {
        const response = await fetch(`http://localhost:5000/api/audit-logs?${query.toString()}`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const data = await response.json();
        if (!response.ok) {
          setError(data.message || 'Erro ao carregar logs');
          setLogs([]);
          return;
        }

        setLogs(Array.isArray(data) ? data : []);
        setError('');
      } catch (err) {
        setError('Erro ao conectar ao servidor');
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
  }, [token, user?.role, filters]);

  if (!user || user.role !== 'admin') {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.logo}>AutoPlan</h1>
          <div style={styles.userSection}>
            <button onClick={() => navigate('/')} style={styles.backBtn}>← Voltar ao Dashboard</button>
          </div>
        </header>
        <div style={styles.card}>
          <h2 style={styles.title}>Acesso negado</h2>
          <p>Apenas administradores podem visualizar o log de alterações.</p>
        </div>
      </div>
    );
  }

  const getActionSummary = (log) => {
    const actionMap = {
      user_registered: 'Novo usuario se cadastrou',
      user_logged_in: 'Usuario entrou no sistema',
      user_created: 'Usuario criado por administrador',
      user_updated: 'Dados do usuario foram atualizados',
      user_profile_updated: 'Usuario atualizou o proprio perfil',
      user_deleted: 'Usuario removido por administrador',
      protocol_created: 'Novo protocolo foi criado',
      protocol_payment_updated: 'Status de pagamento do protocolo foi atualizado',
      payment_rules_created: 'Regras de pagamento foram criadas',
      payment_rules_updated: 'Regras de pagamento foram atualizadas',
    };

    if (actionMap[log.action]) return actionMap[log.action];

    return log.action
      ?.split('_')
      .filter(Boolean)
      .join(' ')
      .replace(/^./, (char) => char.toUpperCase()) || 'Acao registrada';
  };

  const getLogSummary = (log) => {
    const summaryMap = {
      user_registered: 'Registro de conta realizado com sucesso.',
      user_logged_in: 'Autenticacao de usuario registrada.',
      user_created: 'Cadastro de usuario concluido pelo administrador.',
      user_updated: 'Informacoes cadastrais do usuario foram revisadas.',
      user_profile_updated: 'O proprio usuario atualizou dados da conta.',
      user_deleted: 'Conta de usuario removida do sistema.',
      protocol_created: 'Dados iniciais do protocolo foram gravados.',
      protocol_payment_updated: 'Situacao de pagamento de uma parcela foi alterada.',
      payment_rules_created: 'Configuracao inicial das regras de pagamento salva.',
      payment_rules_updated: 'Politica de pagamento atualizada no sistema.',
    };

    return summaryMap[log.action] || 'Atualizacao registrada no log de auditoria.';
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.logo}>AutoPlan</h1>
        <div style={styles.userSection}>
          <button onClick={() => navigate('/')} style={styles.backBtn}>← Voltar ao Dashboard</button>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.topSection}>
          <div>
            <h2 style={styles.pageTitle}>Log de Alterações</h2>
            <p style={styles.subtitle}>Histórico de ações feitas no sistema.</p>
          </div>
        </div>

        <div style={styles.filtersCard}>
          <div style={styles.filterGroup}>
            <label>Ação</label>
            <input
              type="text"
              value={filters.action}
              onChange={(e) => setFilters((current) => ({ ...current, action: e.target.value }))}
              placeholder="Ex: user_updated"
              style={styles.input}
            />
          </div>
          <div style={styles.filterGroup}>
            <label>Entidade</label>
            <input
              type="text"
              value={filters.entityType}
              onChange={(e) => setFilters((current) => ({ ...current, entityType: e.target.value }))}
              placeholder="Ex: user, protocol"
              style={styles.input}
            />
          </div>
          <div style={styles.filterGroup}>
            <label>Usuário</label>
            <input
              type="text"
              value={filters.actorEmail}
              onChange={(e) => setFilters((current) => ({ ...current, actorEmail: e.target.value }))}
              placeholder="Email do usuário"
              style={styles.input}
            />
          </div>
        </div>

        {error && <div style={styles.error}>{error}</div>}

        <div style={styles.tableWrap}>
          {loading ? (
            <div style={styles.emptyState}>Carregando logs...</div>
          ) : logs.length === 0 ? (
            <div style={styles.emptyState}>Nenhum log encontrado.</div>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Data</th>
                  <th style={styles.th}>Ação</th>
                  <th style={styles.th}>Entidade</th>
                  <th style={styles.th}>Usuário</th>
                  <th style={styles.th}>Resumo</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log._id}>
                    <td style={styles.td}>{new Date(log.createdAt).toLocaleString('pt-BR')}</td>
                    <td style={styles.td}><strong>{getActionSummary(log)}</strong></td>
                    <td style={styles.td}>{log.entityType}{log.entityId ? ` / ${log.entityId}` : ''}</td>
                    <td style={styles.td}>{log.actorEmail || 'system'}</td>
                    <td style={styles.tdDetails}>{getLogSummary(log)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>
    </div>
  );
};

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#0f0f10' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 40px',
    backgroundColor: '#171718',
    boxShadow: '0 2px 10px rgba(212,175,55,0.15)'
  },
  logo: { color: '#d4af37', margin: 0, fontSize: '24px' },
  userSection: { display: 'flex', alignItems: 'center', gap: '20px' },
  backBtn: {
    padding: '10px 16px',
    backgroundColor: '#232323',
    color: '#d4af37',
    border: '1px solid #8a6f2a',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px'
  },
  main: { padding: '40px', maxWidth: '1200px', margin: '0 auto' },
  topSection: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', gap: '20px' },
  pageTitle: { margin: 0, color: '#f5deb3' },
  subtitle: { margin: '6px 0 0 0', color: '#b8a36a' },
  dashboardLink: {
    padding: '10px 16px',
    borderRadius: '8px',
    backgroundColor: '#6d7c9c',
    color: '#fff',
    textDecoration: 'none',
    fontWeight: 'bold'
  },
  filtersCard: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    backgroundColor: '#181819',
    padding: '20px',
    borderRadius: '12px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.35)',
    border: '1px solid #5f4b1c',
    marginBottom: '20px'
  },
  filterGroup: { display: 'flex', flexDirection: 'column', gap: '8px', color: '#f5deb3' },
  input: {
    padding: '10px 12px',
    border: '1px solid #6f5a22',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: '#1f1f20',
    color: '#f5deb3'
  },
  error: {
    backgroundColor: '#2d1314',
    color: '#f39ca2',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '20px'
  },
  tableWrap: {
    backgroundColor: '#181819',
    borderRadius: '12px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.35)',
    border: '1px solid #5f4b1c',
    overflowX: 'auto'
  },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: '900px' },
  th: {
    textAlign: 'left',
    padding: '14px 16px',
    backgroundColor: '#1f1f20',
    color: '#d4af37',
    fontSize: '13px'
  },
  td: {
    padding: '14px 16px',
    borderTop: '1px solid #2a2a2a',
    verticalAlign: 'top',
    fontSize: '14px',
    color: '#f5deb3'
  },
  tdDetails: {
    padding: '14px 16px',
    borderTop: '1px solid #2a2a2a',
    verticalAlign: 'top',
    color: '#b8a36a',
    maxWidth: '420px'
  },
  emptyState: {
    padding: '30px',
    textAlign: 'center',
    color: '#b8a36a'
  }
};

export default AuditLogs;
