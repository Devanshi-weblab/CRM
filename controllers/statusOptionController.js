const StatusOption = require('../models/StatusOption');

// GET all status options for a company
exports.getStatusOptions = async (req, res) => {
  try {
    const statusOptions = await StatusOption.find({ companyId: req.session.user.companyId });
    res.json(statusOptions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST create new status option
exports.createStatusOption = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    const statusOption = new StatusOption({
      name: req.body.name,
      companyId: user.companyId,
      createdBy: user.id
    });

    await statusOption.save();
    res.json(statusOption);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE status option
exports.deleteStatusOption = async (req, res) => {
  try {
    const user = req.session.user;
    if (!user) return res.status(401).json({ error: 'Not authenticated' });

    const statusOption = await StatusOption.findOne({
      _id: req.params.id,
      companyId: user.companyId
    });

    if (!statusOption) {
      return res.status(404).json({ error: 'Status option not found' });
    }

    await statusOption.remove();
    res.json({ message: 'Status option deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}; 