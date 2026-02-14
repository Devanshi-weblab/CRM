const Client = require('../models/Client');
const StatusOption = require('../models/StatusOption');
const User = require('../models/User');
const Activity = require('../models/Activity');
const ExcelJS = require('exceljs');
const mongoose = require('mongoose');
const { notifyClientAdded, notifyClientAssigned, notifyBulkAssigned } = require('../services/notificationService');

// GET all clients
exports.getAllClients = async (req, res, next) => {
  try {
    const user = req.session.user;
    if (!user) return res.redirect('/auth/login');

    const statusOptions = await StatusOption.find({ companyId: user.companyId });

    // Normalize query params (can be arrays when form has duplicate field names)
    const single = (v) => (Array.isArray(v) ? v[0] : v);
    const statusVal = String(single(req.query.status) || '').trim();
    const assignedVal = String(single(req.query.assigned) || '').trim();
    const q = String(single(req.query.q) || '').trim();

    const query = { companyId: user.companyId };
    if (statusVal) query.status = statusVal;
    // "My clients" for employees; only set assignedTo when value is valid to avoid CastError
    if (assignedVal === 'me') query.assignedTo = user.id;
    else if (assignedVal && mongoose.Types.ObjectId.isValid(assignedVal)) query.assignedTo = assignedVal;

    // Search by name, email, or phone
    if (q) {
      const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      query.$or = [
        { name: regex },
        { email: regex },
        { contactNumber: regex }
      ];
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    const sortBy = String(single(req.query.sort) || '').trim() || 'createdAt';
    const sortOrder = (single(req.query.order) === 'asc') ? 1 : -1;
    const sortObj = sortBy === 'name' ? { name: sortOrder } : { createdAt: -1 };

    const totalClients = await Client.countDocuments(query);
    const totalPages = Math.ceil(totalClients / limit);

    const clients = await Client.find(query)
      .populate('addedBy', 'name')
      .populate('assignedTo', 'name')
      .populate('status', 'name color')
      .skip(skip)
      .limit(limit)
      .sort(sortObj);

    const statusCounts = {};
    statusCounts.noStatus = await Client.countDocuments({ companyId: user.companyId, status: { $exists: false } });
    for (const statusOption of statusOptions) {
      statusCounts[statusOption._id.toString()] = await Client.countDocuments({
        companyId: user.companyId,
        status: statusOption._id
      });
    }

    let employees = [];
    if (user.role === 'admin') {
      employees = await User.find({ companyId: user.companyId, role: 'employee' }).select('name').lean();
    }

    const buildQuery = (overrides = {}) => {
      const params = { ...req.query, ...overrides };
      const s = Object.entries(params)
        .filter(([, v]) => v != null && v !== '')
        .map(([k, v]) => `${k}=${encodeURIComponent(Array.isArray(v) ? (v[0] || '') : v)}`)
        .join('&');
      return s ? '?' + s : '';
    };

    res.render('clients/list', {
      pageTitle: 'Clients',
      clients,
      statusOptions,
      employees,
      selectedStatus: statusVal,
      searchQ: q,
      assignedFilter: assignedVal,
      statusCounts,
      user,
      buildQuery,
      sortBy,
      sortOrder: sortOrder === 1 ? 'asc' : 'desc',
      pagination: {
        page,
        totalPages,
        totalClients,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (err) {
    next(err);
  }
};

// GET form to add client
exports.getAddClientForm = async (req, res, next) => {
  const user = req.session.user;
  if (!user) return res.redirect('/auth/login');

  try {
    const statusOptions = await StatusOption.find({ companyId: user.companyId });
    let employees = [];
    if (user.role === 'admin') {
      employees = await User.find({ companyId: user.companyId, role: 'employee' }).select('name').lean();
    }
    res.render('clients/add', {
      pageTitle: 'Add New Client',
      companyId: user.companyId,
      addedBy: user.id,
      statusOptions,
      employees,
      user
    });
  } catch (err) {
    next(err);
  }
};

// POST add client
exports.addClient = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.redirect('/auth/login');

    const client = new Client({
      name: req.body.name,
      contactNumber: req.body.contactNumber,
      email: req.body.email,
      address: req.body.address,
      meetingDate: req.body.meetingDate,
      notes: req.body.notes,
      status: req.body.status,
      assignedTo: user.role === 'admin' && req.body.assignedTo ? req.body.assignedTo : undefined,
      companyId: user.companyId,
      addedBy: user.id
    });

    await client.save();
    try {
      const addedByUser = { id: user.id, name: user.name, role: user.role };
      const clientObj = { _id: client._id, name: client.name, assignedTo: client.assignedTo };
      await notifyClientAdded({ client: clientObj, addedByUser, companyId: user.companyId });
      if (client.assignedTo) {
        const assignedToId = client.assignedTo._id ? client.assignedTo._id.toString() : client.assignedTo.toString();
        if (assignedToId !== user.id) {
          await notifyClientAssigned({
            clientId: client._id,
            clientName: client.name,
            assignedToUserId: assignedToId,
            assignedByName: user.name,
            companyId: user.companyId
          });
        }
      }
    } catch (notifyErr) {
      console.error('Notification error:', notifyErr);
    }
    req.session.flash = { type: 'success', message: 'Client added successfully.' };
    res.redirect('/clients');
  } catch (err) {
    req.session.flash = { type: 'error', message: err.message };
    res.redirect('/clients/add');
  }
};

// GET client detail (with activities)
exports.getClientDetail = async (req, res, next) => {
  try {
    const user = req.session.user;
    if (!user) return res.redirect('/auth/login');
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).send('Not found');

    const client = await Client.findOne({
      _id: req.params.id,
      companyId: user.companyId
    })
      .populate('addedBy', 'name')
      .populate('assignedTo', 'name')
      .populate('status', 'name')
      .lean();
    if (!client) return res.status(404).send('Client not found');

    const activities = await Activity.find({ clientId: client._id, companyId: user.companyId })
      .populate('userId', 'name')
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    // Pass in a single object so EJS scope is not polluted (avoids "include is not a function" if any key shadows EJS include)
    res.render('clients/detail', { pageTitle: `Client - ${client.name}`, viewData: { client, activities, user } });
  } catch (err) {
    next(err);
  }
};

// GET edit form
exports.getEditForm = async (req, res, next) => {
  try {
    const user = req.session.user;
    if (!user) return res.redirect('/auth/login');

    const client = await Client.findOne({
      _id: req.params.id,
      companyId: user.companyId
    }).lean();
    if (!client) return res.status(404).send('Client not found');

    const statusOptions = await StatusOption.find({ companyId: user.companyId }).lean();
    let employees = [];
    if (user.role === 'admin') {
      employees = await User.find({ companyId: user.companyId, role: 'employee' }).select('name').lean();
    }
    res.render('clients/edit', { pageTitle: 'Edit Client', viewData: { client, statusOptions, employees, user } });
  } catch (err) {
    next(err);
  }
};

// POST update client
exports.updateClient = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.redirect('/auth/login');

    const client = await Client.findOne({
      _id: req.params.id,
      companyId: user.companyId
    });
    if (!client) return res.status(404).send('Client not found');

    const update = {
      name: req.body.name,
      contactNumber: req.body.contactNumber,
      email: req.body.email,
      address: req.body.address,
      meetingDate: req.body.meetingDate,
      notes: req.body.notes,
      status: req.body.status
    };
    const previousAssignedTo = client.assignedTo ? client.assignedTo.toString() : null;
    const newAssignedTo = (user.role === 'admin' && req.body.assignedTo != null && req.body.assignedTo !== '') ? String(req.body.assignedTo).trim() : null;
    if (user.role === 'admin') {
      update.assignedTo = newAssignedTo || null;
    }
    await Client.findByIdAndUpdate(req.params.id, update);
    try {
      if (newAssignedTo && newAssignedTo !== previousAssignedTo) {
        await notifyClientAssigned({
          clientId: req.params.id,
          clientName: update.name || client.name,
          assignedToUserId: newAssignedTo,
          assignedByName: user.name,
          companyId: user.companyId
        });
      }
    } catch (notifyErr) {
      console.error('Notification error:', notifyErr);
    }
    req.session.flash = { type: 'success', message: 'Client updated successfully.' };
    res.redirect('/clients');
  } catch (err) {
    req.session.flash = { type: 'error', message: err.message || 'Failed to update client.' };
    res.redirect('/clients/edit/' + req.params.id);
  }
};

// POST delete client
exports.deleteClient = async (req, res, next) => {
  try {
    const user = req.session.user;
    if (!user) return res.redirect('/auth/login');

    const client = await Client.findOne({
      _id: req.params.id,
      companyId: user.companyId
    });
    if (!client) return res.status(404).send('Client not found');

    if (client.addedBy.toString() !== req.body.userId) {
      return res.status(403).send("You don't have permission to delete this client.");
    }

    await Client.findByIdAndDelete(req.params.id);
    req.session.flash = { type: 'success', message: 'Client deleted.' };
    res.redirect('/clients');
  } catch (err) {
    next(err);
  }
};

// POST /clients/bulk-update - bulk update status
exports.bulkUpdateStatus = async (req, res, next) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const ids = Array.isArray(req.body.ids) ? req.body.ids : (req.body.ids ? [req.body.ids] : []);
    const status = req.body.status;
    if (!ids.length) return res.status(400).json({ error: 'No clients selected.' });

    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const result = await Client.updateMany(
      { _id: { $in: validIds }, companyId: user.companyId },
      { $set: { status: status || null } }
    );
    req.session.flash = { type: 'success', message: `${result.modifiedCount} client(s) updated.` };
    res.json({ ok: true, modifiedCount: result.modifiedCount });
  } catch (err) {
    next(err);
  }
};

// POST /clients/bulk-assign - bulk assign to employee (admin only)
exports.bulkAssign = async (req, res, next) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });
    if (user.role !== 'admin') return res.status(403).json({ error: 'Only admin can bulk assign.' });

    const ids = Array.isArray(req.body.ids) ? req.body.ids : (req.body.ids ? [req.body.ids] : []);
    const assignedTo = (req.body.assignedTo || '').trim();
    if (!ids.length) return res.status(400).json({ error: 'No clients selected.' });
    if (!assignedTo) return res.status(400).json({ error: 'Select an employee to assign.' });

    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const result = await Client.updateMany(
      { _id: { $in: validIds }, companyId: user.companyId },
      { $set: { assignedTo } }
    );
    try {
      await notifyBulkAssigned({
        userId: assignedTo,
        companyId: user.companyId,
        count: result.modifiedCount,
        assignedByName: user.name
      });
    } catch (e) {
      console.error('Bulk assign notification:', e);
    }
    req.session.flash = { type: 'success', message: `${result.modifiedCount} client(s) assigned.` };
    res.json({ ok: true, modifiedCount: result.modifiedCount });
  } catch (err) {
    next(err);
  }
};

// POST /clients/bulk-delete - bulk delete (admin can delete any; employee only their own)
exports.bulkDelete = async (req, res, next) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    const ids = Array.isArray(req.body.ids) ? req.body.ids : (req.body.ids ? [req.body.ids] : []);
    if (!ids.length) return res.status(400).json({ error: 'No clients selected.' });

    const validIds = ids.filter((id) => mongoose.Types.ObjectId.isValid(id));
    const query = { _id: { $in: validIds }, companyId: user.companyId };
    if (user.role !== 'admin') query.addedBy = user.id;
    const result = await Client.deleteMany(query);
    req.session.flash = { type: 'success', message: `${result.deletedCount} client(s) deleted.` };
    res.json({ ok: true, deletedCount: result.deletedCount });
  } catch (err) {
    next(err);
  }
};

// Download client report
exports.downloadReport = async (req, res, next) => {
  try {
    const user = req.session.user;
    if (!user) return res.redirect('/auth/login');

    const { status } = req.query;
    const query = { companyId: user.companyId };
    if (status) {
      query.status = status;
    }

    const clients = await Client.find(query)
      .populate('status', 'name')
      .populate('addedBy', 'name')
      .sort({ createdAt: -1 });

    // Create a new workbook and worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Clients Report');

    // Add headers
    worksheet.columns = [
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Contact Number', key: 'contactNumber', width: 15 },
      { header: 'Email', key: 'email', width: 30 },
      { header: 'Status', key: 'status', width: 20 },
      { header: 'Meeting Date', key: 'meetingDate', width: 15 },
      { header: 'Added By', key: 'addedBy', width: 20 },
      { header: 'Created At', key: 'createdAt', width: 20 }
    ];

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Add data rows
    clients.forEach(client => {
      worksheet.addRow({
        name: client.name,
        contactNumber: client.contactNumber,
        email: client.email,
        status: client.status ? client.status.name : 'No Status',
        meetingDate: client.meetingDate ? client.meetingDate.toLocaleDateString() : 'N/A',
        addedBy: client.addedBy ? client.addedBy.name : 'Unknown',
        createdAt: client.createdAt.toLocaleDateString()
      });
    });

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `clients-report-${timestamp}.xlsx`;

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

  } catch (error) {
    next(error);
  }
};

// Get client meetings for calendar
exports.getClientMeetings = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user || user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Fetch clients with meeting dates within a given range (if provided)
    // For simplicity, fetching all clients with meeting dates for now
    const clientsWithMeetings = await Client.find(
      {
        companyId: user.companyId,
        meetingDate: { $exists: true, $ne: null }
      },
      'name meetingDate'
    ); // Select only necessary fields

    // Format data for FullCalendar
    const events = clientsWithMeetings.map(client => ({
      title: client.name + ' Meeting',
      start: client.meetingDate.toISOString(), // FullCalendar uses ISO 8601 format
      url: `/clients/edit/${client._id}` // Optional: Link to edit client
    }));

    res.json(events);

  } catch (error) {
    console.error('Error fetching client meetings:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch meetings' });
  }
};
