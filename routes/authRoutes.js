import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { fullName, email, password, role } = req.body;
    
    console.log("📝 Registration:", { fullName, email, role });
    
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'Email already exists' });
    }
    
    // Store password as plain text (temporarily)
    const user = new User({ fullName, email, password, role: role || 'mother' });
    await user.save();
    
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'secret123',
      { expiresIn: '30d' }
    );
    
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

// Login - Simple version without password hashing
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log("🔐 Login attempt:", email);
    
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    
    // Simple password comparison (plain text)
    const isMatch = user.password === password;
    
    if (!isMatch) {
      console.log("❌ Invalid password for:", email);
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    
    console.log("✅ Login successful:", user.email, "Role:", user.role);
    
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
    res.json({ success: true, user });
  } catch (error) {
    console.error("❌ Auth error:", error);
    res.status(401).json({ success: false, error: 'Invalid token' });
  }
});

export default router;