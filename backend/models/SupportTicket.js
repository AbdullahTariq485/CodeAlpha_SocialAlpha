const mongoose = require('mongoose');

const SupportTicketSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    username: { type: String, required: true, maxlength: 20 },
    category: { type: String, enum: ['account', 'privacy', 'safety', 'feedback', 'other'], default: 'other' },
    subject: { type: String, required: true, trim: true, maxlength: 120 },
    message: { type: String, required: true, trim: true, maxlength: 3000 },
    status: { type: String, enum: ['open', 'in-progress', 'closed'], default: 'open' }
}, { timestamps: true });

module.exports = mongoose.model('SupportTicket', SupportTicketSchema);
