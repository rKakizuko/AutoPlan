import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ensureLocalPreviewProtocol } from '../localPreviewProtocol';
import { apiUrl } from '../utils/api';

const Dashboard = () => {
  const navigate = useNavigate();
  // Dados do usuário autenticado
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const isAdmin = user && user.role === 'admin';
  // Lista de protocolos para exibir
  const [protocols, setProtocols] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [isMobile, setIsMobile] = React.useState(() => window.innerWidth < 980);
  const [theme, setTheme] = React.useState(() => localStorage.getItem('theme') || 'dark');

  React.useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  React.useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 980);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  React.useEffect(() => {
    const fetchProtocols = async () => {
      const localPreviewProtocol = ensureLocalPreviewProtocol();
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const response = await fetch(apiUrl('/api/protocols'), {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (response.ok) {
          const remoteProtocols = Array.isArray(data) ? data : [];
          const mergedProtocols = [
            localPreviewProtocol,
            ...remoteProtocols.filter((protocol) => protocol?._id !== localPreviewProtocol._id)
          ];
          setProtocols(mergedProtocols);
        } else {
          setProtocols([localPreviewProtocol]);
        }
      } catch (err) {
        console.error('Erro ao carregar protocolos:', err);
        setProtocols([localPreviewProtocol]);
      } finally {
        setLoading(false);
      }
    };

    fetchProtocols();
  }, [navigate]);

  // Fazer logout
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login');
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.logo}>AutoPlan</h1>
        <div style={styles.userSection}>
          <button onClick={() => setTheme((current) => (current === 'dark' ? 'light' : 'dark'))} style={styles.themeBtn}>
            {theme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          </button>
          <span style={styles.userProfile}>
            Olá, {user?.email || 'Usuário'}
            {isAdmin && <span style={styles.adminBadge}>ADMIN</span>}
          </span>
          <button onClick={handleLogout} style={styles.logoutBtn}>Sair</button>
        </div>
      </header>

      <main style={styles.main}>
        <section style={styles.welcome}>
          <h2 style={styles.welcomeTitle}>Painel de Projetos</h2>
          <p style={styles.welcomeSubtitle}>Selecione uma ação para começar</p>
        </section>

        <div style={styles.grid(isMobile)}>
          <div style={styles.actionsGrid(isMobile)}>
            <Link to="/simulador" style={styles.mainCard}>
              <div style={styles.icon}>➕</div>
              <div style={styles.cardText}>
                <h3>Nova Simulação</h3>
                <p>Criar orçamento e protocolo</p>
              </div>
            </Link>

            <Link to="/minha-conta" style={styles.mainCard}>
              <div style={styles.icon}>🪪</div>
              <div style={styles.cardText}>
                <h3>Minha Conta</h3>
                <p>Editar perfil e acompanhar protocolos</p>
              </div>
            </Link>

            {isAdmin && (
              <Link to="/users" style={styles.mainCard}>
                <div style={styles.icon}>👥</div>
                <div style={styles.cardText}>
                  <h3>Gerenciar Usuários</h3>
                  <p>Criar, editar e excluir usuários</p>
                </div>
              </Link>
            )}

            {isAdmin && (
              <Link to="/payment-rules" style={styles.mainCard}>
                <div style={styles.icon}>⚙️</div>
                <div style={styles.cardText}>
                  <h3>Configurar Taxas</h3>
                  <p>Editar regras de pagamento</p>
                </div>
              </Link>
            )}

            {isAdmin && (
              <Link to="/audit-logs" style={styles.mainCard}>
                <div style={styles.icon}>📝</div>
                <div style={styles.cardText}>
                  <h3>Log de Alterações</h3>
                  <p>Visualizar ações registradas</p>
                </div>
              </Link>
            )}
          </div>

          <div style={styles.sideCard(isMobile)}>
            <h3 style={styles.sideTitle}>Protocolos Recentes</h3>
            {loading ? (
              <p style={styles.protocolHint}>Carregando...</p>
            ) : protocols.length === 0 ? (
              <p style={styles.protocolHint}>Nenhum protocolo criado ainda</p>
            ) : (
              <ul style={styles.list}>
                {protocols.map(p => (
                  <li 
                    key={p._id} 
                    style={styles.listItem}
                    onClick={() => navigate(`/protocolo/${p._id}`)}
                  >
                    <div style={{ cursor: 'pointer' }}>
                      <strong style={styles.protocolClient}>{p.cliente}</strong>
                      <p style={styles.protocolId}>
                        {p.protocolId}
                      </p>
                    </div>
                    <strong style={styles.protocolValue}>
                      R$ {p.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </strong>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

const styles = {
  container: { minHeight: '100vh', backgroundColor: 'var(--app-bg)', color: 'var(--app-text)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 40px', backgroundColor: 'var(--app-surface)', boxShadow: '0 2px 10px rgba(212,175,55,0.15)' },
  logo: { color: 'var(--app-accent)', margin: 0, fontSize: '24px' },
  userSection: { display: 'flex', alignItems: 'center', gap: '20px' },
  userProfile: { color: 'var(--app-text)', display: 'flex', alignItems: 'center', gap: '10px' },
  adminBadge: { backgroundColor: 'var(--app-accent)', color: '#141414', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' },
  themeBtn: { padding: '8px 14px', backgroundColor: 'var(--app-button-dark)', color: 'var(--app-accent)', border: '1px solid var(--app-border)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  logoutBtn: { padding: '8px 16px', backgroundColor: 'var(--app-button-dark)', color: 'var(--app-accent)', border: '1px solid var(--app-border)', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  main: { padding: '40px', maxWidth: '1000px', margin: '0 auto' },
  grid: (isMobile) => ({
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : '1.6fr 1fr',
    gap: '20px',
    alignItems: 'stretch'
  }),
  actionsGrid: (isMobile) => ({
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
    gap: '16px',
    alignContent: 'start'
  }),
  mainCard: { 
    textDecoration: 'none', backgroundColor: 'var(--app-surface-2)', color: 'var(--app-text)', padding: '40px', 
    borderRadius: '15px', display: 'flex', alignItems: 'center', transition: 'transform 0.2s', minHeight: '120px', border: '1px solid var(--app-border)'
  },
  icon: { fontSize: '40px', marginRight: '20px', color: 'var(--app-accent)' },
  cardText: { color: 'var(--app-text)' },
  sideCard: (isMobile) => ({
    backgroundColor: 'var(--app-surface)',
    padding: '20px',
    borderRadius: '15px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.35)',
    display: 'flex',
    flexDirection: 'column',
    minHeight: isMobile ? '280px' : '100%',
    maxHeight: isMobile ? 'none' : '560px',
    border: '1px solid var(--app-border)'
  }),
  sideTitle: { margin: 0, color: 'var(--app-accent)' },
  protocolHint: { color: 'var(--app-muted)' },
  protocolClient: { color: 'var(--app-text)' },
  protocolId: { margin: '5px 0 0 0', fontSize: '12px', color: 'var(--app-muted)' },
  protocolValue: { color: 'var(--app-accent)' },
  list: { listStyle: 'none', padding: 0, marginTop: '15px', overflowY: 'auto', flex: 1 },
  listItem: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--app-border)' },
  welcome: { marginBottom: '30px' },
  welcomeTitle: { margin: 0, color: 'var(--app-text)' },
  welcomeSubtitle: { margin: '6px 0 0 0', color: 'var(--app-muted)' }
};

export default Dashboard;