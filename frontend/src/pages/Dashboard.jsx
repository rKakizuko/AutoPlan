import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ensureLocalPreviewProtocol } from '../localPreviewProtocol';

const COLUMN_HEIGHT = '420px';

const Dashboard = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const isAdmin = user && user.role === 'admin';
  const [protocols, setProtocols] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

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
          <h2>Painel de Projetos</h2>
          <p>Selecione uma ação para começar</p>
        </section>

        <div style={styles.grid}>
          <div style={styles.buttonsColumn}>
            {/* BOTÃO PARA O SIMULADOR */}
            <Link to="/simulador" style={styles.mainCard}>
              <div style={styles.icon}>➕</div>
              <div style={styles.cardText}>
                <h3>Nova Simulação</h3>
                <p>Criar orçamento e protocolo</p>
              </div>
            </Link>

            {/* BOTÃO PARA GERENCIAR USUÁRIOS (APENAS PARA ADMIN) */}
            {isAdmin && (
              <Link to="/users" style={{...styles.mainCard, backgroundColor: '#34a853'}}>
                <div style={styles.icon}>👥</div>
                <div style={styles.cardText}>
                  <h3>Gerenciar Usuários</h3>
                  <p>Criar, editar e excluir usuários</p>
                </div>
              </Link>
            )}

            {/* BOTÃO PARA CONFIGURAR REGRAS DE PAGAMENTO (APENAS PARA ADMIN) */}
            {isAdmin && (
              <Link to="/payment-rules" style={{...styles.mainCard, backgroundColor: '#ff9800'}}>
                <div style={styles.icon}>⚙️</div>
                <div style={styles.cardText}>
                  <h3>Configurar Taxas</h3>
                  <p>Editar regras de pagamento</p>
                </div>
              </Link>
            )}

            {/* BOTÃO PARA LOG DE ALTERAÇÕES (APENAS PARA ADMIN) */}
            {isAdmin && (
              <Link to="/audit-logs" style={{...styles.mainCard, backgroundColor: '#6c5ce7'}}>
                <div style={styles.icon}>📝</div>
                <div style={styles.cardText}>
                  <h3>Log de Alterações</h3>
                  <p>Visualizar ações registradas</p>
                </div>
              </Link>
            )}
          </div>

          <div style={styles.sideCard}>
            <h3>Protocolos Recentes</h3>
            {loading ? (
              <p style={{ color: '#999' }}>Carregando...</p>
            ) : protocols.length === 0 ? (
              <p style={{ color: '#999' }}>Nenhum protocolo criado ainda</p>
            ) : (
              <ul style={styles.list}>
                {protocols.map(p => (
                  <li 
                    key={p._id} 
                    style={styles.listItem}
                    onClick={() => navigate(`/protocolo/${p._id}`)}
                  >
                    <div style={{ cursor: 'pointer' }}>
                      <strong>{p.cliente}</strong>
                      <p style={{ margin: '5px 0 0 0', fontSize: '12px', color: '#666' }}>
                        {p.protocolId}
                      </p>
                    </div>
                    <strong style={{ color: '#1a73e8' }}>
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
  container: { minHeight: '100vh', backgroundColor: '#f8f9fa' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 40px', backgroundColor: '#fff', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' },
  logo: { color: '#1a73e8', margin: 0, fontSize: '24px' },
  userSection: { display: 'flex', alignItems: 'center', gap: '20px' },
  userProfile: { color: '#666', display: 'flex', alignItems: 'center', gap: '10px' },
  adminBadge: { backgroundColor: '#ff9800', color: '#fff', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' },
  logoutBtn: { padding: '8px 16px', backgroundColor: '#f44336', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' },
  main: { padding: '40px', maxWidth: '1000px', margin: '0 auto' },
  grid: { display: 'flex', gap: '20px', alignItems: 'stretch' },
  buttonsColumn: { display: 'flex', flexDirection: 'column', gap: '20px', flex: 1, height: COLUMN_HEIGHT },
  mainCard: { 
    textDecoration: 'none', backgroundColor: '#1a73e8', color: '#fff', padding: '40px', 
    borderRadius: '15px', display: 'flex', alignItems: 'center', transition: 'transform 0.2s'
  },
  icon: { fontSize: '40px', marginRight: '20px' },
  cardText: { color: '#fff' },
  sideCard: { backgroundColor: '#fff', padding: '20px', borderRadius: '15px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, height: COLUMN_HEIGHT },
  list: { listStyle: 'none', padding: 0, marginTop: '15px', overflowY: 'auto', flex: 1 },
  listItem: { display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid #eee' },
  welcome: { marginBottom: '30px' }
};

export default Dashboard;