import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiUrl } from '../utils/api';

const DEFAULT_RULES = {
  pix: { nome: 'PIX (10% OFF)', taxa: -0.10 },
  boleto: { nome: 'Boleto (5% Taxa)', taxa: 0.05, parcelas: true },
  cartao: { taxaOperadora: 0.04, jurosMensal: 0.0249, parcelas: true }
};

const Simulador = () => {
  const navigate = useNavigate();

  const [precoBase, setPrecoBase] = useState('');
  const [nomeCliente, setNomeCliente] = useState('');
  const [metodo, setMetodo] = useState('pix');
  const [parcelas, setParcelas] = useState(1);
  const [total, setTotal] = useState(0);
  const [rules, setRules] = useState(DEFAULT_RULES);
  const [loadingRules, setLoadingRules] = useState(true);

  useEffect(() => {
    const fetchRules = async () => {
      const token = localStorage.getItem('token');

      if (!token) {
        setRules(DEFAULT_RULES);
        setLoadingRules(false);
        return;
      }

      try {
        const response = await fetch(apiUrl('/api/paymentRules'), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          setRules(DEFAULT_RULES);
          return;
        }

        const data = await response.json();
        setRules({
          pix: { ...DEFAULT_RULES.pix, ...(data.pix || {}) },
          boleto: { ...DEFAULT_RULES.boleto, ...(data.boleto || {}) },
          cartao: { ...DEFAULT_RULES.cartao, ...(data.cartao || {}) },
        });
      } catch (err) {
        console.error('Erro ao carregar regras de pagamento:', err);
        setRules(DEFAULT_RULES);
      } finally {
        setLoadingRules(false);
      }
    };

    fetchRules();
  }, []);


  useEffect(() => {
    const valor = parseFloat(precoBase) || 0;
    let calc = 0;

    if (metodo === 'pix') calc = valor * (1 + (rules.pix?.taxa ?? DEFAULT_RULES.pix.taxa));
    else if (metodo === 'boleto') calc = valor * (1 + (rules.boleto?.taxa ?? DEFAULT_RULES.boleto.taxa));
    else {
      calc = valor * (1 + (rules.cartao?.taxaOperadora ?? DEFAULT_RULES.cartao.taxaOperadora));
      if (parcelas >= 3) calc *= (1 + ((rules.cartao?.jurosMensal ?? DEFAULT_RULES.cartao.jurosMensal) * (parcelas - 2)));
    }
    setTotal(Number(calc.toFixed(2)));
  }, [precoBase, metodo, parcelas, rules]);


  const saveProtocol = async () => {
    const token = localStorage.getItem('token');
    if (!token) {
      alert('Por favor, faça login primeiro');
      return;
    }

    if (!nomeCliente.trim()) {
      alert('Por favor, informe o nome do cliente');
      return;
    }

    try {
      const response = await fetch(apiUrl('/api/protocols'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          cliente: nomeCliente,
          precoBase: parseFloat(precoBase),
          metodo,
          parcelas: parseInt(parcelas),
          total,
          startDate: new Date().toISOString()
        })
      });

      const data = await response.json();
      
      if (response.ok) {
        alert(`Protocolo ${data.protocolId} salvo com sucesso!`);
        setNomeCliente('');
        setPrecoBase('');
        setMetodo('pix');
        setParcelas(1);
      } else {
        alert('Erro ao salvar: ' + (data.message || 'Erro desconhecido'));
      }
    } catch (err) {
      alert('Erro ao conectar ao servidor');
      console.error(err);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.logo}>AutoPlan</h1>
        <div style={styles.userSection}>
          <button onClick={() => navigate('/')} style={styles.backBtn}>← Voltar ao Dashboard</button>
        </div>
      </header>

      <div style={styles.card}>
        <h2 style={styles.title}>Calculadora de Projeto</h2>
        <p style={styles.ruleHint}>
          {loadingRules ? 'Carregando regras de pagamento...' : 'Simulação calculada com as regras configuradas no sistema.'}
        </p>
        
        <div style={styles.formGroup}>
          <label>Nome do Cliente</label>
          <input 
            type="text" 
            style={styles.input} 
            value={nomeCliente} 
            onChange={(e) => setNomeCliente(e.target.value)} 
            placeholder="Ex: João Silva"
          />
        </div>

        <div style={styles.formGroup}>
          <label>Preço Base do Projeto (R$)</label>
          <input 
            type="number" 
            style={styles.inputHighlight} 
            value={precoBase} 
            onChange={(e) => setPrecoBase(e.target.value)} 
            placeholder="0.00"
          />
        </div>

        <div style={styles.formGroup}>
          <label>Forma de Pagamento</label>
          <select style={styles.input} value={metodo} onChange={(e) => setMetodo(e.target.value)}>
            <option value="pix">PIX</option>
            <option value="boleto">Boleto</option>
            <option value="cartao">Cartão de Crédito</option>
          </select>
        </div>

        {(metodo === 'cartao' || metodo === 'boleto') && (
          <div style={styles.formGroup}>
            <label>Parcelas</label>
            <select style={styles.input} value={parcelas} onChange={(e) => setParcelas(Number(e.target.value))}>
              {[...Array(12)].map((_, i) => (
                <option key={i+1} value={i+1}>{i+1}x</option>
              ))}
            </select>
          </div>
        )}

        <div style={styles.totalBox}>
          <small>Valor Final:</small>
          <h1 style={styles.totalValue}>R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</h1>
          {parcelas > 1 && <p>{parcelas}x de R$ {(total/parcelas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>}
        </div>

        <button style={styles.saveBtn} onClick={saveProtocol}>Salvar Protocolo</button>
      </div>
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
  card: { backgroundColor: 'var(--app-surface)', color: 'var(--app-text)', padding: '30px', borderRadius: '15px', boxShadow: '0 10px 25px rgba(0,0,0,0.35)', border: '1px solid var(--app-border)', width: '100%', maxWidth: '400px', margin: '40px auto' },
  backBtn: {
    padding: '10px 16px',
    backgroundColor: 'var(--app-button-dark)',
    color: 'var(--app-accent)',
    border: '1px solid var(--app-border)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '14px'
  },
  title: { margin: '0 0 20px 0', color: 'var(--app-accent)' },
  ruleHint: { margin: '-8px 0 20px 0', color: 'var(--app-muted)', fontSize: '13px' },
  formGroup: { marginBottom: '15px', display: 'flex', flexDirection: 'column' },
  input: { padding: '10px', borderRadius: '8px', border: '1px solid var(--app-border)', backgroundColor: 'var(--app-surface-2)', color: 'var(--app-text)' },
  inputHighlight: { padding: '15px', borderRadius: '8px', border: '2px solid var(--app-accent)', fontSize: '20px', fontWeight: 'bold', backgroundColor: 'var(--app-surface-2)', color: 'var(--app-text)' },
  totalBox: { backgroundColor: 'var(--app-surface-2)', border: '1px solid var(--app-border)', padding: '20px', borderRadius: '10px', marginTop: '20px', textAlign: 'center' },
  totalValue: { margin: '5px 0', color: 'var(--app-accent)' },
  saveBtn: { width: '100%', padding: '15px', marginTop: '20px', backgroundColor: 'var(--app-accent)', color: '#141414', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }
};

export default Simulador;