import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    default: "general"
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  detail: {
    type: String,
    default: ""
  },
  time: {
    type: String,
    default: "Just now"
  },
  read: {
    type: Boolean,
    default: false
  },
  icon: {
    type: String,
    default: "bell"
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create indexes for faster queries
notificationSchema.index({ email: 1, createdAt: -1 });
notificationSchema.index({ email: 1, read: 1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;