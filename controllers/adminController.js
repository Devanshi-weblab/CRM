const StatusOption = require('../models/StatusOption');
const User = require('../models/User');
const Client = require('../models/Client');

// Get admin dashboard
exports.getDashboard = async (req, res, next) => {
    try {
        const companyId = req.session.user.companyId;
        const totalEmployees = await User.countDocuments({ companyId, role: 'employee' });
        const totalClients = await Client.countDocuments({ companyId });
        res.render('admin/admin-dashboard', {
            user: req.session.user,
            totalEmployees,
            totalClients
        });
    } catch (err) {
        next(err);
    }
};

// Get status options management page
exports.getStatusOptions = async (req, res, next) => {
    try {
        const sortBy = req.query.sort === 'name' ? 'name' : 'createdAt';
        const sortOrder = req.query.order === 'asc' ? 1 : -1;
        const sortObj = sortBy === 'name' ? { name: sortOrder } : { createdAt: -1 };
        const statusOptions = await StatusOption.find({ companyId: req.session.user.companyId })
            .populate('createdBy', 'name')
            .sort(sortObj);
        const buildQuery = (overrides = {}) => {
            const params = { ...req.query, ...overrides };
            const s = Object.entries(params).filter(([, v]) => v != null && v !== '').map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
            return s ? '?' + s : '';
        };
        res.render('admin/status-options', {
            pageTitle: 'Manage Status Options',
            statusOptions,
            sortBy,
            sortOrder: sortOrder === 1 ? 'asc' : 'desc',
            buildQuery
        });
    } catch (err) {
        next(err);
    }
}; 