const Client = require('../models/Client');

// GET all clients
exports.getAllClients = async (req, res) => {
  try {
    const clients = await Client.find().populate('addedBy', 'name');
    res.render('clients/index', { clients });
  } catch (err) {
    res.status(500).send(err.message);
  }
};

// GET form to add client
exports.getAddClientForm = (req, res) => {
  res.render('clients/add');
};

// POST add client
exports.addClient = async (req, res) => {
  try {
    const client = new Client({
      name: req.body.name,
      contactNumber: req.body.contactNumber,
      email: req.body.email,
      address: req.body.address,
      meetingDate: req.body.meetingDate,
      notes: req.body.notes,
      companyId: req.body.companyId,
      addedBy: req.body.addedBy
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
    res.render('clients/edit', { client });
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
      notes: req.body.notes
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
