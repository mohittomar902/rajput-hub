const express = require('express');
const router = express.Router();
const { db, admin } = require('../Firebase/firebase');
const { authenticateToken } = require('../utils/auth');

// Create a post
router.post('/posts', authenticateToken, async (req, res) => {
  try {
    const { content, imageUrl } = req.body;
    const username = req.user.username;
    const post = {
      username,
      content,
      imageUrl: imageUrl || null,
      createdAt: new Date(),
      likes: [],
      comments: [],
    };
    const docRef = await db.collection('posts').add(post);
    console.log(docRef, username);
    res.status(201).json({ id: docRef.id, ...post });
  } catch (error) {
    console.error(req.requestId, error);
    res.status(500).json({ error: 'Failed to create post' });
  }
});

// Like a post
router.post('/posts/:postId/like', authenticateToken, async (req, res) => {
  try {
    const username = req.user.username;
    const postRef = db.collection('posts').doc(req.params.postId);
    await postRef.update({
      likes: admin.firestore.FieldValue.arrayUnion(username),
    });
    res.status(200).json({ message: 'Post liked' });
  } catch (error) {
    console.error(req.requestId, error);
    res.status(500).json({ error: 'Failed to like post' });
  }
});

// Comment on a post
router.post('/posts/:postId/comment', authenticateToken, async (req, res) => {
  try {
    const username = req.user.username;
    const { text } = req.body;
    const comment = {
      username,
      text,
      createdAt: new Date(),
    };
    const postRef = db.collection('posts').doc(req.params.postId);
    await postRef.update({
      comments: admin.firestore.FieldValue.arrayUnion(comment),
    });
    res.status(200).json({ message: 'Comment added' });
  } catch (error) {
    console.error(req.requestId, error);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// Get news feed (all posts, newest first)
router.get('/posts', authenticateToken, async (req, res) => {
  try {
    const snapshot = await db.collection('posts').orderBy('createdAt', 'desc').get();
    const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.status(200).json(posts);
  } catch (error) {
    console.error(req.requestId, error);
    res.status(500).json({ error: 'Failed to fetch posts' });
  }
});

// Update a post
router.put('/posts/:postId', authenticateToken, async (req, res) => {
  try {
    const username = req.user.username;
    const { content, imageUrl } = req.body;
    const postRef = db.collection('posts').doc(req.params.postId);
    const postDoc = await postRef.get();
    if (!postDoc.exists) {
      return res.status(404).json({ error: 'Post not found' });
    }
    const postData = postDoc.data();
    if (postData.username !== username) {
      return res.status(403).json({ error: 'Unauthorized to update this post' });
    }
    await postRef.update({
      content: content !== undefined ? content : postData.content,
      imageUrl: imageUrl !== undefined ? imageUrl : postData.imageUrl,
    });
    res.status(200).json({ message: 'Post updated' });
  } catch (error) {
    console.error(req.requestId, error);
    res.status(500).json({ error: 'Failed to update post' });
  }
});

// Delete a post
router.delete('/posts/:postId', authenticateToken, async (req, res) => {
  try {
    const username = req.user.username;
    const postRef = db.collection('posts').doc(req.params.postId);
    const postDoc = await postRef.get();
    console.log(req?.requestId, postDoc);
    if (!postDoc.exists) {
      return res.status(404).json({ error: 'Post not found' });
    }
    const postData = postDoc.data();
    if (postData.username !== username) {
      return res.status(403).json({ error: 'Unauthorized to delete this post' });
    }
    await postRef.delete();
    res.status(200).json({ message: 'Post deleted' });
  } catch (error) {
    console.error(req.requestId, error);
    res.status(500).json({ error: 'Failed to delete post' });
  }
});

module.exports = router;