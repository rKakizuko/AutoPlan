import AuditLog from '../models/AuditLog.js';
import User from '../models/User.js';

class AuditService {
  /**
   * Registra uma ação no log de auditoria
   * @param {string} action
   * @param {string} entityType
   * @param {string} entityId - optional
   * @param {string} actorId - optional
   * @param {string} actorEmail
   * @param {object} details
   * @returns {Promise<void>}
   */
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
      console.error('Failed to create audit log:', err.message);
    }
  }

  /**
   * Consulta logs com filtros
   * @param {object} filters - {action, entityType, actorEmail}
   * @param {number} limit
   * @returns {Promise<array>}
   */
  async query(filters = {}, limit = 100) {
    const { action, entityType, actorEmail } = filters;
    const filter = {};

    if (action) filter.action = action;
    if (entityType) filter.entityType = entityType;
    if (actorEmail) filter.actorEmail = new RegExp(actorEmail, 'i');

    const logs = await AuditLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(Math.min(Number(limit) || 100, 200));

    return logs;
  }
}

export default new AuditService();
