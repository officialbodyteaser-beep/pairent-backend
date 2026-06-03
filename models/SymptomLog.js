import mongoose from 'mongoose';

const symptomLogSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: true,
    index: true,
  },
  symptoms: [{
    type: String,
  }],
  mood: {
    type: String,
    default: '',
  },
  painLevel: {
    type: Number,
    min: 1,
    max: 10,
    default: 1,
  },
  notes: {
    type: String,
    default: '',
  },
  emergency: {
    type: Boolean,
    default: false,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster queries
symptomLogSchema.index({ userId: 1, date: -1 });

export default mongoose.model('SymptomLog', symptomLogSchema);