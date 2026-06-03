// models/ChatMessage.js
import mongoose from 'mongoose';

const chatMessageSchema = new mongoose.Schema({
  chatId: {
    type: String,
    required: true,
    index: true
  },
  sender: {
    type: String,
    required: true
  },
  receiver: {
    type: String,
    required: true
  },
  text: {
    type: String,
    default: ''
  },
  image: {
    type: String,
    default: null
  },
  type: {
    type: String,
    enum: ['text', 'image'],
    default: 'text'
  },
  read: {
    type: Boolean,
    default: false
  },
  timestamp: {
    type: Date,
    default: Date.now
  }
});

// Create compound indexes for faster queries
chatMessageSchema.index({ chatId: 1, timestamp: 1 });
chatMessageSchema.index({ receiver: 1, read: 1 });
chatMessageSchema.index({ sender: 1, timestamp: 1 });

const ChatMessage = mongoose.model('ChatMessage', chatMessageSchema);

export default ChatMessage;