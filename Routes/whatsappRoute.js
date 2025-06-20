//whatsappRoute.js

const express = require('express');
const router = express.Router();
const whatsapp = require('../whatsapp');

router.get('/chats', whatsapp.getChats);
router.get('/contacts', whatsapp.getContacts);
router.get('/messages/:chatId', whatsapp.getMessages);
router.post('/send', whatsapp.sendMessage);
router.get('/status', whatsapp.getStatus);


module.exports = router;
