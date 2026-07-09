import Protocol from '../models/Protocol.js';
import User from '../models/User.js';
import { registrarLogAuditoria } from '../utils/audit.js';

class ProtocolService {
  async criar(userId, cliente, precoBase, metodo, parcelas, total) {
    const actor = await User.findById(userId);

    const protocolId = `PROTO-${Date.now()}`;

    const numParcelas = parcelas || 1;
    const parcelaValue = total / numParcelas;
    const payments = [];
    for (let i = 1; i <= numParcelas; i++) {
      payments.push({
        parcelaNumero: i,
        valor: parcelaValue,
        pago: false,
      });
    }

    const protocol = new Protocol({
      protocolId,
      userId,
      cliente,
      precoBase,
      metodo,
      parcelas: numParcelas,
      total,
      payments,
    });

    await protocol.save();

    await registrarLogAuditoria({
      action: 'protocol_created',
      entityType: 'protocol',
      entityId: protocol._id.toString(),
      actorId: actor?._id || null,
      actorEmail: actor?.email || 'system',
      details: {
        protocolId,
        cliente,
        precoBase,
        metodo,
        parcelas: numParcelas,
        total,
      },
    });

    return protocol;
  }

  async listarTodos(userId, isAdmin) {
    const filter = isAdmin ? {} : { userId };
    const protocols = await Protocol.find(filter).sort({ createdAt: -1 });
    return protocols;
  }

  async obterPorId(protocolId, userId, isAdmin) {
    const protocol = await Protocol.findById(protocolId);

    if (!protocol) {
      throw new Error('Protocolo não encontrado');
    }

    if (!isAdmin && protocol.userId.toString() !== userId.toString()) {
      throw new Error('Não autorizado');
    }

    return protocol;
  }

  async atualizarStatusPagamento(protocolId, userId, parcelaNumero, pago, dataPagamento) {
    const protocol = await Protocol.findById(protocolId);

    if (!protocol) {
      throw new Error('Protocolo não encontrado');
    }

    if (protocol.userId.toString() !== userId.toString()) {
      throw new Error('Não autorizado');
    }

    const payment = protocol.payments.find((p) => p.parcelaNumero === parcelaNumero);
    if (!payment) {
      throw new Error('Pagamento não encontrado');
    }

    payment.pago = pago;
    if (pago) {
      payment.dataPagamento = dataPagamento || new Date();
    } else {
      payment.dataPagamento = null;
    }

    await protocol.save();

    const actor = await User.findById(userId);
    await registrarLogAuditoria({
      action: 'protocol_payment_updated',
      entityType: 'protocol_payment',
      entityId: protocol._id.toString(),
      actorId: actor?._id || null,
      actorEmail: actor?.email || 'system',
      details: {
        protocolId: protocol.protocolId,
        parcelaNumero,
        pago,
        dataPagamento: payment.dataPagamento,
      },
    });

    return protocol;
  }
}

export default new ProtocolService();
