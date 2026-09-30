const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const User = require('./models/user');
const Post = require('./models/Post');
const SupportTicket = require('./models/SupportTicket');
const authenticateToken = require('./middleware');

const app = express();
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, '..', 'frontend')));

const dbConnectionUri = process.env.MONGODB_URI;
const jwtSecretKey = process.env.JWT_SECRET;
const PORT = process.env.PORT || 5000;

if (!dbConnectionUri) {
    console.error('MONGODB_URI is missing. Add it to backend/.env.');
    process.exit(1);
}
if (!jwtSecretKey) {
    console.error('JWT_SECRET is missing. Add it to backend/.env.');
    process.exit(1);
}

function optionalAuthenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return next();
    jwt.verify(token, jwtSecretKey, (err, decodedUser) => {
        if (!err) req.user = decodedUser;
        next();
    });
}

function serializeUser(user, viewerId) {
    return {
        id: user._id.toString(),
        username: user.username,
        bio: user.bio,
        createdAt: user.createdAt,
        followerCount: user.followers.length,
        followingCount: user.following.length,
        isFollowing: user.followers.some((id) => id.toString() === String(viewerId))
    };
}

function serializeCurrentUser(user, viewerId) {
    const cooldownMs = 30 * 24 * 60 * 60 * 1000;
    const changeAvailableAt = (date) => {
        if (!date) return null;
        const availableAt = new Date(date.getTime() + cooldownMs);
        return availableAt > new Date() ? availableAt : null;
    };
    return {
        ...serializeUser(user, viewerId),
        email: user.email || '',
        usernameChangeAvailableAt: changeAvailableAt(user.usernameChangedAt),
        emailChangeAvailableAt: changeAvailableAt(user.emailChangedAt)
    };
}

app.post('/api/auth/register', async (req, res) => {
    const username = typeof req.body.username === 'string' ? req.body.username.trim().toLowerCase() : '';
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    if (!/^[a-z0-9_]{3,20}$/.test(username)) {
        return res.status(400).json({ error: 'Username must be 3-20 letters, numbers, or underscores.' });
    }
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Enter a valid email address.' });
    }
    if (password.length < 8 || password.length > 72) {
        return res.status(400).json({ error: 'Password must be between 8 and 72 characters.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = await User.create({ username, email, password: hashedPassword });
        res.status(201).json({ message: 'Registration successful!', id: newUser._id, username: newUser.username });
    } catch (err) {
        if (err.code === 11000) {
            const field = err.keyPattern && err.keyPattern.email ? 'email address' : 'username';
            return res.status(409).json({ error: `That ${field} is already in use.` });
        }
        res.status(500).json({ error: 'Could not create your account.' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    const identifier = typeof req.body.identifier === 'string'
        ? req.body.identifier.trim().toLowerCase()
        : typeof req.body.username === 'string' ? req.body.username.trim().toLowerCase() : '';
    const password = typeof req.body.password === 'string' ? req.body.password : '';
    try {
        const user = await User.findOne({ $or: [{ username: identifier }, { email: identifier }] });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: 'Username or password is incorrect.' });
        }
        const token = jwt.sign({ id: user._id.toString(), username: user.username }, jwtSecretKey, { expiresIn: '1h' });
        res.json({ token, id: user._id, userId: user._id, username: user.username });
    } catch (err) {
        res.status(500).json({ error: 'Could not log in right now.' });
    }
});

app.get('/api/users/me', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ error: 'Profile not found.' });
        res.json(serializeCurrentUser(user, req.user.id));
    } catch (err) {
        res.status(500).json({ error: 'Could not load your profile.' });
    }
});

app.patch('/api/users/me', authenticateToken, async (req, res) => {
    const hasBio = Object.hasOwn(req.body, 'bio');
    const hasUsername = Object.hasOwn(req.body, 'username');
    const hasEmail = Object.hasOwn(req.body, 'email');
    const hasNewPassword = Object.hasOwn(req.body, 'newPassword');
    if (!hasBio && !hasUsername && !hasEmail && !hasNewPassword) return res.status(400).json({ error: 'No profile changes were supplied.' });

    const bio = typeof req.body.bio === 'string' ? req.body.bio.trim() : null;
    const username = typeof req.body.username === 'string' ? req.body.username.trim().toLowerCase() : null;
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : null;
    const currentPassword = typeof req.body.currentPassword === 'string' ? req.body.currentPassword : '';
    const newPassword = typeof req.body.newPassword === 'string' ? req.body.newPassword : '';
    const cooldownMs = 30 * 24 * 60 * 60 * 1000;

    if (hasBio && (bio === null || bio.length > 160)) return res.status(400).json({ error: 'Bio must be 160 characters or fewer.' });
    if (hasUsername && !/^[a-z0-9_]{3,20}$/.test(username || '')) {
        return res.status(400).json({ error: 'Username must be 3-20 letters, numbers, or underscores.' });
    }
    if (hasEmail && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || ''))) {
        return res.status(400).json({ error: 'Enter a valid email address.' });
    }
    if (hasNewPassword && (newPassword.length < 8 || newPassword.length > 72)) {
        return res.status(400).json({ error: 'New password must be between 8 and 72 characters.' });
    }

    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'Profile not found.' });
        const changesSensitiveSettings = hasUsername || hasEmail || hasNewPassword;
        if (changesSensitiveSettings && (!currentPassword || !(await bcrypt.compare(currentPassword, user.password)))) {
            return res.status(403).json({ error: 'Enter your current password to update account details.' });
        }

        const now = new Date();
        const usernameChanged = hasUsername && username !== user.username;
        if (usernameChanged && user.usernameChangedAt && now - user.usernameChangedAt < cooldownMs) {
            const availableAt = new Date(user.usernameChangedAt.getTime() + cooldownMs);
            return res.status(429).json({ error: 'Username can only be changed once every 30 days.', availableAt });
        }
        const emailChanged = hasEmail && email !== (user.email || '');
        if (emailChanged && user.emailChangedAt && now - user.emailChangedAt < cooldownMs) {
            const availableAt = new Date(user.emailChangedAt.getTime() + cooldownMs);
            return res.status(429).json({ error: 'Email can only be changed once every 30 days.', availableAt });
        }

        if (hasBio) user.bio = bio;
        if (usernameChanged) {
            user.username = username;
            user.usernameChangedAt = now;
        }
        if (emailChanged) {
            user.email = email;
            user.emailChangedAt = now;
        }
        if (hasNewPassword) user.password = await bcrypt.hash(newPassword, 12);
        await user.save();
        if (usernameChanged) await Post.updateMany({ user: user._id }, { $set: { username: user.username } });
        const response = serializeCurrentUser(user, req.user.id);
        if (usernameChanged) {
            response.token = jwt.sign({ id: user._id.toString(), username: user.username }, jwtSecretKey, { expiresIn: '1h' });
        }
        res.json(response);
    } catch (err) {
        if (err.code === 11000) {
            const field = err.keyPattern && err.keyPattern.email ? 'email address' : 'username';
            return res.status(409).json({ error: `That ${field} is already in use.` });
        }
        res.status(500).json({ error: 'Could not update your profile.' });
    }
});

app.get('/api/users/suggestions', authenticateToken, async (req, res) => {
    try {
        const currentUser = await User.findById(req.user.id).select('following');
        if (!currentUser) return res.status(404).json({ error: 'Profile not found.' });
        const excludedIds = [currentUser._id, ...currentUser.following];
        const users = await User.find({ _id: { $nin: excludedIds } })
            .select('username bio followers following createdAt')
            .sort({ createdAt: -1 })
            .limit(5);
        res.json(users.map((user) => serializeUser(user, req.user.id)));
    } catch (err) {
        res.status(500).json({ error: 'Could not load suggestions.' });
    }
});

app.get('/api/users/search', authenticateToken, async (req, res) => {
    const term = typeof req.query.q === 'string' ? req.query.q.trim().slice(0, 30) : '';
    if (term.length < 2) return res.json([]);
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    try {
        const users = await User.find({
            username: { $regex: `^${escapedTerm}`, $options: 'i' },
            _id: { $ne: req.user.id }
        })
            .select('username bio followers following createdAt')
            .sort({ username: 1 })
            .limit(6);
        res.json(users.map((user) => serializeUser(user, req.user.id)));
    } catch (err) {
        res.status(500).json({ error: 'Could not search people.' });
    }
});

app.get('/api/users/:id', authenticateToken, async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid profile id.' });
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) return res.status(404).json({ error: 'Profile not found.' });
        res.json(serializeUser(user, req.user.id));
    } catch (err) {
        res.status(500).json({ error: 'Could not load this profile.' });
    }
});

app.post('/api/support/tickets', authenticateToken, async (req, res) => {
    const category = typeof req.body.category === 'string' ? req.body.category : 'other';
    const subject = typeof req.body.subject === 'string' ? req.body.subject.trim() : '';
    const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
    const validCategories = ['account', 'privacy', 'safety', 'feedback', 'other'];
    if (!validCategories.includes(category)) return res.status(400).json({ error: 'Choose a valid support topic.' });
    if (subject.length < 4 || subject.length > 120 || message.length < 10 || message.length > 3000) {
        return res.status(400).json({ error: 'Add a subject and a message between 10 and 3000 characters.' });
    }
    try {
        const ticket = await SupportTicket.create({
            user: req.user.id,
            username: req.user.username,
            category,
            subject,
            message
        });
        res.status(201).json({ message: 'Your note has been sent to the support inbox.', ticketId: ticket._id });
    } catch (err) {
        res.status(500).json({ error: 'Could not send your support request.' });
    }
});

app.get('/api/posts', optionalAuthenticateToken, async (req, res) => {
    try {
        const query = {};
        if (req.query.scope === 'following') {
            if (!req.user) return res.status(401).json({ error: 'Log in to view your following feed.' });
            const user = await User.findById(req.user.id).select('following');
            if (!user) return res.status(404).json({ error: 'Profile not found.' });
            query.user = { $in: user.following };
        } else if (req.query.author) {
            if (!mongoose.isValidObjectId(req.query.author)) return res.status(400).json({ error: 'Invalid profile id.' });
            query.user = req.query.author;
        }
        const posts = await Post.find(query).sort({ createdAt: -1 }).limit(60);
        res.json(posts.map((post) => ({
            ...post.toObject(),
            isLiked: Boolean(req.user && post.likes.some((id) => id.toString() === req.user.id))
        })));
    } catch (err) {
        res.status(500).json({ error: 'Could not load the feed.' });
    }
});

app.post('/api/posts', authenticateToken, async (req, res) => {
    const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';
    if (!content || content.length > 500) {
        return res.status(400).json({ error: 'Post text must be between 1 and 500 characters.' });
    }
    try {
        const newPost = await Post.create({ user: req.user.id, username: req.user.username, content });
        res.status(201).json(newPost);
    } catch (err) {
        res.status(500).json({ error: 'Could not publish your post.' });
    }
});

app.post('/api/posts/:id/like', authenticateToken, async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid post id.' });
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ error: 'Post not found.' });
        const isLiked = post.likes.some((id) => id.toString() === req.user.id);
        post.likes = isLiked
            ? post.likes.filter((id) => id.toString() !== req.user.id)
            : [...post.likes, req.user.id];
        await post.save();
        res.json({ ...post.toObject(), isLiked: !isLiked, likeCount: post.likes.length });
    } catch (err) {
        res.status(500).json({ error: 'Could not update the like.' });
    }
});

app.post('/api/posts/:id/comment', authenticateToken, async (req, res) => {
    const content = typeof req.body.content === 'string' ? req.body.content.trim() : '';
    if (!content || content.length > 240) {
        return res.status(400).json({ error: 'Comment must be between 1 and 240 characters.' });
    }
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid post id.' });
    try {
        const post = await Post.findById(req.params.id);
        if (!post) return res.status(404).json({ error: 'Post not found.' });
        post.comments.push({ user: req.user.id, username: req.user.username, content });
        await post.save();
        res.json(post);
    } catch (err) {
        res.status(500).json({ error: 'Could not add your comment.' });
    }
});

app.post('/api/users/:id/follow', authenticateToken, async (req, res) => {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'Invalid profile id.' });
    if (req.user.id === req.params.id) return res.status(400).json({ error: 'You cannot follow yourself.' });
    try {
        const [targetUser, currentUser] = await Promise.all([
            User.findById(req.params.id).select('followers'),
            User.findById(req.user.id).select('following')
        ]);
        if (!targetUser || !currentUser) return res.status(404).json({ error: 'Profile not found.' });
        const isFollowing = targetUser.followers.some((id) => id.toString() === req.user.id);
        const targetUpdate = isFollowing
            ? { $pull: { followers: currentUser._id } }
            : { $addToSet: { followers: currentUser._id } };
        const currentUpdate = isFollowing
            ? { $pull: { following: targetUser._id } }
            : { $addToSet: { following: targetUser._id } };
        const [updatedTarget] = await Promise.all([
            User.findByIdAndUpdate(targetUser._id, targetUpdate, { new: true }).select('followers'),
            User.findByIdAndUpdate(currentUser._id, currentUpdate)
        ]);
        res.json({
            message: 'Follow status updated.',
            isFollowing: !isFollowing,
            followerCount: updatedTarget.followers.length
        });
    } catch (err) {
        res.status(500).json({ error: 'Could not update this follow.' });
    }
});

mongoose.connect(dbConnectionUri, { dbName: process.env.MONGODB_DATABASE || 'socialalpha' })
    .then(() => {
        console.log('Connected to MongoDB Atlas.');
        app.listen(PORT, () => console.log(`Social Alpha backend running online at port ${PORT}`));
    })
    .catch((err) => {
        console.error('MongoDB Atlas connection failed:', err.name, err.code || '');
        process.exit(1);
    });
