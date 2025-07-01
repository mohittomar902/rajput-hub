const express = require('express');
const router = express.Router();
const { db } = require('../Firebase/firebase');
const logger = require('../utils/logger');
const ResponseHandler = require('../utils/responseHandler');

// Add a new history record
router.post('/set-data', async (req, res) => {
  try {
    const data = req.body;
    if (!data || !data.slug) {
      logger.warn('Missing slug in history POST', { body: data }, req.requestId);
      return ResponseHandler.badRequest(res, 'Slug is required');
    }
    await db.collection('history').doc(data.slug).set(data);
    logger.info('History record created', { slug: data.slug }, req.requestId);
    return ResponseHandler.success(res, data, 'History record created', 201);
  } catch (error) {
    logger.error('Failed to create history record', error, req.requestId);
    return ResponseHandler.error(res, 'Failed to create history record');
  }
});

// Get a history record by slug
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const doc = await db.collection('history').doc(slug).get();
    if (!doc.exists) {
      logger.warn('History page not found', { slug }, req.requestId);
      return ResponseHandler.pageNotFound(res, 'History page not found');
    }
    logger.info('History record retrieved', { slug }, req.requestId);
    return ResponseHandler.success(res, doc.data(), 'History record retrieved');
  } catch (error) {
    logger.error('Failed to fetch history record', error, req.requestId);
    return ResponseHandler.error(res, 'Failed to fetch history record');
  }
});

module.exports = router;
