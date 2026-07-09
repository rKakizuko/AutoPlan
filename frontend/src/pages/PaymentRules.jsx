import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../utils/api';

const decimalToPercentInt = (value) => Math.round((Number(value) || 0) * 100);
const percentIntToDecimal = (value, fallback = 0) => {
  if (value === '' || value === null || value === undefined) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) {
    return fallback;
  }
  return parsed / 100;
};

const PaymentRules = () => {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const token = localStorage.getItem('token');


  if (!user || user.role !== 'admin') {
    navigate('/');
    return null;
  }

  const [rules, setRules] = useState({
    pix: { nome: 'PIX', taxa: -0.10 },
    boleto: { nome: 'Boleto', taxa: 0.05, parcelas: true },
    cartao: { taxaOperadora: 0.04, jurosMensal: 0.0249, parcelas: true }
  });

  const [editingRule, setEditingRule] = useState(null);
  const [formData, setFormData] = useState({});
  const [message, setMessage] = useState('');


  useEffect(() => {
    const fetchRules = async () => {
      if (!token) return;
      try {
        const response = await fetch(apiUrl('/api/paymentRules'), {
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
        setMessage('Erro ao conectar ao servidor.');
      }
    };
    fetchRules();
  }, [token]);


  const handleEditRule = (ruleKey) => {
    setEditingRule(ruleKey);

    if (ruleKey === 'pix') {
      setFormData({
        ...rules[ruleKey],
        taxaPercent: decimalToPercentInt(rules[ruleKey].taxa),
      });
      return;
    }

    if (ruleKey === 'boleto') {
      setFormData({
        ...rules[ruleKey],
        taxaPercent: decimalToPercentInt(rules[ruleKey].taxa),
      });
      return;
    }

    if (ruleKey === 'cartao') {
      setFormData({
        ...rules[ruleKey],
        taxaOperadoraPercent: decimalToPercentInt(rules[ruleKey].taxaOperadora),
        jurosMensalPercent: decimalToPercentInt(rules[ruleKey].jurosMensal),
      });
    }
  };


  const handleSaveRule = async () => {
    if (!editingRule) return;

    let normalizedRule = {};

    if (editingRule === 'pix') {
      normalizedRule = {
        nome: formData.nome || rules.pix.nome,
        taxa: percentIntToDecimal(formData.taxaPercent, rules.pix.taxa),
      };
    }

    if (editingRule === 'boleto') {
      normalizedRule = {
        nome: formData.nome || rules.boleto.nome,
        taxa: percentIntToDecimal(formData.taxaPercent, rules.boleto.taxa),
        parcelas: Boolean(formData.parcelas),
      };
    }

    if (editingRule === 'cartao') {
      normalizedRule = {
        taxaOperadora: percentIntToDecimal(formData.taxaOperadoraPercent, rules.cartao.taxaOperadora),
        jurosMensal: percentIntToDecimal(formData.jurosMensalPercent, rules.cartao.jurosMensal),
        parcelas: Boolean(formData.parcelas),
      };
    }

    const updatedRules = {
      ...rules,
      [editingRule]: normalizedRule
    };

    setRules(updatedRules);

    try {
      const response = await fetch(apiUrl('/api/paymentRules'), {
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
                <label>Taxa (%)</label>
                <input
                  type="number"
                  step="1"
                  value={formData.taxaPercent ?? ''}
                  onChange={(e) => setFormData({ ...formData, taxaPercent: e.target.value })}
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
                <label>Taxa (%)</label>
                <input
                  type="number"
                  step="1"
                  value={formData.taxaPercent ?? ''}
                  onChange={(e) => setFormData({ ...formData, taxaPercent: e.target.value })}
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

          <div style={styles.ruleCard}>
            <h3>🛒 CARTÃO DE CRÉDITO</h3>
            {editingRule === 'cartao' ? (
              <div style={styles.formGroup}>
                <label>Taxa da Operadora (%)</label>
                <input
                  type="number"
                  step="1"
                  value={formData.taxaOperadoraPercent ?? ''}
                  onChange={(e) => setFormData({ ...formData, taxaOperadoraPercent: e.target.value })}
                  style={styles.input}
                />
                <label>Juros Mensal (%)</label>
                <input
                  type="number"
                  step="1"
                  value={formData.jurosMensalPercent ?? ''}
                  onChange={(e) => setFormData({ ...formData, jurosMensalPercent: e.target.value })}
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
  container: { minHeight: '100vh', backgroundColor: 'var(--app-bg)', color: 'var(--app-text)' },
  header: { 
    display: 'flex', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    padding: '20px 40px', 
    backgroundColor: 'var(--app-surface)', 
    boxShadow: '0 2px 10px rgba(212,175,55,0.15)' 
  },
  logo: { color: 'var(--app-accent)', margin: 0, fontSize: '24px' },
  userSection: { display: 'flex', alignItems: 'center', gap: '20px' },
  userProfile: { color: 'var(--app-text)', display: 'flex', alignItems: 'center', gap: '10px' },
  adminBadge: { backgroundColor: 'var(--app-accent)', color: '#141414', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' },
  backBtn: {
    padding: '10px 16px',
    backgroundColor: 'var(--app-button-dark)',
    color: 'var(--app-accent)',
    border: '1px solid var(--app-border)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px',
  },
  main: { padding: '40px', maxWidth: '1200px', margin: '0 auto' },
  titleSection: { marginBottom: '24px', color: 'var(--app-text)' },
  successMessage: { 
    backgroundColor: 'var(--app-success-bg)', 
    color: 'var(--app-success-text)', 
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
    backgroundColor: 'var(--app-surface)', 
    color: 'var(--app-text)',
    padding: '25px', 
    borderRadius: '12px', 
    boxShadow: '0 4px 15px rgba(0,0,0,0.35)',
    border: '1px solid var(--app-border)',
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
    border: '1px solid var(--app-border)', 
    fontSize: '14px',
    backgroundColor: 'var(--app-surface-2)',
    color: 'var(--app-text)'
  },
  buttonGroup: { display: 'flex', gap: '10px' },
  saveBtn: { 
    flex: 1,
    padding: '10px', 
    backgroundColor: 'var(--app-accent)', 
    color: '#141414', 
    border: 'none', 
    borderRadius: '8px', 
    cursor: 'pointer', 
    fontWeight: 'bold'
  },
  cancelBtn: { 
    flex: 1,
    padding: '10px', 
    backgroundColor: 'var(--app-button-dark)', 
    color: 'var(--app-text)', 
    border: '1px solid var(--app-border)', 
    borderRadius: '8px', 
    cursor: 'pointer', 
    fontWeight: 'bold'
  },
  editBtn: { 
    width: '100%',
    marginTop: 'auto',
    padding: '10px', 
    backgroundColor: 'var(--app-accent)', 
    color: '#f8ffbe', 
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
    color: 'var(--app-muted)',
    fontSize: '13px',
  },
  taxaValue: { color: '#d4af37', fontWeight: 'bold', fontSize: '16px' }
};

export default PaymentRules;
