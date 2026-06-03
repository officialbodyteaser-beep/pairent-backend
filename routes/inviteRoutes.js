import express from "express";
import User from "../models/User.js";

const router = express.Router();

const generateCode = () => {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  let code = "";

  for (let i = 0; i < 6; i++) {
    code += chars.charAt(
      Math.floor(Math.random() * chars.length)
    );
  }

  return code;
};

/* CREATE INVITE CODE */
router.post("/create", async (req, res) => {
  try {
    const { userId } = req.body;

    const code = generateCode();

    await User.findByIdAndUpdate(userId, {
      partnerCode: code,
    });

    res.json({ code });
  } catch (error) {
    res.status(500).json({
      message: "Error creating invite code",
    });
  }
});

/* JOIN PARTNER */
router.post("/join", async (req, res) => {
  try {
    const { userId, code } = req.body;

    const partner = await User.findOne({
      partnerCode: code,
    });

    if (!partner) {
      return res.status(404).json({
        message: "Invalid invite code",
      });
    }

    await User.findByIdAndUpdate(userId, {
      partnerId: partner._id,
    });

    await User.findByIdAndUpdate(partner._id, {
      partnerId: userId,
    });

    res.json({
      message: "Partner connected",
    });
  } catch (error) {
    res.status(500).json({
      message: "Error joining partner",
    });
  }
});

export default router;