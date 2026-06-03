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
    
    res.json({
      success: true,
      mother: {
        name: mother.fullName,
        currentWeek: 24,
        trimester: "2nd Trimester",
        daysLeft: 112,
        dueDate: mother.pregnancy?.dueDate ? new Date(mother.pregnancy.dueDate).toLocaleDateString() : "Not set",
        babySize: "Cantaloupe",
        symptomsCount: 0,
        mood: "Happy"
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

app.put("/api/user/profile", async (req, res) => {
  try {
    const { email, fullName, phone, profileImage, pregnancy } = req.body;
    
    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }
    
    const updateData = {};
    if (fullName !== undefined) updateData.fullName = fullName;
    if (phone !== undefined) updateData.phone = phone;
    if (profileImage !== undefined) updateData.profileImage = profileImage;
    
    const user = await User.findOneAndUpdate(
      { email },
      updateData,
      { new: true }
    );
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    if (pregnancy && (pregnancy.babyName !== undefined || pregnancy.dueDate !== undefined)) {
      const pregnancyUpdate = {};
      if (pregnancy.babyName !== undefined) pregnancyUpdate["pregnancy.babyName"] = pregnancy.babyName;
      if (pregnancy.dueDate !== undefined) pregnancyUpdate["pregnancy.dueDate"] = pregnancy.dueDate;
      
      await User.findOneAndUpdate(
        { email },
        { $set: pregnancyUpdate }
      );
    }
    
    console.log(`✅ Profile updated for ${email}`);
    
    res.json({ 
      success: true, 
      message: "Profile updated successfully",
      user: {
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        profileImage: user.profileImage
      }
    });
    
  } catch (error) {
    console.error("❌ Error updating profile:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get("/api/user/profile/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    
    res.json({
      success: true,
      user: {
        fullName: user.fullName,
        email: user.email,
        phone: user.phone,
        profileImage: user.profileImage || null,
        pregnancy: user.pregnancy || null
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