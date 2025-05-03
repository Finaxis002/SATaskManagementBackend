const mongoose = require('mongoose');

const taskCodeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
});

module.exports = mongoose.model('TaskCode', taskCodeSchema);
