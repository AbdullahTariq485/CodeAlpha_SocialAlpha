const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
    username: { type: String, unique: true, required: true },
    email: { type: String, lowercase: true, trim: true, unique: true, sparse: true, maxlength: 254 },
    usernameChangedAt: { type: Date },
    emailChangedAt: { type: Date },
    password: { type: String, required: true },
    bio: { type: String, default: 'Welcome to my Social Alpha profile!' },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
