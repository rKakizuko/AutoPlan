import React from 'react';
import { useNavigate } from 'react-router-dom';

const UserProfile = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');

  const [profile, setProfile] = React.useState(null);
  const [protocols, setProtocols] = React.useState([]);
  const [filteredProtocols, setFilteredProtocols] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');

  const [form, setForm] = React.useState({
    email: '',
    cpf: '',
    password: '',
  });

  const [filters, setFilters] = React.useState({
    client: '',
    status: 'all',
  });

  const formatCpf = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const normalizeCpf = (value) => value.replace(/\D/g, '');

  React.useEffect(() => {
    const fetchData = async () => {
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const [profileResponse, protocolsResponse] = await Promise.all([
          fetch('http://localhost:5000/api/auth/me', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('http://localhost:5000/api/protocols', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const profileData = await profileResponse.json();
        const protocolsData = await protocolsResponse.json();

        if (!profileResponse.ok) {
          setError(profileData.message || 'Erro ao carregar perfil');
          return;
        }

        if (!protocolsResponse.ok) {
          setError(protocolsData.message || 'Erro ao carregar protocolos');
          return;
        }

        setProfile(profileData);
        setForm({
          email: profileData.email || '',
          cpf: formatCpf(profileData.cpf || ''),
          password: '',
        });

        const list = Array.isArray(protocolsData) ? protocolsData : [];
        setProtocols(list);
        setFilteredProtocols(list);

        localStorage.setItem('user', JSON.stringify(profileData));
      } catch (err) {
        setError('Erro ao conectar ao servidor');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [navigate, token]);

  React.useEffect(() => {
    let next = [...protocols];

    if (filters.client) {
      const term = filters.client.toLowerCase();
      next = next.filter((protocol) => protocol.cliente?.toLowerCase().includes(term));
    }

    if (filters.status !== 'all') {
      next = next.filter((protocol) => {
        const payments = Array.isArray(protocol.payments) ? protocol.payments : [];
        if (payments.length === 0) {
          return filters.status === 'pending';
        }

        const paidCount = payments.filter((payment) => payment.pago).length;
        if (filters.status === 'paid') return paidCount === payments.length;
        if (filters.status === 'partial') return paidCount > 0 && paidCount < payments.length;
        if (filters.status === 'pending') return paidCount === 0;
        return true;
      });
    }

    setFilteredProtocols(next);
  }, [filters, protocols]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!form.email) {
      setError('Email é obrigatório');
      return;
    }

    const normalizedCpf = normalizeCpf(form.cpf);
    if (normalizedCpf && normalizedCpf.length !== 11) {
      setError('CPF deve conter 11 dígitos');
      return;
    }

    if (form.password && form.password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    setSaving(true);

    try {
      const response = await fetch('http://localhost:5000/api/auth/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          email: form.email,
          cpf: normalizedCpf,
          password: form.password || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Erro ao atualizar perfil');
        return;
      }

      setProfile(data);
      setForm((current) => ({
        ...current,
        email: data.email || '',
        cpf: formatCpf(data.cpf || ''),
        password: '',
      }));
      localStorage.setItem('user', JSON.stringify(data));
      setSuccess('Perfil atualizado com sucesso');
    } catch (err) {
      setError('Erro ao conectar ao servidor');
    } finally {
      setSaving(false);
    }
  };

  const getPaymentStatus = (protocol) => {
    const payments = Array.isArray(protocol.payments) ? protocol.payments : [];
    if (payments.length === 0) return 'Pendente';

    const paidCount = payments.filter((payment) => payment.pago).length;
    if (paidCount === 0) return 'Pendente';
    if (paidCount === payments.length) return 'Pago';
    return 'Parcial';
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.logo}>AutoPlan</h1>
          <button onClick={() => navigate('/')} style={styles.backBtn}>← Voltar ao Dashboard</button>
        </header>
        <div style={styles.mainCard}>Carregando perfil...</div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.logo}>AutoPlan</h1>
        <button onClick={() => navigate('/')} style={styles.backBtn}>← Voltar ao Dashboard</button>
      </header>

      <main style={styles.main}>
        <section style={styles.topSection}>
          <div>
            <h2 style={styles.title}>Minha Conta</h2>
            <p style={styles.subtitle}>Atualize seus dados e acompanhe seus protocolos.</p>
          </div>
        </section>

        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        <section style={styles.mainCard}>
          <h3 style={styles.sectionTitle}>Meu Perfil</h3>
          <form onSubmit={handleSaveProfile} style={styles.formGrid}>
            <div style={styles.formGroup}>
              <label>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                style={styles.input}
                placeholder="seu@email.com"
              />
            </div>

            <div style={styles.formGroup}>
              <label>CPF</label>
              <input
                type="text"
                value={form.cpf}
                onChange={(e) => setForm((current) => ({ ...current, cpf: formatCpf(e.target.value) }))}
                style={styles.input}
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>

            <div style={styles.formGroup}>
              <label>Nova senha (opcional)</label>
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((current) => ({ ...current, password: e.target.value }))}
                style={styles.input}
                placeholder="••••••"
              />
            </div>

            <div style={styles.formGroup}>
              <label>Perfil</label>
              <input type="text" value={profile?.role === 'admin' ? 'Administrador' : 'Usuário'} disabled style={styles.inputDisabled} />
            </div>

            <div style={styles.formActions}>
              <button type="submit" style={styles.primaryBtn} disabled={saving}>
                {saving ? 'Salvando...' : 'Salvar alterações'}
              </button>
            </div>
          </form>
        </section>

        <section style={styles.mainCard}>
          <div style={styles.rowHeader}>
            <h3 style={styles.sectionTitle}>Meus Protocolos</h3>
          </div>

          <div style={styles.filters}>
            <input
              type="text"
              placeholder="Filtrar por cliente"
              value={filters.client}
              onChange={(e) => setFilters((current) => ({ ...current, client: e.target.value }))}
              style={styles.input}
            />
            <select
              value={filters.status}
              onChange={(e) => setFilters((current) => ({ ...current, status: e.target.value }))}
              style={styles.input}
            >
              <option value="all">Todos os status</option>
              <option value="paid">Pago</option>
              <option value="partial">Parcial</option>
              <option value="pending">Pendente</option>
            </select>
          </div>

          <div style={styles.tableWrap}>
            {filteredProtocols.length === 0 ? (
              <div style={styles.emptyState}>Nenhum protocolo encontrado para os filtros selecionados.</div>
            ) : (
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>Protocolo</th>
                    <th style={styles.th}>Cliente</th>
                    <th style={styles.th}>Total</th>
                    <th style={styles.th}>Status</th>
                    <th style={styles.th}>Data</th>
                    <th style={styles.th}>Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProtocols.map((protocol) => (
                    <tr key={protocol._id}>
                      <td style={styles.td}>{protocol.protocolId}</td>
                      <td style={styles.td}>{protocol.cliente}</td>
                      <td style={styles.td}>
                        R$ {Number(protocol.total || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                      </td>
                      <td style={styles.td}>{getPaymentStatus(protocol)}</td>
                      <td style={styles.td}>{new Date(protocol.createdAt).toLocaleDateString('pt-BR')}</td>
                      <td style={styles.td}>
                        <button
                          type="button"
                          style={styles.linkBtn}
                          onClick={() => navigate(`/protocolo/${protocol._id}`)}
                        >
                          Ver detalhes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
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
    boxShadow: '0 2px 10px rgba(212,175,55,0.15)',
  },
  logo: { color: '#d4af37', margin: 0, fontSize: '24px' },
  backBtn: {
    padding: '10px 16px',
    backgroundColor: '#232323',
    color: '#d4af37',
    border: '1px solid #8a6f2a',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
  },
  main: { padding: '32px 40px', maxWidth: '1100px', margin: '0 auto' },
  topSection: { marginBottom: '16px' },
  title: { margin: 0, color: '#f5deb3' },
  subtitle: { margin: '6px 0 0 0', color: '#b8a36a' },
  mainCard: {
    backgroundColor: '#181819',
    borderRadius: '14px',
    padding: '22px',
    boxShadow: '0 6px 20px rgba(0,0,0,0.35)',
    border: '1px solid #5f4b1c',
    marginBottom: '18px',
  },
  sectionTitle: { marginTop: 0, marginBottom: '16px', color: '#d4af37' },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '14px',
  },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '8px', color: '#f5deb3' },
  input: {
    padding: '11px 12px',
    border: '1px solid #6f5a22',
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: '#1f1f20',
    color: '#f5deb3',
  },
  inputDisabled: {
    padding: '11px 12px',
    border: '1px solid #5f4b1c',
    borderRadius: '8px',
    fontSize: '14px',
    color: '#b8a36a',
    backgroundColor: '#151515',
  },
  formActions: { display: 'flex', alignItems: 'end' },
  primaryBtn: {
    padding: '11px 18px',
    borderRadius: '8px',
    border: 'none',
    backgroundColor: '#d4af37',
    color: '#141414',
    fontWeight: 'bold',
    cursor: 'pointer',
  },
  filters: {
    display: 'grid',
    gridTemplateColumns: '2fr 1fr',
    gap: '12px',
    marginBottom: '14px',
  },
  rowHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', minWidth: '760px' },
  th: {
    textAlign: 'left',
    padding: '12px',
    backgroundColor: '#1f1f20',
    color: '#d4af37',
    fontSize: '13px',
  },
  td: {
    padding: '12px',
    borderTop: '1px solid #2a2a2a',
    color: '#f5deb3',
    fontSize: '14px',
  },
  linkBtn: {
    border: 'none',
    background: 'transparent',
    color: '#d4af37',
    cursor: 'pointer',
    padding: 0,
    fontWeight: 'bold',
  },
  error: {
    backgroundColor: '#2d1314',
    color: '#f39ca2',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '14px',
  },
  success: {
    backgroundColor: '#122515',
    color: '#8fcd99',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '14px',
  },
  emptyState: { padding: '20px', textAlign: 'center', color: '#b8a36a' },
};

export default UserProfile;
