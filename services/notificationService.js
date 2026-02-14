const Notification = require('../models/Notification');

/**
 * Create a notification for one or more users.
 * @param {Object} options
 * @param {string|string[]} options.userIds - User ID(s) to notify
 * @param {string} options.companyId
 * @param {string} options.type - client_added | client_assigned | client_bulk_assigned | meeting_reminder | task_due | general
 * @param {string} options.title
 * @param {string} options.message
 * @param {string} [options.link]
 * @param {string} [options.relatedId]
 * @param {string} [options.relatedModel]
 */
async function createNotification(options) {
  const { userIds, companyId, type, title, message, link, relatedId, relatedModel } = options;
  const ids = Array.isArray(userIds) ? userIds : [userIds];
  const docs = ids.filter(Boolean).map((userId) => ({
    userId,
    companyId,
    type,
    title,
    message,
    link: link || undefined,
    relatedId: relatedId || undefined,
    relatedModel: relatedModel || undefined
  }));
  if (docs.length === 0) return [];
  const created = await Notification.insertMany(docs);
  return created;
}

/**
 * Notify when a new client is added.
 * - If added by employee: notify admin.
 * - If client is assigned to an employee: notify that employee.
 */
async function notifyClientAdded({ client, addedByUser, companyId }) {
  const toNotify = [];
  if (addedByUser.role === 'employee') {
    const admin = await require('../models/User').findOne({ companyId, role: 'admin' }).select('_id').lean();
    if (admin) toNotify.push(admin._id.toString());
  }
  if (client.assignedTo && client.assignedTo.toString() !== addedByUser.id) {
    toNotify.push(client.assignedTo.toString());
  }
  const addedByName = addedByUser.name || 'Someone';
  const clientName = client.name || 'A client';
  if (toNotify.length) {
    await createNotification({
      userIds: [...new Set(toNotify)],
      companyId,
      type: 'client_added',
      title: 'New client added',
      message: `${addedByName} added client "${clientName}".`,
      link: `/clients/${client._id}`,
      relatedId: client._id,
      relatedModel: 'Client'
    });
  }
}

/**
 * Notify when a client is assigned to an employee (on add or update).
 */
async function notifyClientAssigned({ clientId, clientName, assignedToUserId, assignedByName, companyId }) {
  if (!assignedToUserId) return;
  await createNotification({
    userIds: assignedToUserId,
    companyId,
    type: 'client_assigned',
    title: 'Client assigned to you',
    message: `${assignedByName || 'Admin'} assigned you the client "${clientName || 'Client'}".`,
    link: `/clients/${clientId}`,
    relatedId: clientId,
    relatedModel: 'Client'
  });
}

/**
 * Notify employees when they are bulk-assigned clients.
 */
async function notifyBulkAssigned({ userId, companyId, count, assignedByName }) {
  await createNotification({
    userIds: userId,
    companyId,
    type: 'client_bulk_assigned',
    title: 'Clients assigned to you',
    message: `${assignedByName} assigned ${count} client(s) to you.`,
    link: '/clients?assigned=me',
    relatedModel: 'Client'
  });
}

/**
 * Notify about meeting tomorrow.
 */
async function notifyMeetingReminder({ userId, companyId, clientName, clientId, meetingDate }) {
  await createNotification({
    userIds: userId,
    companyId,
    type: 'meeting_reminder',
    title: 'Meeting tomorrow',
    message: `Meeting with ${clientName} is scheduled for ${meetingDate}.`,
    link: clientId ? `/clients/${clientId}` : '/clients',
    relatedId: clientId,
    relatedModel: 'Client'
  });
}

/**
 * Create meeting-reminder notifications for tomorrow's meetings (for the given user).
 * Skips if a reminder for that client was already created today.
 */
async function ensureMeetingRemindersForUser(userId, companyId) {
  const tomorrowStart = new Date();
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);
  tomorrowStart.setHours(0, 0, 0, 0);
  const tomorrowEnd = new Date(tomorrowStart);
  tomorrowEnd.setHours(23, 59, 59, 999);

  const User = require('../models/User');
  const clients = await require('../models/Client')
    .find({
      companyId,
      meetingDate: { $gte: tomorrowStart, $lte: tomorrowEnd },
      $or: [{ assignedTo: userId }, { addedBy: userId }]
    })
    .select('_id name meetingDate assignedTo addedBy')
    .lean();

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  for (const client of clients) {
    const existing = await Notification.findOne({
      userId,
      type: 'meeting_reminder',
      relatedId: client._id,
      createdAt: { $gte: startOfToday }
    });
    if (existing) continue;
    const meetingDateStr = client.meetingDate ? new Date(client.meetingDate).toLocaleString() : 'tomorrow';
    await notifyMeetingReminder({
      userId,
      companyId,
      clientName: client.name,
      clientId: client._id,
      meetingDate: meetingDateStr
    });
  }
}

module.exports = {
  createNotification,
  notifyClientAdded,
  notifyClientAssigned,
  notifyBulkAssigned,
  notifyMeetingReminder,
  ensureMeetingRemindersForUser
};
