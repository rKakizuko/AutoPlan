import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const Register = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('token');
  const currentUser = JSON.parse(localStorage.getItem('user') || 'null');
  const isAdmin = currentUser?.role === 'admin';

  const [users, setUsers] = useState([]);
  const [fetchingUsers, setFetchingUsers] = useState(true);

  const [editingUserId, setEditingUserId] = useState(null);
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const loadUsers = React.useCallback(async () => {
    if (!token || !isAdmin) {
      setFetchingUsers(false);
      return;
    }

    try {
      const response = await fetch('http://localhost:5000/api/auth/users', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.message || 'Erro ao carregar usuários');
        return;
      }

      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError('Erro ao conectar ao servidor');
      console.error(err);
    } finally {
      setFetchingUsers(false);
    }
  }, [token, isAdmin]);

  React.useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const resetForm = () => {
    setEditingUserId(null);
    setEmail('');
    setCpf('');
    setPassword('');
    setRole('user');
  };

  const formatCpf = (value) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
    if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  };

  const normalizeCpf = (value) => value.replace(/\D/g, '');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!email || (!editingUserId && !password)) {
      setError('Preencha os campos obrigatórios');
      return;
    }

    const normalizedCpf = normalizeCpf(cpf);
    if (normalizedCpf && normalizedCpf.length !== 11) {
      setError('CPF deve conter 11 dígitos');
      return;
    }

    if (password && password.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres');
      return;
    }

    if (!['admin', 'user'].includes(role)) {
      setError('Selecione um perfil valido');
      return;
    }

    const url = editingUserId
      ? `http://localhost:5000/api/auth/users/${editingUserId}`
      : 'http://localhost:5000/api/auth/users';
    const method = editingUserId ? 'PUT' : 'POST';

    const payload = { email, role, cpf: normalizedCpf };
    if (password) {
      payload.password = password;
    }

    setLoading(true);
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Erro ao salvar usuário');
        return;
      }

      setSuccess(editingUserId ? 'Usuário atualizado com sucesso' : 'Usuário criado com sucesso');
      resetForm();
      await loadUsers();
    } catch (err) {
      setError('Erro ao conectar ao servidor');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (user) => {
    setError('');
    setSuccess('');
    setEditingUserId(user._id || user.id);
    setEmail(user.email || '');
    setCpf(formatCpf(user.cpf || ''));
    setRole(user.role || 'user');
    setPassword('');
  };

  const handleDelete = async (user) => {
    const userId = user._id || user.id;
    const confirmed = window.confirm(`Deseja realmente excluir o usuário ${user.email}?`);
    if (!confirmed) {
      return;
    }

    setError('');
    setSuccess('');
    try {
      const response = await fetch(`http://localhost:5000/api/auth/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      if (!response.ok) {
        setError(data.message || 'Erro ao excluir usuário');
        return;
      }

      setSuccess('Usuário excluído com sucesso');
      if (editingUserId === userId) {
        resetForm();
      }
      await loadUsers();
    } catch (err) {
      setError('Erro ao conectar ao servidor');
      console.error(err);
    }
  };

  if (!isAdmin) {
    return (
      <div style={styles.container}>
        <header style={styles.header}>
          <h1 style={styles.logo}>AutoPlan</h1>
          <div style={styles.userSection}>
            <button onClick={() => navigate('/')} style={styles.backBtn}>
              ← Voltar ao Dashboard
            </button>
          </div>
        </header>
        <div style={styles.card}>
          <h2 style={styles.subtitle}>Acesso negado</h2>
          <p>Apenas administradores podem gerenciar usuários.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.logo}>AutoPlan</h1>
        <div style={styles.userSection}>
          <button onClick={() => navigate('/')} style={styles.backBtn}>
            ← Voltar ao Dashboard
          </button>
        </div>
      </header>
      <div style={styles.wideCard}>
        <h1 style={styles.title}>AutoPlan</h1>
        <h2 style={styles.subtitle}>Gerenciar Usuários</h2>
        <p style={styles.adminOnly}>CRUD de usuários: criar, visualizar, editar e excluir</p>

        {error && <div style={styles.error}>{error}</div>}
        {success && <div style={styles.success}>{success}</div>}

        <div style={styles.layout}>
          <form onSubmit={handleSubmit} style={styles.form}>
            <h3>{editingUserId ? 'Editar usuário' : 'Criar usuário'}</h3>

            <div style={styles.formGroup}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                style={styles.input}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@email.com"
              />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="cpf">CPF</label>
              <input
                id="cpf"
                type="text"
                style={styles.input}
                value={cpf}
                onChange={(e) => setCpf(formatCpf(e.target.value))}
                placeholder="000.000.000-00"
                maxLength={14}
              />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="password">
                Senha {editingUserId ? '(opcional para manter a atual)' : ''}
              </label>
              <input
                id="password"
                type="password"
                style={styles.input}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
              />
            </div>

            <div style={styles.formGroup}>
              <label htmlFor="role">Perfil</label>
              <select
                id="role"
                style={styles.input}
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="user">Usuário</option>
                <option value="admin">Administrador</option>
              </select>
            </div>

            <div style={styles.formActions}>
              <button type="submit" style={styles.registerBtn} disabled={loading}>
                {loading ? 'Salvando...' : editingUserId ? 'Atualizar' : 'Criar'}
              </button>
              {editingUserId && (
                <button type="button" style={styles.cancelBtn} onClick={resetForm}>
                  Cancelar
                </button>
              )}
            </div>
          </form>

          <div style={styles.listPanel}>
            <h3>Usuários cadastrados</h3>
            {fetchingUsers ? (
              <p style={{ color: '#666' }}>Carregando usuários...</p>
            ) : users.length === 0 ? (
              <p style={{ color: '#666' }}>Nenhum usuário encontrado.</p>
            ) : (
              <div style={styles.tableWrap}>
                <table style={styles.table}>
                  <thead>
                    <tr>
                      <th style={styles.th}>Email</th>
                      <th style={styles.th}>CPF</th>
                      <th style={styles.th}>Perfil</th>
                      <th style={styles.th}>Criado em</th>
                      <th style={styles.th}>Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user) => {
                      const userId = user._id || user.id;
                      return (
                        <tr key={userId}>
                          <td style={styles.td}>{user.email}</td>
                          <td style={styles.td}>{formatCpf(user.cpf || '') || '-'}</td>
                          <td style={styles.td}>{user.role}</td>
                          <td style={styles.td}>
                            {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                          </td>
                          <td style={styles.tdActions}>
                            <button type="button" style={styles.editBtn} onClick={() => handleEdit(user)}>
                              Editar
                            </button>
                            <button
                              type="button"
                              style={styles.deleteBtn}
                              onClick={() => handleDelete(user)}
                            >
                              Excluir
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f0f2f5' },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 40px',
    backgroundColor: '#fff',
    boxShadow: '0 2px 10px rgba(0,0,0,0.05)'
  },
  logo: { color: '#1a73e8', margin: 0, fontSize: '24px' },
  userSection: { display: 'flex', alignItems: 'center', gap: '20px' },
  card: { 
    backgroundColor: '#fff', 
    padding: '40px', 
    borderRadius: '15px', 
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)', 
    width: '100%', 
    maxWidth: '400px',
    textAlign: 'center',
    margin: '40px auto',
  },
  wideCard: {
    backgroundColor: '#fff',
    padding: '30px',
    borderRadius: '15px',
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    width: '100%',
    maxWidth: '980px',
    margin: '40px auto',
  },
  title: { 
    color: '#1a73e8', 
    margin: '0 0 10px 0', 
    fontSize: '32px' 
  },
  subtitle: { 
    color: '#666', 
    margin: '0 0 30px 0',
    fontSize: '24px'
  },
  form: { 
    display: 'flex', 
    flexDirection: 'column',
    backgroundColor: '#f8fafc',
    padding: '20px',
    borderRadius: '12px',
    border: '1px solid #e5e7eb',
  },
  layout: {
    display: 'grid',
    gridTemplateColumns: '320px 1fr',
    gap: '20px',
    alignItems: 'start',
  },
  formGroup: { 
    marginBottom: '20px', 
    display: 'flex', 
    flexDirection: 'column',
    textAlign: 'left'
  },
  input: { 
    padding: '12px', 
    borderRadius: '8px', 
    border: '1px solid #ddd', 
    fontSize: '16px',
    marginTop: '8px',
    backgroundColor: '#fff',
  },
  registerBtn: { 
    padding: '12px', 
    backgroundColor: '#1a73e8', 
    color: '#fff', 
    border: 'none', 
    borderRadius: '8px', 
    cursor: 'pointer', 
    fontWeight: 'bold',
    fontSize: '16px',
    transition: 'background-color 0.3s',
  },
  cancelBtn: {
    padding: '12px',
    backgroundColor: '#9ca3af',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '16px',
  },
  formActions: {
    display: 'flex',
    gap: '10px',
  },
  error: { 
    backgroundColor: '#ffebee', 
    color: '#c62828', 
    padding: '12px', 
    borderRadius: '8px', 
    marginBottom: '20px',
    fontSize: '14px',
  },
  success: {
    backgroundColor: '#e8f5e9',
    color: '#2e7d32',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
  },
  backBtn: {
    padding: '10px 16px',
    backgroundColor: '#1a73e8',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
  },
  adminOnly: {
    color: '#ff9800',
    backgroundColor: '#fff3e0',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
  },
  listPanel: {
    backgroundColor: '#fff',
    padding: '10px 0',
  },
  tableWrap: {
    overflowX: 'auto',
    border: '1px solid #e5e7eb',
    borderRadius: '12px',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    minWidth: '560px',
  },
  th: {
    textAlign: 'left',
    backgroundColor: '#f3f4f6',
    padding: '12px',
    fontSize: '13px',
    color: '#374151',
  },
  td: {
    padding: '12px',
    borderTop: '1px solid #f3f4f6',
    color: '#1f2937',
    fontSize: '14px',
  },
  tdActions: {
    padding: '12px',
    borderTop: '1px solid #f3f4f6',
    display: 'flex',
    gap: '8px',
  },
  editBtn: {
    padding: '8px 12px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#1a73e8',
    color: '#fff',
    cursor: 'pointer',
  },
  deleteBtn: {
    padding: '8px 12px',
    border: 'none',
    borderRadius: '8px',
    backgroundColor: '#f44336',
    color: '#fff',
    cursor: 'pointer',
  },
};

export default Register;
