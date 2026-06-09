import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";

import authRoutes from "./routes/authRoutes.js";
import profileRoutes from "./routes/profileRoutes.js";
import inviteRoutes from "./routes/inviteRoutes.js";
import SymptomLog from "./models/SymptomLog.js";
import User from "./models/User.js";
import ChatMessage from "./models/ChatMessage.js";
import Notification from "./models/Notification.js";

dotenv.config();

const app = express();

// Allow larger image uploads
app.use(cors());
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ limit: "20mb", extended: true }));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/invite", inviteRoutes);

// ========== NOTIFICATION HELPER FUNCTION ==========
const addNotification = async (email, title, message, detail, type, icon) => {
  try {
    console.log(`📝 Creating notification for ${email}: ${title}`);
    
    const newNotification = new Notification({
      email,
      type: type || "general",
      title,
      message,
      detail: detail || "",
      time: "Just now",
      read: false,
      icon: icon || "bell",
      createdAt: new Date()
    });
    
    await newNotification.save();
    console.log(`✅ Notification added for ${email}: ${title}, ID: ${newNotification._id}`);
    return newNotification;
  } catch (error) {
    console.error("❌ Error adding notification:", error);
    return null;
  }
};

// ========== BABY SIZE HELPER FUNCTION (Matching frontend) ==========
const getBabySizeByWeek = (week) => {
  const babySizes = {
    4: "Poppy seed", 5: "Sesame seed", 6: "Lentil", 7: "Blueberry",
    8: "Raspberry", 9: "Grape", 10: "Strawberry", 11: "Fig",
    12: "Lime", 13: "Plum", 14: "Lemon", 15: "Apple",
    16: "Avocado", 17: "Turnip", 18: "Bell pepper", 19: "Pomegranate",
    20: "Banana", 21: "Mango", 22: "Sweet potato", 23: "Grapefruit",
    24: "Cantaloupe", 25: "Acorn squash", 26: "Spaghetti squash",
    27: "Cauliflower", 28: "Eggplant", 29: "Butternut squash",
    30: "Large cabbage", 31: "Coconut", 32: "Papaya", 33: "Pineapple",
    34: "Cantaloupe", 35: "Honeydew melon", 36: "Romaine lettuce",
    37: "Swiss chard", 38: "Mini watermelon", 39: "Pumpkin", 40: "Watermelon"
  };
  return babySizes[week] || "Growing baby";
};

// ========== BABY LENGTH HELPER (Matching frontend) ==========
const getBabyLengthByWeek = (week) => {
  const babyLengths = {
    11: 4.1, 12: 5.4, 13: 6.7, 14: 8.0,
    15: 9.3, 16: 10.6, 17: 11.9, 18: 13.2,
    19: 14.5, 20: 15.8, 21: 17.1, 22: 18.4,
    23: 19.7, 24: 21.0, 25: 22.3, 26: 23.6,
    27: 24.9, 28: 26.2, 29: 27.5, 30: 28.8,
    31: 30.1, 32: 31.4, 33: 32.7, 34: 34.0,
    35: 35.3, 36: 36.6, 37: 37.9, 38: 39.2,
    39: 40.5, 40: 41.8
  };
  const length = babyLengths[week];
  if (length) return length.toFixed(1);
  
  const weeks = Object.keys(babyLengths).map(Number);
  const closest = weeks.reduce((prev, curr) => {
    return Math.abs(curr - week) < Math.abs(prev - week) ? curr : prev;
  });
  return babyLengths[closest]?.toFixed(1) || "5.4";
};

// ========== BABY WEIGHT HELPER (Matching frontend) ==========
const getBabyWeightByWeek = (week) => {
  const babyWeights = {
    11: 7, 12: 14, 13: 23, 14: 43,
    15: 70, 16: 100, 17: 140, 18: 190,
    19: 240, 20: 300, 21: 360, 22: 430,
    23: 500, 24: 600, 25: 700, 26: 800,
    27: 900, 28: 1000, 29: 1100, 30: 1300,
    31: 1500, 32: 1700, 33: 1900, 34: 2100,
    35: 2300, 36: 2500, 37: 2700, 38: 2900,
    39: 3100, 40: 3400
  };
  const weight = babyWeights[week];
  if (weight) return weight;
  
  const weeks = Object.keys(babyWeights).map(Number);
  const closest = weeks.reduce((prev, curr) => {
    return Math.abs(curr - week) < Math.abs(prev - week) ? curr : prev;
  });
  return babyWeights[closest] || "14";
};

// ========== CALCULATE PREGNANCY DATA HELPER ==========
const calculatePregnancyData = (dueDate) => {
  if (!dueDate) {
    return {
      currentWeek: 14,
      daysLeft: 182,
      trimester: "Second Trimester",
      babySize: "Lemon",
      babyLength: "8.0",
      babyWeight: "43"
    };
  }
  
  const due = new Date(dueDate);
  const today = new Date();
  const totalDays = 280;
  const daysRemaining = Math.ceil((due - today) / (1000 * 60 * 60 * 24));
  const daysPregnant = totalDays - daysRemaining;
  let currentWeek = Math.floor(daysPregnant / 7);
  
  if (currentWeek < 1) currentWeek = 1;
  if (currentWeek > 40) currentWeek = 40;
  
  let trimester = "Second Trimester";
  if (currentWeek <= 12) trimester = "First Trimester";
  else if (currentWeek <= 27) trimester = "Second Trimester";
  else trimester = "Third Trimester";
  
  const daysLeft = daysRemaining > 0 ? daysRemaining : 0;
  const babySize = getBabySizeByWeek(currentWeek);
  const babyLength = getBabyLengthByWeek(currentWeek);
  const babyWeight = getBabyWeightByWeek(currentWeek);
  
  return {
    currentWeek,
    daysLeft,
    trimester,
    babySize,
    babyLength,
    babyWeight
  };
};

// ========== CHANGE PASSWORD ROUTE ==========
app.post("/api/auth/change-password", async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    
    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: "Email, current password, and new password are required" 
      });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: "New password must be at least 6 characters long" 
      });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Current password is incorrect" });
    }
    
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    user.password = hashedPassword;
    await user.save();
    
    await addNotification(
      email,
      "Password Changed",
      "Your password was successfully changed",
      "If this wasn't you, please contact support immediately",
      "security",
      "shield"
    );
    
    console.log(`✅ Password changed for ${email}`);
    
    res.json({ 
      success: true, 
      message: "Password changed successfully" 
    });
    
  } catch (error) {
    console.error("❌ Error changing password:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== USER PREFERENCES ROUTES ==========
app.get("/api/profile/language/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email });
    if (user) {
      res.json({ success: true, language: user.language || 'en' });
    } else {
      res.json({ success: true, language: 'en' });
    }
  } catch (error) {
    console.error("❌ Error fetching language:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put("/api/profile/language", async (req, res) => {
  try {
    const { email, language } = req.body;
    await User.findOneAndUpdate({ email }, { language });
    console.log(`✅ Language updated to ${language} for ${email}`);
    res.json({ success: true });
  } catch (error) {
    console.error("❌ Error saving language:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put("/api/profile/preferences", async (req, res) => {
  try {
    const { email, notifications } = req.body;
    const updateData = {};
    if (notifications !== undefined) updateData.notifications = notifications;
    await User.findOneAndUpdate({ email }, updateData);
    console.log(`✅ Preferences updated for ${email}`);
    res.json({ success: true });
  } catch (error) {
    console.error("❌ Error saving preferences:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== PARTNER CONNECTION ROUTES ==========
app.post("/api/partner/generate-code", async (req, res) => {
  try {
    const { email } = req.body;
    const inviteCode = "PAIRENT-" + Math.random().toString(36).substring(2, 10).toUpperCase();
    
    const user = await User.findOneAndUpdate(
      { email },
      { inviteCode },
      { new: true }
    );
    
    if (user) {
      console.log(`✅ Invite code generated for ${email}: ${inviteCode}`);
      res.json({ success: true, inviteCode });
    } else {
      res.json({ success: false, error: "User not found" });
    }
  } catch (error) {
    console.error("❌ Error generating invite code:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/partner/connect", async (req, res) => {
  try {
    const { email, inviteCode, role } = req.body;
    
    console.log("🔗 Partner connection attempt:", { email, inviteCode, role });
    
    if (role === "partner") {
      const mother = await User.findOne({ inviteCode });
      if (!mother) {
        return res.status(404).json({ success: false, error: "Invalid invite code" });
      }
      
      const partner = await User.findOne({ email });
      if (!partner) {
        return res.status(404).json({ success: false, error: "Partner not found" });
      }
      
      mother.linkedPartner = partner._id;
      partner.linkedPartner = mother._id;
      
      await mother.save();
      await partner.save();
      
      console.log("✅ Partners connected:", mother.email, "<=>", partner.email);
      
      res.json({ 
        success: true, 
        partnerName: mother.fullName,
        message: "Successfully connected!"
      });
    } else {
      const mother = await User.findOne({ email });
      if (!mother) {
        return res.status(404).json({ success: false, error: "Mother not found" });
      }
      
      const partner = await User.findOne({ inviteCode });
      if (!partner) {
        return res.status(404).json({ success: false, error: "Invalid partner invite code" });
      }
      
      mother.linkedPartner = partner._id;
      partner.linkedPartner = mother._id;
      
      await mother.save();
      await partner.save();
      
      res.json({ 
        success: true, 
        partnerName: partner.fullName,
        message: "Successfully connected!"
      });
    }
  } catch (error) {
    console.error("❌ Connection error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/partner/disconnect", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    
    if (user.linkedPartner) {
      const partner = await User.findById(user.linkedPartner);
      if (partner) {
        partner.linkedPartner = null;
        await partner.save();
      }
      user.linkedPartner = null;
      await user.save();
    }
    
    res.json({ success: true, message: "Disconnected successfully" });
  } catch (error) {
    console.error("❌ Error disconnecting:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== PARTNER/MOTHER DATA ROUTE - USING REAL DATA ==========
app.get("/api/partner/mother/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const partner = await User.findOne({ email });
    
    if (!partner || partner.role !== 'partner') {
      return res.status(400).json({ success: false, error: "Not a partner account" });
    }
    
    if (!partner.linkedPartner) {
      return res.json({ success: true, mother: null, connected: false });
    }
    
    const mother = await User.findById(partner.linkedPartner);
    if (!mother) {
      return res.json({ success: true, mother: null, connected: false });
    }
    
    // Calculate REAL pregnancy data from mother's due date
    const dueDate = mother.pregnancy?.dueDate;
    const pregnancyData = calculatePregnancyData(dueDate);
    
    // Get symptom count
    const symptomsCount = await SymptomLog.countDocuments({ userId: mother.email });
    
    res.json({
      success: true,
      mother: {
        name: mother.fullName,
        currentWeek: pregnancyData.currentWeek,
        trimester: pregnancyData.trimester,
        daysLeft: pregnancyData.daysLeft,
        dueDate: dueDate ? new Date(dueDate).toLocaleDateString() : "Not set",
        babySize: pregnancyData.babySize,
        babyLength: `${pregnancyData.babyLength} cm`,
        babyWeight: `${pregnancyData.babyWeight} g`,
        symptomsCount: symptomsCount,
        mood: "Happy",
        pregnancy: mother.pregnancy // Include full pregnancy data for multiples
      },
      connected: true
    });
  } catch (error) {
    console.error("❌ Error fetching mother data:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/partner/connection/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.json({ success: true, connected: false });
    }
    
    const isConnected = user.linkedPartner !== null;
    let partnerName = "";
    
    if (isConnected && user.linkedPartner) {
      const partner = await User.findById(user.linkedPartner);
      partnerName = partner?.fullName || "";
    }
    
    res.json({ success: true, connected: isConnected, partnerName });
  } catch (error) {
    console.error("❌ Error checking connection:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== PARTNER ROUTES ==========
app.get("/api/partner/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email });
    
    let partnerData = { name: "Partner", email: "" };
    let pregnancyData = {};
    
    if (user && user.pregnancy) {
      pregnancyData = user.pregnancy;
    }
    
    if (user && user.linkedPartner) {
      const partner = await User.findById(user.linkedPartner);
      if (partner) {
        partnerData = { name: partner.fullName, email: partner.email };
      }
    }
    
    res.json({ success: true, partner: partnerData, pregnancy: pregnancyData });
  } catch (error) {
    console.error("❌ Error fetching partner data:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== CHAT ROUTES ==========
app.post("/api/chat/send", async (req, res) => {
  try {
    const { email, message } = req.body;
    
    if (!email || !message) {
      return res.status(400).json({ success: false, error: "Email and message are required" });
    }
    
    const user = await User.findOne({ email });
    if (!user || !user.linkedPartner) {
      return res.status(400).json({ success: false, error: "No partner connected" });
    }
    
    const partner = await User.findById(user.linkedPartner);
    if (!partner) {
      return res.status(400).json({ success: false, error: "Partner not found" });
    }
    
    const chatId = [email, partner.email].sort().join('-');
    
    const newMessage = new ChatMessage({
      chatId,
      sender: email,
      receiver: partner.email,
      text: message,
      read: false,
      timestamp: new Date()
    });
    
    await newMessage.save();
    
    await addNotification(
      partner.email,
      "New Message",
      `${user.fullName || user.email} sent you a message`,
      message.substring(0, 50) + (message.length > 50 ? "..." : ""),
      "chat",
      "message-circle"
    );
    
    res.json({ success: true, message: newMessage });
  } catch (error) {
    console.error("❌ Error sending message:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/chat/send-image", async (req, res) => {
  try {
    const { email, image, message } = req.body;
    
    if (!email || !image) {
      return res.status(400).json({ success: false, error: "Email and image are required" });
    }
    
    const user = await User.findOne({ email });
    if (!user || !user.linkedPartner) {
      return res.status(400).json({ success: false, error: "No partner connected" });
    }
    
    const partner = await User.findById(user.linkedPartner);
    if (!partner) {
      return res.status(400).json({ success: false, error: "Partner not found" });
    }
    
    const chatId = [email, partner.email].sort().join('-');
    
    const newMessage = new ChatMessage({
      chatId,
      sender: email,
      receiver: partner.email,
      text: message || "📷 Sent an image",
      image: image,
      type: 'image',
      read: false,
      timestamp: new Date()
    });
    
    await newMessage.save();
    
    await addNotification(
      partner.email,
      "New Image",
      `${user.fullName || user.email} sent you an image`,
      "Tap to view",
      "chat",
      "image"
    );
    
    res.json({ success: true, message: newMessage });
  } catch (error) {
    console.error("❌ Error sending image:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/chat/messages/:email", async (req, res) => {
  try {
    const { email } = req.params;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ success: true, messages: [] });
    }
    
    if (!user.linkedPartner) {
      return res.json({ success: true, messages: [] });
    }
    
    const partner = await User.findById(user.linkedPartner);
    if (!partner) {
      return res.json({ success: true, messages: [] });
    }
    
    const chatId = [email, partner.email].sort().join('-');
    
    const messages = await ChatMessage.find({ chatId })
      .sort({ timestamp: 1 })
      .limit(100);
    
    const formattedMessages = messages.map(msg => ({
      id: msg._id,
      sender: msg.sender === email ? "You" : partner.fullName || partner.email,
      text: msg.text,
      image: msg.image || null,
      type: msg.type || 'text',
      timestamp: new Date(msg.timestamp).toLocaleTimeString(),
      isMe: msg.sender === email
    }));
    
    res.json({ success: true, messages: formattedMessages });
  } catch (error) {
    console.error("❌ Error fetching messages:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put("/api/chat/mark-read/:email", async (req, res) => {
  try {
    const { email } = req.params;
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, error: "User not found" });
    }
    
    if (!user.linkedPartner) {
      return res.json({ success: true });
    }
    
    const partner = await User.findById(user.linkedPartner);
    const chatId = [email, partner.email].sort().join('-');
    
    const result = await ChatMessage.updateMany(
      { chatId, receiver: email, read: false },
      { read: true }
    );
    
    console.log(`✅ Marked ${result.modifiedCount} messages as read for ${email}`);
    
    res.json({ success: true });
  } catch (error) {
    console.error("❌ Error marking messages as read:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/chat/unread/:email", async (req, res) => {
  try {
    const { email } = req.params;
    
    const user = await User.findOne({ email });
    if (!user || !user.linkedPartner) {
      return res.json({ success: true, count: 0 });
    }
    
    const partner = await User.findById(user.linkedPartner);
    const chatId = [email, partner.email].sort().join('-');
    
    const unreadCount = await ChatMessage.countDocuments({
      chatId,
      receiver: email,
      read: false
    });
    
    res.json({ success: true, count: unreadCount });
  } catch (error) {
    console.error("❌ Error fetching unread count:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete("/api/chat/delete/:messageId", async (req, res) => {
  try {
    const { messageId } = req.params;
    const { email } = req.body;
    
    const message = await ChatMessage.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, error: "Message not found" });
    }
    
    if (message.sender !== email) {
      return res.status(403).json({ success: false, error: "You can only delete your own messages" });
    }
    
    await ChatMessage.findByIdAndDelete(messageId);
    
    res.json({ success: true, message: "Message deleted" });
  } catch (error) {
    console.error("❌ Error deleting message:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== NOTIFICATION ROUTES ==========

app.get("/api/notifications/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const notifications = await Notification.find({ email })
      .sort({ createdAt: -1 })
      .limit(50);
    
    res.json({ success: true, notifications });
  } catch (error) {
    console.error("❌ Error fetching notifications:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put("/api/notifications/read/:id", async (req, res) => {
  try {
    const { id } = req.params;
    await Notification.findByIdAndUpdate(id, { read: true });
    res.json({ success: true });
  } catch (error) {
    console.error("❌ Error marking notification as read:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put("/api/notifications/read-all/:email", async (req, res) => {
  try {
    const { email } = req.params;
    await Notification.updateMany({ email, read: false }, { read: true });
    res.json({ success: true });
  } catch (error) {
    console.error("❌ Error marking all as read:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put("/api/notifications/clear-chat/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const result = await Notification.updateMany(
      { email, type: 'chat', read: false },
      { read: true }
    );
    console.log(`✅ Cleared ${result.modifiedCount} chat notifications for ${email}`);
    res.json({ success: true });
  } catch (error) {
    console.error("❌ Error clearing chat notifications:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/notifications/force-clear/:email", async (req, res) => {
  try {
    const { email } = req.params;
    await Notification.updateMany({ email, read: false }, { read: true });
    console.log(`✅ Force cleared all notifications for ${email}`);
    res.json({ success: true, count: 0 });
  } catch (error) {
    console.error("❌ Error force clearing notifications:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Debug endpoint - delete all notifications for a user
app.post("/api/notifications/debug-clear/:email", async (req, res) => {
  try {
    const { email } = req.params;
    
    const result = await Notification.deleteMany({ email });
    
    console.log(`✅ Deleted ${result.deletedCount} notifications for ${email}`);
    
    res.json({ 
      success: true, 
      deletedCount: result.deletedCount,
      message: `Deleted ${result.deletedCount} notifications`
    });
  } catch (error) {
    console.error("❌ Error clearing notifications:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/notifications/add", async (req, res) => {
  try {
    const { email, title, message, detail, type, icon } = req.body;
    const newNotification = await addNotification(email, title, message, detail, type, icon);
    res.json({ success: true, notification: newNotification });
  } catch (error) {
    console.error("❌ Error adding notification:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== SYMPTOM ROUTES ==========
app.post("/api/symptoms", async (req, res) => {
  try {
    const { userId, symptoms, mood, painLevel, notes, emergency, date } = req.body;
    
    const symptomLog = new SymptomLog({
      userId: userId || "guest",
      symptoms: symptoms || [],
      mood: mood || "",
      painLevel: painLevel || 1,
      notes: notes || "",
      emergency: emergency || false,
      date: date || new Date(),
    });
    
    await symptomLog.save();
    console.log(`✅ Symptom log saved for user: ${symptomLog.userId}`);
    
    if (userId && symptoms && symptoms.length > 0) {
      const symptomList = symptoms.slice(0, 2).join(", ");
      const moreText = symptoms.length > 2 ? "..." : "";
      await addNotification(
        userId,
        "Symptom Logged",
        `You logged ${symptomList}${moreText}`,
        `Pain level: ${painLevel}/10 | Mood: ${mood || "Not specified"}`,
        "symptom",
        "alert"
      );
    }
    
    res.json({ success: true, log: symptomLog });
  } catch (error) {
    console.error("❌ Error saving symptom:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/symptoms/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const logs = await SymptomLog.find({ userId }).sort({ date: -1 });
    res.json({ success: true, logs });
  } catch (error) {
    console.error("❌ Error fetching symptoms:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get("/api/symptoms/recent/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const logs = await SymptomLog.find({ userId, date: { $gte: sevenDaysAgo } }).sort({ date: -1 });
    res.json({ success: true, logs });
  } catch (error) {
    console.error("❌ Error fetching recent symptoms:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete("/api/symptoms/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await SymptomLog.findByIdAndDelete(id);
    if (deleted) {
      res.json({ success: true, message: "Symptom log deleted" });
    } else {
      res.status(404).json({ success: false, error: "Log not found" });
    }
  } catch (error) {
    console.error("❌ Error deleting symptom:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== TIMELINE DATABASE ==========
const timelineDatabase = {
  1: {
    week: 1,
    title: "Week 1: Preparing for Conception",
    description: "This week marks the beginning of your menstrual cycle...",
    babySize: "Pre-conception",
    symptoms: ["Menstrual bleeding", "Mild cramps", "Hormonal changes", "Energy fluctuations"],
    tip: "Start taking folic acid supplements and maintain a healthy diet",
    image: "/timeline/week1.png",
    imageAlt: "Week 1 - Preparing for conception",
    searchQuery: "week 1 pregnancy conception preparation"
  },
  40: {
    week: 40,
    title: "Week 40",
    description: "If you're past your due date...",
    babySize: "Watermelon",
    symptoms: ["Full term!", "Back pain", "Swelling", "Ready to meet baby"],
    tip: "Watch for signs of labor and contact your provider",
    image: "/timeline/week40.png",
    imageAlt: "Week 40 - Size of a watermelon",
    searchQuery: "40 weeks pregnant overdue"
  }
};

app.get("/api/timeline/:week", (req, res) => {
  const week = parseInt(req.params.week);
  if (week >= 1 && week <= 40 && timelineDatabase[week]) {
    res.json(timelineDatabase[week]);
  } else {
    res.status(404).json({ error: "Week data not found" });
  }
});

app.get("/api/search-pregnancy", (req, res) => {
  const { query } = req.query;
  const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query + " pregnancy")}`;
  res.json({ url: searchUrl });
});

app.get("/api/health", async (req, res) => {
  try {
    const notificationCount = await Notification.countDocuments();
    res.json({ 
      status: "OK", 
      message: "Pairent API is running",
      mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      weeksAvailable: Object.keys(timelineDatabase).length,
      notificationsCount: notificationCount
    });
  } catch (error) {
    res.json({ 
      status: "OK", 
      message: "Pairent API is running",
      mongodb: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
      weeksAvailable: Object.keys(timelineDatabase).length,
      notificationsCount: 0
    });
  }
});

app.get("/", (req, res) => {
  res.send("Pairent API Running...");
});

// ========== PROFILE IMAGE UPLOAD AND UPDATE ROUTES ==========
app.post("/api/user/upload-profile-image", async (req, res) => {
  try {
    const { email, imageData } = req.body;
    
    if (!email || !imageData) {
      return res.status(400).json({ success: false, message: "Email and image data are required" });
    }
    
    if (!imageData.startsWith('data:image/')) {
      return res.status(400).json({ success: false, message: "Invalid image format" });
    }
    
    const imageSizeInBytes = Buffer.byteLength(imageData, 'utf8');
    const imageSizeInMB = imageSizeInBytes / (1024 * 1024);
    if (imageSizeInMB > 5) {
      return res.status(400).json({ success: false, message: "Image size should be less than 5MB" });
    }
    
    const user = await User.findOneAndUpdate(
      { email },
      { profileImage: imageData },
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    console.log(`✅ Profile image updated for ${email}`);
    
    res.json({ 
      success: true, 
      imageUrl: imageData,
      message: "Profile image updated successfully"
    });
    
  } catch (error) {
    console.error("❌ Error uploading profile image:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== PROFILE UPDATE ROUTE - WITH MULTIPLE BABIES SUPPORT ==========
app.put("/api/user/profile", async (req, res) => {
  try {
    const { email, fullName, phone, profileImage, pregnancy } = req.body;
    
    console.log("📝 Updating profile for:", email);
    console.log("Pregnancy data received:", pregnancy);
    
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }
    
    // First, update basic user info
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    // Update basic fields
    if (fullName !== undefined) user.fullName = fullName;
    if (phone !== undefined) user.phone = phone;
    if (profileImage !== undefined) user.profileImage = profileImage;
    
    // Handle pregnancy data with multiple babies support
    if (pregnancy) {
      // Initialize pregnancy object if it doesn't exist
      if (!user.pregnancy) {
        user.pregnancy = {};
      }
      
      // Filter out empty baby names
      const filteredBabyNames = (pregnancy.babyNames || []).filter(name => name && name.trim());
      
      // Update pregnancy fields
      if (pregnancy.dueDate !== undefined) user.pregnancy.dueDate = pregnancy.dueDate;
      if (pregnancy.firstPregnancy !== undefined) user.pregnancy.firstPregnancy = pregnancy.firstPregnancy;
      user.pregnancy.babyCount = pregnancy.babyCount || 1;
      user.pregnancy.babyNames = filteredBabyNames.length > 0 ? filteredBabyNames : [""];
      user.pregnancy.babyName = filteredBabyNames[0] || pregnancy.babyName || "";
      
      console.log("📊 Saving pregnancy data:");
      console.log("   babyCount:", user.pregnancy.babyCount);
      console.log("   babyNames:", user.pregnancy.babyNames);
      console.log("   dueDate:", user.pregnancy.dueDate);
    }
    
    // Save the user
    await user.save();
    
    console.log(`✅ Profile updated for ${email}`);
    console.log(`   Updated babyCount: ${user.pregnancy?.babyCount}`);
    console.log(`   Updated babyNames: ${user.pregnancy?.babyNames}`);
    
    // Return the updated user
    res.json({ 
      success: true, 
      message: "Profile updated successfully",
      user: {
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        profileImage: user.profileImage,
        pregnancy: user.pregnancy
      }
    });
    
  } catch (error) {
    console.error("❌ Error updating profile:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ========== GET PROFILE ROUTE - WITH MULTIPLE BABIES SUPPORT ==========
app.get("/api/user/profile/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    // Ensure pregnancy has multiple babies fields
    if (user.pregnancy) {
      if (!user.pregnancy.babyCount) {
        user.pregnancy.babyCount = 1;
      }
      if (!user.pregnancy.babyNames || user.pregnancy.babyNames.length === 0) {
        user.pregnancy.babyNames = user.pregnancy.babyName ? [user.pregnancy.babyName] : [""];
      }
    } else {
      // Create default pregnancy object if it doesn't exist
      user.pregnancy = {
        babyCount: 1,
        babyNames: [""],
        babyName: ""
      };
    }
    
    console.log(`📖 Profile fetched for ${email}`);
    console.log(`   babyCount: ${user.pregnancy.babyCount}`);
    console.log(`   babyNames: ${user.pregnancy.babyNames}`);
    
    res.json({
      success: true,
      user: {
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        profileImage: user.profileImage || null,
        pregnancy: user.pregnancy
      }
    });
    
  } catch (error) {
    console.error("❌ Error fetching profile:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});
// ========== MONGODB CONNECTION ==========
const PORT = process.env.PORT || 5000;

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("✅ MongoDB Connected");
    console.log("📊 Database:", mongoose.connection.name);
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
    });
  })
  .catch((err) => {
    console.log("❌ MongoDB Connection Error:", err);
    process.exit(1);
  });
