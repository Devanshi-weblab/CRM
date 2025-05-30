const Client = require('../models/Client');
const StatusOption = require('../models/StatusOption');
const ExcelJS = require('exceljs');

// GET all clients
exports.getAllClients = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.redirect('/auth/login');

    // Get status options for the filter dropdown
    const statusOptions = await StatusOption.find({ companyId: user.companyId });

    // Build query based on status filter
    const query = { companyId: user.companyId };
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Pagination
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const totalClients = await Client.countDocuments(query);
    const totalPages = Math.ceil(totalClients / limit);

    const clients = await Client.find(query)
      .populate('addedBy', 'name')
      .populate('status', 'name color')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // Sort by newest first

    // Initialize status counts with all status options
    const statusCounts = {};
    
    // Add count for clients with no status
    statusCounts.noStatus = await Client.countDocuments({ 
      companyId: user.companyId, 
      status: { $exists: false } 
    });

    // Get counts for each status option
    for (const statusOption of statusOptions) {
      statusCounts[statusOption._id.toString()] = await Client.countDocuments({
        companyId: user.companyId,
        status: statusOption._id
      });
    }

    res.render('clients/list', { 
      clients,
      statusOptions,
      selectedStatus: req.query.status || '',
      statusCounts,
      user,
      pagination: {
        page,
        totalPages,
        totalClients,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// GET form to add client
exports.getAddClientForm = async (req, res) => {
  const user = req.session.user;
  if (!user) return res.redirect('/auth/login');

  try {
    const statusOptions = await StatusOption.find({ companyId: user.companyId });
    console.log(statusOptions);
    console.log(user.companyId );
    res.render('clients/add', {
      companyId: user.companyId,
      addedBy: user.id,
      statusOptions
    });
  } catch (err) {
    res.status(500).send(err.message);
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
      companyId: user.companyId,
      addedBy: user.id
    });

    await client.save();
    res.redirect('/clients');
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// GET edit form
exports.getEditForm = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).send('Client not found');
    
    const statusOptions = await StatusOption.find({ companyId: client.companyId });
    res.render('clients/edit', { client, statusOptions });
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// POST update client
exports.updateClient = async (req, res) => {
  try {
    await Client.findByIdAndUpdate(req.params.id, {
      name: req.body.name,
      contactNumber: req.body.contactNumber,
      email: req.body.email,
      address: req.body.address,
      meetingDate: req.body.meetingDate,
      notes: req.body.notes,
      status: req.body.status
    });
    res.redirect('/clients');
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// POST delete client
exports.deleteClient = async (req, res) => {
  try {
    const client = await Client.findById(req.params.id);
    if (!client) return res.status(404).send('Client not found');

    if (client.addedBy.toString() !== req.body.userId) {
      return res.status(403).send("You don't have permission to delete this client.");
    }

    await Client.findByIdAndDelete(req.params.id);
    res.redirect('/clients');
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// Download client report
exports.downloadReport = async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};
    
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
    console.error('Error generating report:', error);
    req.flash('error', 'Failed to generate report');
    res.redirect('/clients');
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
