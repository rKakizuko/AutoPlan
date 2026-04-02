export const LOCAL_PREVIEW_PROTOCOL_STORAGE_KEY = 'localPreviewProtocol';
export const LOCAL_PREVIEW_PROTOCOL_ID = 'local-preview-protocol-001';

const buildDefaultProtocol = () => ({
  _id: LOCAL_PREVIEW_PROTOCOL_ID,
  protocolId: 'AUTO-LOCAL-001',
  cliente: 'Cliente de Demonstração',
  precoBase: 12000,
  metodo: 'cartao',
  parcelas: 3,
  total: 13617.6,
  startDate: '2026-03-18T00:00:00.000Z',
  createdAt: '2026-03-18T10:30:00.000Z',
  payments: [
    {
      parcelaNumero: 1,
      valor: 4539.2,
      pago: true,
      dataPagamento: '2026-03-18T10:30:00.000Z'
    },
    {
      parcelaNumero: 2,
      valor: 4539.2,
      pago: false,
      dataPagamento: null
    },
    {
      parcelaNumero: 3,
      valor: 4539.2,
      pago: false,
      dataPagamento: null
    }
  ]
});

export const getLocalPreviewProtocol = () => {
  try {
    const saved = localStorage.getItem(LOCAL_PREVIEW_PROTOCOL_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
};

export const ensureLocalPreviewProtocol = () => {
  const existing = getLocalPreviewProtocol();
  if (existing && existing._id === LOCAL_PREVIEW_PROTOCOL_ID) {
    return existing;
  }

  const fallbackProtocol = buildDefaultProtocol();
  localStorage.setItem(LOCAL_PREVIEW_PROTOCOL_STORAGE_KEY, JSON.stringify(fallbackProtocol));
  return fallbackProtocol;
};

export const getLocalPreviewProtocolById = (id) => {
  const protocol = ensureLocalPreviewProtocol();
  return protocol._id === id || protocol.protocolId === id ? protocol : null;
};

export const toggleLocalPreviewPayment = (parcelaNumero, pago) => {
  const current = ensureLocalPreviewProtocol();

  const updated = {
    ...current,
    payments: current.payments.map((payment) => {
      if (payment.parcelaNumero !== parcelaNumero) {
        return payment;
      }

      return {
        ...payment,
        pago,
        dataPagamento: pago ? new Date().toISOString() : null
      };
    })
  };

  localStorage.setItem(LOCAL_PREVIEW_PROTOCOL_STORAGE_KEY, JSON.stringify(updated));
  return updated;
};
