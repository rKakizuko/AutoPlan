import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ensureLocalPreviewProtocol } from '../localPreviewProtocol';

const Dashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const isAdmin = user && user.role === 'admin';
  const [protocols, setProtocols] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [isMobile, setIsMobile] = React.useState(() => window.innerWidth < 980);

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
        const response = await fetch('http://localhost:5000/api/protocols', {
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
            {/* BOTÃO PARA O SIMULADOR */}
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

            {/* BOTÃO PARA GERENCIAR USUÁRIOS (APENAS PARA ADMIN) */}
            {isAdmin && (
              <Link to="/users" style={styles.mainCard}>
                <div style={styles.icon}>👥</div>
                <div style={styles.cardText}>
                  <h3>Gerenciar Usuários</h3>
                  <p>Criar, editar e excluir usuários</p>
                </div>
              </Link>
            )}

            {/* BOTÃO PARA CONFIGURAR REGRAS DE PAGAMENTO (APENAS PARA ADMIN) */}
            {isAdmin && (
              <Link to="/payment-rules" style={styles.mainCard}>
                <div style={styles.icon}>⚙️</div>
                <div style={styles.cardText}>
                  <h3>Configurar Taxas</h3>
                  <p>Editar regras de pagamento</p>
                </div>
              </Link>
            )}

            {/* BOTÃO PARA LOG DE ALTERAÇÕES (APENAS PARA ADMIN) */}
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
              <p style={{ color: '#b8a36a' }}>Carregando...</p>
            ) : protocols.length === 0 ? (
              <p style={{ color: '#b8a36a' }}>Nenhum protocolo criado ainda</p>
            ) : (
              <ul style={styles.list}>
                {protocols.map(p => (
                  <li 
                    key={p._id} 
                    style={styles.listItem}
                    onClick={() => navigate(`/protocolo/${p._id}`)}
                  >
                    <div style={{ cursor: 'pointer' }}>
                      <strong style={{ color: '#f5deb3' }}>{p.cliente}</strong>
                      <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#9f8a55' }}>
                        {p.protocolId}
                      </p>
                    </div>
                    <strong style={{ color: '#d4af37' }}>
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
  container: { minHeight: '100vh', backgroundColor: '#0f0f10' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 40px', backgroundColor: '#171718', boxShadow: '0 2px 10px rgba(212,175,55,0.15)' },
  logo: { color: '#d4af37', margin: 0, fontSize: '24px' },
  userSection: { display: 'flex', alignItems: 'center', gap: '20px' },
  userProfile: { color: '#f5deb3', display: 'flex', alignItems: 'center', gap: '10px' },
  adminBadge: { backgroundColor: '#d4af37', color: '#141414', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' },
  logoutBtn: { padding: '8px 16px', backgroundColor: '#232323', color: '#d4af37', border: '1px solid #8a6f2a', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
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
    textDecoration: 'none', backgroundColor: '#1f1f20', color: '#f5deb3', padding: '40px', 
    borderRadius: '15px', display: 'flex', alignItems: 'center', transition: 'transform 0.2s', minHeight: '120px', border: '1px solid #8a6f2a'
  },
  icon: { fontSize: '40px', marginRight: '20px', color: '#d4af37' },
  cardText: { color: '#f5deb3' },
  sideCard: (isMobile) => ({
    backgroundColor: '#181819',
    padding: '20px',
    borderRadius: '15px',
    boxShadow: '0 4px 15px rgba(0,0,0,0.35)',
    display: 'flex',
    flexDirection: 'column',
    minHeight: isMobile ? '280px' : '100%',
    maxHeight: isMobile ? 'none' : '560px',
    border: '1px solid #5f4b1c'
  }),
  sideTitle: { margin: 0, color: '#d4af37' },
  list: { listStyle: 'none', padding: 0, marginTop: '15px', overflowY: 'auto', flex: 1 },
  listItem: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #2a2a2a' },
  welcome: { marginBottom: '30px' },
  welcomeTitle: { margin: 0, color: '#f5deb3' },
  welcomeSubtitle: { margin: '6px 0 0 0', color: '#b8a36a' }
};

export default Dashboard;