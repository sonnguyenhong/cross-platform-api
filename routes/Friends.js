const friendController = require('../controllers/Friends');
const { asyncWrapper } = require('../utils/asyncWrapper');
const express = require('express');
const friendsRoutes = express.Router();
const ValidationMiddleware = require('../middlewares/validate');
const auth = require('../middlewares/auth');

friendsRoutes.post('/set-request-friend', auth, friendController.setRequest);
friendsRoutes.post('/get-requested-friend', auth, friendController.getRequest);
friendsRoutes.post('/set-accept', auth, friendController.setAccept);
friendsRoutes.post('/cancel-request', auth, friendController.cancelRequest);
friendsRoutes.post('/set-remove', auth, friendController.setRemoveFriend);
friendsRoutes.post('/list', auth, friendController.listFriends);
friendsRoutes.get('/list_suggested', auth, friendController.listSuggested);
friendsRoutes.get('/list_requests', auth, friendController.listRequests);
friendsRoutes.get('/status/:friendId', auth, friendController.friendStatus);
friendsRoutes.get('/list_block', auth, friendController.listBlocks);

module.exports = friendsRoutes;
