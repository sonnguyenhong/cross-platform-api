const mongoose = require('mongoose');

const searchSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Users',
        required: true,
    },
    key: {
        type: String,
        required: true,
        unique: true,
    },
    lastSearchTime: {
        type: Date,
    },
});
// searchSchema.set('timestamps', true);
module.exports = mongoose.model('Search', searchSchema);
