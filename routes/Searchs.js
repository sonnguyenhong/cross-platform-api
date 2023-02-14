const searchController = require('../controllers/Searchs');
const { asyncWrapper } = require('../utils/asyncWrapper');
const express = require('express');
const searchRoutes = express.Router();
const auth = require('../middlewares/auth');

searchRoutes.get('/search-by-key/:key', auth, asyncWrapper(searchController.search));

searchRoutes.get('/history', auth, asyncWrapper(searchController.getSearchHistoryKeys));

searchRoutes.post('/delete-key', auth, asyncWrapper(searchController.deleteSearchHistoryKey));
module.exports = searchRoutes;
