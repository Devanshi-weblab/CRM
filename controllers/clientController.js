const Client = require('../models/Client');
const StatusOption = require('../models/StatusOption');

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

    const clients = await Client.find(query)
      .populate('addedBy', 'name')
      .populate('status', 'name color');

    res.render('clients/list', { 
      clients,
      statusOptions,
      selectedStatus: req.query.status || ''
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
