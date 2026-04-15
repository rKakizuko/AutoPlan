import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getLocalPreviewProtocolById, LOCAL_PREVIEW_PROTOCOL_ID, toggleLocalPreviewPayment } from '../localPreviewProtocol';

const ProtocolDetail = () => {
  const navigate = useNavigate();
  const { protocolId } = useParams();
  const [protocol, setProtocol] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingPayment, setUpdatingPayment] = useState(null);

  useEffect(() => {
    const fetchProtocol = async () => {
      const localPreviewProtocol = getLocalPreviewProtocolById(protocolId);
      if (localPreviewProtocol) {
        setProtocol(localPreviewProtocol);
        setLoading(false);
        return;
      }

      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const response = await fetch(`http://localhost:5000/api/protocols/${protocolId}`, {
          headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (!response.ok) {
          setError(data.message || 'Protocolo não encontrado');
          return;
        }

        setProtocol(data);
      } catch (err) {
        setError('Erro ao carregar protocolo');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProtocol();
  }, [protocolId, navigate]);

  const handlePaymentToggle = async (parcelaNumero, currentStatus) => {
    if (protocol?._id === LOCAL_PREVIEW_PROTOCOL_ID) {
      setUpdatingPayment(parcelaNumero);
      const updatedProtocol = toggleLocalPreviewPayment(parcelaNumero, !currentStatus);
      setProtocol(updatedProtocol);
      setUpdatingPayment(null);
      return;
    }

    const token = localStorage.getItem('token');
    if (!token) return;

    setUpdatingPayment(parcelaNumero);
    
    try {
      const response = await fetch(`http://localhost:5000/api/protocols/${protocolId}/payment`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          parcelaNumero,
          pago: !currentStatus
        })
      });

      const data = await response.json();

      if (response.ok) {
        setProtocol(data);
      } else {
        alert('Erro ao atualizar pagamento');
      }
    } catch (err) {
      alert('Erro ao conectar ao servidor');
      console.error(err);
    } finally {
      setUpdatingPayment(null);
    }
  };

  if (loading) {
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
        <div style={styles.card}><p>Carregando...</p></div>
      </div>
    );
  }

  if (error) {
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
          <h2 style={{ color: 'var(--app-danger-text)' }}>Erro</h2>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (!protocol) {
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
          <h2>Protocolo não encontrado</h2>
        </div>
      </div>
    );
  }

  const metodoNomes = {
    pix: 'PIX (10% OFF)',
    boleto: 'Boleto (5% Taxa)',
    cartao: 'Cartão de Crédito'
  };

  const startDate = new Date(protocol.startDate);
  const formattedDate = startDate.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

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
        <h1 style={styles.protocolId}>Protocolo: {protocol.protocolId}</h1>

        <div style={styles.infoGrid}>
          <div style={styles.infoBox}>
            <label>Cliente</label>
            <p style={styles.value}>{protocol.cliente}</p>
          </div>

          <div style={styles.infoBox}>
            <label>Data de Início</label>
            <p style={styles.value}>{formattedDate}</p>
          </div>

          <div style={styles.infoBox}>
            <label>Preço Base</label>
            <p style={styles.value}>
              R$ {protocol.precoBase.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          <div style={styles.infoBox}>
            <label>Método de Pagamento</label>
            <p style={styles.value}>{metodoNomes[protocol.metodo]}</p>
          </div>

          {protocol.metodo !== 'pix' && (
            <div style={styles.infoBox}>
              <label>Parcelas</label>
              <p style={styles.value}>{protocol.parcelas}x</p>
            </div>
          )}

          <div style={styles.infoBox}>
            <label>Valor Final</label>
            <p style={{ ...styles.value, fontSize: '24px', color: 'var(--app-accent)', fontWeight: 'bold' }}>
              R$ {protocol.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>

        {protocol.metodo === 'boleto' && protocol.parcelas > 1 && (
          <div style={styles.parcelasBox}>
            <h3>Detalhes das Parcelas</h3>
            <p style={styles.parcelaInfo}>
              {protocol.parcelas}x de R$ {(protocol.total / protocol.parcelas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        )}

        {protocol.metodo === 'cartao' && protocol.parcelas > 1 && (
          <div style={styles.parcelasBox}>
            <h3>Detalhes das Parcelas</h3>
            <p style={styles.parcelaInfo}>
              {protocol.parcelas}x de R$ {(protocol.total / protocol.parcelas).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </div>
        )}

        {protocol.payments && protocol.payments.length > 0 && (
          <div style={styles.paymentsBox}>
            <h3>📋 Gerenciar Pagamentos</h3>
            <div style={styles.paymentsGrid}>
              {protocol.payments.map((payment) => (
                <div key={payment.parcelaNumero} style={{
                  ...styles.paymentCard,
                  backgroundColor: payment.pago ? 'var(--app-success-bg)' : 'var(--app-surface-2)',
                  borderLeft: `4px solid ${payment.pago ? 'var(--app-accent)' : 'var(--app-border)'}`
                }}>
                  <div style={styles.paymentHeader}>
                    <span style={styles.parcelaLabel}>Parcela {payment.parcelaNumero}</span>
                    <span style={{...styles.paymentStatus, color: payment.pago ? 'var(--app-accent)' : 'var(--app-accent-strong)'}}>
                      {payment.pago ? '✓ Pago' : '⏳ Pendente'}
                    </span>
                  </div>
                  <p style={styles.paymentValue}>
                    R$ {payment.valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </p>
                  {payment.dataPagamento && (
                    <p style={styles.paymentDate}>
                      Pago em: {new Date(payment.dataPagamento).toLocaleDateString('pt-BR')}
                    </p>
                  )}
                  <button
                    onClick={() => handlePaymentToggle(payment.parcelaNumero, payment.pago)}
                    disabled={updatingPayment === payment.parcelaNumero}
                    style={{
                      ...styles.paymentBtn,
                      backgroundColor: payment.pago ? 'var(--app-button-dark)' : 'var(--app-accent)',
                      color: payment.pago ? 'var(--app-text)' : '#141414',
                      border: payment.pago ? '1px solid var(--app-border)' : 'none'
                    }}
                  >
                    {updatingPayment === payment.parcelaNumero ? 'Atualizando...' : (payment.pago ? 'Marcar como Pendente' : 'Marcar como Pago')}
                  </button>
                </div>
              ))}
            </div>
            <div style={styles.paymentSummary}>
              <p>Parcelas Pagas: <strong>{protocol.payments.filter(p => p.pago).length}/{protocol.payments.length}</strong></p>
              <p>Valor Recebido: <strong>R$ {protocol.payments.filter(p => p.pago).reduce((sum, p) => sum + p.valor, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></p>
            </div>
          </div>
        )}

        <div style={styles.footer}>
          <p style={styles.createdInfo}>
            Criado em: {new Date(protocol.createdAt).toLocaleDateString('pt-BR')} às {new Date(protocol.createdAt).toLocaleTimeString('pt-BR')}
          </p>
        </div>
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
  card: { 
    backgroundColor: 'var(--app-surface)', 
    padding: '40px', 
    borderRadius: '15px', 
    boxShadow: '0 10px 25px rgba(0,0,0,0.35)', 
    border: '1px solid var(--app-border)',
    color: 'var(--app-text)',
    width: '100%', 
    maxWidth: '600px',
    margin: '20px auto'
  },
  backBtn: { 
    padding: '10px 16px',
    backgroundColor: 'var(--app-button-dark)',
    color: 'var(--app-accent)',
    border: '1px solid var(--app-border)',
    borderRadius: '8px',
    cursor: 'pointer', 
    marginBottom: '20px', 
    fontWeight: 'bold',
    fontSize: '14px'
  },
  protocolId: { 
    color: 'var(--app-accent)', 
    margin: '0 0 30px 0',
    fontSize: '28px'
  },
  infoGrid: { 
    display: 'grid', 
    gridTemplateColumns: '1fr 1fr', 
    gap: '20px',
    marginBottom: '30px'
  },
  infoBox: { 
    padding: '15px', 
    backgroundColor: 'var(--app-surface-2)', 
    borderRadius: '8px',
    borderLeft: '4px solid var(--app-accent)'
  },
  value: { 
    margin: '8px 0 0 0',
    fontSize: '16px',
    fontWeight: '600',
    color: 'var(--app-text)'
  },
  parcelasBox: { 
    backgroundColor: 'var(--app-surface-2)', 
    border: '1px solid var(--app-border)',
    padding: '20px', 
    borderRadius: '10px',
    marginBottom: '30px'
  },
  parcelaInfo: { 
    fontSize: '16px',
    color: 'var(--app-accent)',
    fontWeight: '600',
    margin: '10px 0 0 0'
  },
  footer: { 
    borderTop: '1px solid var(--app-border)',
    paddingTop: '20px',
    textAlign: 'center'
  },
  createdInfo: { 
    color: 'var(--app-muted)',
    fontSize: '12px',
    margin: 0
  },
  paymentsBox: {
    backgroundColor: 'var(--app-surface)',
    padding: '20px',
    borderRadius: '10px',
    marginBottom: '30px',
    border: '1px solid var(--app-border)',
    height: '430px',
    display: 'flex',
    flexDirection: 'column'
  },
  paymentsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '15px',
    marginBottom: '20px',
    overflowY: 'auto',
    flex: 1
  },
  paymentCard: {
    padding: '15px',
    borderRadius: '8px',
    textAlign: 'center',
    minHeight: '170px'
  },
  paymentHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '10px'
  },
  parcelaLabel: {
    fontWeight: 'bold',
    fontSize: '14px'
  },
  paymentStatus: {
    fontSize: '12px',
    fontWeight: 'bold'
  },
  paymentValue: {
    fontSize: '18px',
    fontWeight: 'bold',
    margin: '10px 0',
    color: 'var(--app-text)'
  },
  paymentDate: {
    fontSize: '11px',
    color: 'var(--app-muted)',
    margin: '5px 0'
  },
  paymentBtn: {
    width: '100%',
    padding: '8px',
    color: '#141414',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: 'bold',
    fontSize: '12px',
    marginTop: '10px',
    transition: 'opacity 0.2s'
  },
  paymentSummary: {
    backgroundColor: 'var(--app-surface-2)',
    padding: '15px',
    borderRadius: '8px',
    borderLeft: '4px solid var(--app-accent)',
    display: 'flex',
    justifyContent: 'space-around',
    alignItems: 'center'
  }
};

export default ProtocolDetail;
