import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';

class AuditService {

  async create(action, entityType, entityId = null, actorId = null, actorEmail = 'system', details = {}) {
    try {
      await AuditLog.create({
        action,
        entityType,
        entityId,
        actorId,
        actorEmail,
        details,
      });
    } catch (err) {
      console.error('Falha ao criar log de auditoria:', err.message);
    }
  }


  async query(filters = {}, limit = 100) { //filtros de busca
    const { action, entityType, actorEmail } = filters;
    const filter = {};

    if (action) filter.action = { $regex: action, $options: "i" }; //acao - verificar no banco nome das acoes
    if (entityType) filter.entityType = { $regex: entityType, $options: "i" }; //entidade
    if (actorEmail) filter.actorEmail = new RegExp(actorEmail, 'i'); //email do ator/pessoa

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit) || 100, 200));

    return logs;
  }
}

export default new AuditService();
