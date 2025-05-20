const express = require('express');
const router = express.Router();
const clientController = require('../controllers/clientController');

router.get('/', clientController.getAllClients);
router.get('/add', clientController.getAddClientForm);
router.post('/add', clientController.addClient);
router.get('/edit/:id', clientController.getEditForm);
router.post('/edit/:id', clientController.updateClient);
router.post('/delete/:id', clientController.deleteClient);

module.exports = router;
