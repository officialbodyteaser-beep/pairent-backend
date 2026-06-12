import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';

const router = express.Router();

// Register - With password hashing
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body;
    
    console.log("📝 Registration:", { fullName, email, role });
    
    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Email already exists' });
    }
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Create user with hashed password
    const user = new User({ 
      fullName, 
      email, 
      password: hashedPassword, 
      role: role || 'mother' 
    });
    await user.save();
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: '30d' }
    );
    
    console.log("✅ Registration successful:", email);
    
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    console.error("❌ Registration error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Login - With password hash comparison
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log("🔐 Login attempt:", email);
    
    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      console.log("❌ User not found:", email);
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    
    // Compare hashed password
    const isMatch = await bcrypt.compare(password, user.password);
    
    if (!isMatch) {
      console.log("❌ Invalid password for:", email);
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    
    console.log("✅ Login successful:", user.email, "Role:", user.role);
    
    // Generate JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: '30d' }
    );
    
    res.json({
      success: true,
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        pregnancy: user.pregnancy,
      },
    });
  } catch (error) {
    console.error("❌ Login error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, error: 'No token' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret123');
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    res.json({ success: true, user });
  } catch (error) {
    console.error("❌ Auth error:", error);
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
});

// Change password - With hash comparison
router.post('/change-password', async (req, res) => {
  try {
    const { email, currentPassword, newPassword } = req.body;
    
    if (!email || !currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'All fields are required' });
    }
    
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Current password is incorrect' });
    }
    
    // Hash new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    
    // Update password
    user.password = hashedPassword;
    await user.save();
    
    console.log("✅ Password changed for:", email);
    
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error("❌ Change password error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
