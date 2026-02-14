const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');
const { clientAddEditRules, handleValidation } = require('../validators/clientValidators');
const asyncHandler = require('../middleware/asyncHandler');

router.use(isAuthenticated);

router.get('/', asyncHandler(clientController.getAllClients));
router.get('/add', asyncHandler(clientController.getAddClientForm));
router.post('/add', clientAddEditRules, handleValidation, asyncHandler(clientController.addClient));
router.get('/edit/:id', asyncHandler(clientController.getEditForm));
router.post('/edit/:id', clientAddEditRules, handleValidation, asyncHandler(clientController.updateClient));
router.post('/delete/:id', asyncHandler(clientController.deleteClient));
router.post('/bulk-update', asyncHandler(clientController.bulkUpdateStatus));
router.post('/bulk-assign', isAdmin, asyncHandler(clientController.bulkAssign));
router.post('/bulk-delete', asyncHandler(clientController.bulkDelete));
router.get('/download-report', asyncHandler(clientController.downloadReport));
router.get('/api/meetings', isAdmin, asyncHandler(clientController.getClientMeetings));
router.get('/:id', asyncHandler(clientController.getClientDetail));

module.exports = router;
