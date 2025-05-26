const StatusOption = require('../models/StatusOption');

// Get admin dashboard
exports.getDashboard = async (req, res) => {
    try {
        res.render('admin/dashboard');
    } catch (err) {
        res.status(500).send(err.message);
    }
};

// Get status options management page
exports.getStatusOptions = async (req, res) => {
    try {
        const statusOptions = await StatusOption.find({ companyId: req.session.user.companyId })
            .populate('createdBy', 'name');
        res.render('admin/status-options', { statusOptions });
    } catch (err) {
        res.status(500).send(err.message);
    }
}; 