import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Simulador = () => {
  const navigate = useNavigate();
  
  const REGRAS = {
    pix: { nome: 'PIX (10% OFF)', taxa: -0.10 },
    boleto: { nome: 'Boleto (5% Taxa)', taxa: 0.05 },
    cartao: { taxaOperadora: 0.04, jurosMensal: 0.0249 }
  };

  const [precoBase, setPrecoBase] = useState('');
  const [nomeCliente, setNomeCliente] = useState('');
  const [metodo, setMetodo] = useState('pix');
  const [parcelas, setParcelas] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const valor = parseFloat(precoBase) || 0;
    let calc = 0;

    if (metodo === 'pix') calc = valor * (1 + REGRAS.pix.taxa);
    else if (metodo === 'boleto') calc = valor * (1 + REGRAS.boleto.taxa);
    else {
      calc = valor * (1 + REGRAS.cartao.taxaOperadora);
      if (parcelas >= 3) calc *= (1 + (REGRAS.cartao.jurosMensal * (parcelas - 2)));
    }
    setTotal(calc);
  }, [precoBase, metodo, parcelas]);

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
      const response = await fetch('http://localhost:5000/api/protocols', {
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
        // Limpar formulário
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
  card: { backgroundColor: '#181819', color: '#f5deb3', padding: '30px', borderRadius: '15px', boxShadow: '0 10px 25px rgba(0,0,0,0.35)', border: '1px solid #5f4b1c', width: '100%', maxWidth: '400px', margin: '40px auto' },
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
  title: { margin: '0 0 20px 0', color: '#d4af37' },
  formGroup: { marginBottom: '15px', display: 'flex', flexDirection: 'column' },
  input: { padding: '10px', borderRadius: '8px', border: '1px solid #6f5a22', backgroundColor: '#1f1f20', color: '#f5deb3' },
  inputHighlight: { padding: '15px', borderRadius: '8px', border: '2px solid #d4af37', fontSize: '20px', fontWeight: 'bold', backgroundColor: '#1f1f20', color: '#f5deb3' },
  totalBox: { backgroundColor: '#201b10', border: '1px solid #6f5a22', padding: '20px', borderRadius: '10px', marginTop: '20px', textAlign: 'center' },
  totalValue: { margin: '5px 0', color: '#d4af37' },
  saveBtn: { width: '100%', padding: '15px', marginTop: '20px', backgroundColor: '#d4af37', color: '#141414', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }
};

export default Simulador;