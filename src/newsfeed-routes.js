const express = require('express');
const router = express.Router();
const { db, admin } = require('../Firebase/firebase');
const { authenticateToken } = require('../utils/auth');
const logger = require('../utils/logger');

// Create a post
router.post('/posts', authenticateToken, async (req, res) => {
  try {
    const { content, imageUrl } = req.body;
    const userId = req.user.id;
    const post = {
      userId,
      content,
      imageUrl: imageUrl || null,
      createdAt: new Date(),
      likes: [],
      comments: [],
    };
    const docRef = await db.collection('posts').add(post);
    logger.info('Post created successfully', { postId: docRef.id, userId }, req.requestId);
    res.status(201).json({ id: docRef.id, ...post });
  } catch (error) {
    logger.error('Failed to create post', error, req.requestId);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Like a post
router.post('/posts/:postId/like', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const postRef = db.collection('posts').doc(req.params.postId);
    await postRef.update({
      likes: admin.firestore.FieldValue.arrayUnion(userId),
    });
    logger.info('Post liked successfully', { postId: req.params.postId, userId }, req.requestId);
    res.status(200).json({ message: 'Post liked' });
  } catch (error) {
    logger.error('Failed to like post', error, req.requestId);
    res.status(500).json({ error: 'Failed to like post' });
  }
});

// Comment on a post
router.post('/posts/:postId/comment', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { text } = req.body;
    const comment = {
      userId,
      text,
      createdAt: new Date(),
    };
    const postRef = db.collection('posts').doc(req.params.postId);
    await postRef.update({
      comments: admin.firestore.FieldValue.arrayUnion(comment),
    });
    logger.info('Comment added successfully', { postId: req.params.postId, userId }, req.requestId);
    res.status(200).json({ message: 'Comment added' });
  } catch (error) {
    logger.error('Failed to add comment', error, req.requestId);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Get news feed (all posts, newest first)
router.get('/posts', authenticateToken, async (req, res) => {
  try {
    const snapshot = await db.collection('posts').orderBy('createdAt', 'desc').get();
    const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    logger.info('News feed retrieved successfully', { postCount: posts.length }, req.requestId);
    res.status(200).json(posts);
  } catch (error) {
    logger.error('Failed to fetch posts', error, req.requestId);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Update a post
router.put('/posts/:postId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { content, imageUrl } = req.body;
    const postRef = db.collection('posts').doc(req.params.postId);
    const postDoc = await postRef.get();
    if (!postDoc.exists) {
      logger.warn('Post not found for update', { postId: req.params.postId }, req.requestId);
      return res.status(404).json({ error: 'Post not found' });
    }
    const postData = postDoc.data();
    if (postData.userId !== userId) {
      logger.warn('Unauthorized post update attempt', { postId: req.params.postId, userId }, req.requestId);
      return res.status(403).json({ error: 'Unauthorized to update this post' });
    }
    await postRef.update({
      content: content !== undefined ? content : postData.content,
      imageUrl: imageUrl !== undefined ? imageUrl : postData.imageUrl,
    });
    logger.info('Post updated successfully', { postId: req.params.postId, userId }, req.requestId);
    res.status(200).json({ message: 'Post updated' });
  } catch (error) {
    logger.error('Failed to update post', error, req.requestId);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// Delete a post
router.delete('/posts/:postId', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const postRef = db.collection('posts').doc(req.params.postId);
    const postDoc = await postRef.get();
    if (!postDoc.exists) {
      logger.warn('Post not found for deletion', { postId: req.params.postId }, req.requestId);
      return res.status(404).json({ error: 'Post not found' });
    }
    const postData = postDoc.data();
    if (postData.userId !== userId) {
      logger.warn('Unauthorized post deletion attempt', { postId: req.params.postId, userId }, req.requestId);
      return res.status(403).json({ error: 'Unauthorized to delete this post' });
    }
    await postRef.delete();
    logger.info('Post deleted successfully', { postId: req.params.postId, userId }, req.requestId);
    res.status(200).json({ message: 'Post deleted' });
  } catch (error) {
    logger.error('Failed to delete post', error, req.requestId);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

module.exports = router;