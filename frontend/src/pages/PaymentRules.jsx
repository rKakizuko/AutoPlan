import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const PaymentRules = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const token = localStorage.getItem('token');

  if (!user || user.role !== 'admin') {
    navigate('/');
    return null;
  }

  const [rules, setRules] = useState({
    pix: { nome: 'PIX (10% OFF)', taxa: -0.10 },
    boleto: { nome: 'Boleto (5% Taxa)', taxa: 0.05, parcelas: true },
    cartao: { taxaOperadora: 0.04, jurosMensal: 0.0249, parcelas: true }
  });

  const [editingRule, setEditingRule] = useState(null);
  const [formData, setFormData] = useState({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fetchRules = async () => {
      if (!token) return;
      try {
        const response = await fetch('http://localhost:5000/api/paymentRules', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const data = await response.json();
          setRules({
            pix: data.pix,
            boleto: data.boleto,
            cartao: data.cartao
          });
        }
      } catch (err) {
        // erro ao buscar regras
      }
    };
    fetchRules();
  }, [token]);

  const handleEditRule = (ruleKey) => {
    setEditingRule(ruleKey);
    setFormData({ ...rules[ruleKey] });
  };

  const handleSaveRule = async () => {
    if (!editingRule) return;

    const updatedRules = {
      ...rules,
      [editingRule]: formData
    };

    setRules(updatedRules);

    try {
      const response = await fetch('http://localhost:5000/api/paymentRules', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updatedRules)
      });
      if (response.ok) {
        setMessage(`Regra ${editingRule} atualizada com sucesso!`);
      } else {
        setMessage('Erro ao salvar regra.');
      }
    } catch (err) {
      setMessage('Erro ao conectar ao servidor.');
    }
    setEditingRule(null);
    setTimeout(() => setMessage(''), 3000);
  };

  const handleCancel = () => {
    setEditingRule(null);
    setFormData({});
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.logo}>AutoPlan</h1>
        <div style={styles.userSection}>
          <span style={styles.userProfile}>
            Administrador
            <span style={styles.adminBadge}>ADMIN</span>
          </span>
          <button onClick={() => navigate('/')} style={styles.backBtn}>← Voltar ao Dashboard</button>
        </div>
      </header>

      <main style={styles.main}>
        <div style={styles.titleSection}>
          <h2>Configurar Regras de Pagamento</h2>
        </div>

        {message && <div style={styles.successMessage}>{message}</div>}

        <div style={styles.rulesGrid}>
          {/* PIX */}
          <div style={styles.ruleCard}>
            <h3>💳 PIX</h3>
            {editingRule === 'pix' ? (
              <div style={styles.formGroup}>
                <label>Nome</label>
                <input
                  type="text"
                  value={formData.nome || ''}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  style={styles.input}
                />
                <label>Taxa (desconto negativo)</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.taxa || ''}
                  onChange={(e) => setFormData({ ...formData, taxa: parseFloat(e.target.value) })}
                  style={styles.input}
                />
                <div style={styles.buttonGroup}>
                  <button onClick={handleSaveRule} style={styles.saveBtn}>Salvar</button>
                  <button onClick={handleCancel} style={styles.cancelBtn}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div style={styles.ruleContent}>
                <p><strong>{rules.pix.nome}</strong></p>
                <p>Taxa: <span style={styles.taxaValue}>{(rules.pix.taxa * 100).toFixed(2)}%</span></p>
                <button onClick={() => handleEditRule('pix')} style={styles.editBtn}>Editar</button>
              </div>
            )}
          </div>

          {/* BOLETO */}
          <div style={styles.ruleCard}>
            <h3>📄 BOLETO</h3>
            {editingRule === 'boleto' ? (
              <div style={styles.formGroup}>
                <label>Nome</label>
                <input
                  type="text"
                  value={formData.nome || ''}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  style={styles.input}
                />
                <label>Taxa</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.taxa || ''}
                  onChange={(e) => setFormData({ ...formData, taxa: parseFloat(e.target.value) })}
                  style={styles.input}
                />
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.parcelas || false}
                    onChange={(e) => setFormData({ ...formData, parcelas: e.target.checked })}
                  />
                  Permitir parcelamento?
                </label>
                <div style={styles.buttonGroup}>
                  <button onClick={handleSaveRule} style={styles.saveBtn}>Salvar</button>
                  <button onClick={handleCancel} style={styles.cancelBtn}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div style={styles.ruleContent}>
                <p><strong>{rules.boleto.nome}</strong></p>
                <p>Taxa: <span style={styles.taxaValue}>{(rules.boleto.taxa * 100).toFixed(2)}%</span></p>
                <p>Parcelamento: <span style={styles.taxaValue}>{rules.boleto.parcelas ? 'Ativado' : 'Desativado'}</span></p>
                <button onClick={() => handleEditRule('boleto')} style={styles.editBtn}>Editar</button>
              </div>
            )}
          </div>

          {/* CARTÃO */}
          <div style={styles.ruleCard}>
            <h3>🛒 CARTÃO DE CRÉDITO</h3>
            {editingRule === 'cartao' ? (
              <div style={styles.formGroup}>
                <label>Taxa da Operadora</label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.taxaOperadora || ''}
                  onChange={(e) => setFormData({ ...formData, taxaOperadora: parseFloat(e.target.value) })}
                  style={styles.input}
                />
                <label>Juros Mensal (por parcela)</label>
                <input
                  type="number"
                  step="0.001"
                  value={formData.jurosMensal || ''}
                  onChange={(e) => setFormData({ ...formData, jurosMensal: parseFloat(e.target.value) })}
                  style={styles.input}
                />
                <label style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={formData.parcelas || false}
                    onChange={(e) => setFormData({ ...formData, parcelas: e.target.checked })}
                  />
                  Permitir parcelamento?
                </label>
                <div style={styles.buttonGroup}>
                  <button onClick={handleSaveRule} style={styles.saveBtn}>Salvar</button>
                  <button onClick={handleCancel} style={styles.cancelBtn}>Cancelar</button>
                </div>
              </div>
            ) : (
              <div style={styles.ruleContent}>
                <p>Taxa Operadora: <span style={styles.taxaValue}>{(rules.cartao.taxaOperadora * 100).toFixed(2)}%</span></p>
                <p>Juros Mensal: <span style={styles.taxaValue}>{(rules.cartao.jurosMensal * 100).toFixed(2)}%</span></p>
                <p>Parcelamento: <span style={styles.taxaValue}>{rules.cartao.parcelas ? 'Ativado' : 'Desativado'}</span></p>
                <p style={styles.cardObs}>Obs.: não há juros até 3 parcelas.</p>
                <button onClick={() => handleEditRule('cartao')} style={styles.editBtn}>Editar</button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

const styles = {
  container: { minHeight: '100vh', backgroundColor: '#f8f9fa' },
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
  userProfile: { color: '#666', display: 'flex', alignItems: 'center', gap: '10px' },
  adminBadge: { backgroundColor: '#ff9800', color: '#fff', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' },
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
  main: { padding: '40px', maxWidth: '1200px', margin: '0 auto' },
  titleSection: { marginBottom: '24px' },
  successMessage: { 
    backgroundColor: '#e8f5e9', 
    color: '#2e7d32', 
    padding: '15px', 
    borderRadius: '8px', 
    marginBottom: '20px',
    fontWeight: 'bold'
  },
  rulesGrid: { 
    display: 'grid', 
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
    gap: '20px',
    marginBottom: '40px'
  },
  ruleCard: { 
    backgroundColor: '#fff', 
    padding: '25px', 
    borderRadius: '12px', 
    boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
    border: '2px solid #e0e0e0',
    display: 'flex',
    flexDirection: 'column',
    minHeight: '320px',
  },
  ruleContent: {
    display: 'flex',
    flexDirection: 'column',
    flex: 1,
    gap: '8px',
  },
  formGroup: { display: 'flex', flexDirection: 'column', gap: '15px' },
  input: { 
    padding: '10px', 
    borderRadius: '8px', 
    border: '1px solid #ddd', 
    fontSize: '14px'
  },
  buttonGroup: { display: 'flex', gap: '10px' },
  saveBtn: { 
    flex: 1,
    padding: '10px', 
    backgroundColor: '#4caf50', 
    color: '#fff', 
    border: 'none', 
    borderRadius: '8px', 
    cursor: 'pointer', 
    fontWeight: 'bold'
  },
  cancelBtn: { 
    flex: 1,
    padding: '10px', 
    backgroundColor: '#f44336', 
    color: '#fff', 
    border: 'none', 
    borderRadius: '8px', 
    cursor: 'pointer', 
    fontWeight: 'bold'
  },
  editBtn: { 
    width: '100%',
    marginTop: 'auto',
    padding: '10px', 
    backgroundColor: '#1a73e8', 
    color: '#fff', 
    border: 'none', 
    borderRadius: '8px', 
    cursor: 'pointer', 
    fontWeight: 'bold'
  },
  checkboxLabel: {
    display: 'flex', 
    alignItems: 'center', 
    gap: '8px',
    cursor: 'pointer',
    fontSize: '14px'
  },
  cardObs: {
    margin: '0',
    color: '#475569',
    fontSize: '13px',
  },
  taxaValue: { color: '#1a73e8', fontWeight: 'bold', fontSize: '16px' }
};

export default PaymentRules;
