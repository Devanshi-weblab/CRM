const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');
const { isAuthenticated, isAdmin } = require('../middleware/auth');

router.get('/', clientController.getAllClients);
router.get('/add', clientController.getAddClientForm);
router.post('/add', clientController.addClient);
router.get('/edit/:id', clientController.getEditForm);
router.post('/edit/:id', clientController.updateClient);
router.post('/delete/:id', clientController.deleteClient);

// Download client report
router.get('/download-report', isAuthenticated, clientController.downloadReport);

// Get client meetings for calendar
router.get('/api/meetings', isAuthenticated, isAdmin, clientController.getClientMeetings);

module.exports = router;
