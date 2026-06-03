import express from "express";
import User from "../models/User.js";

const router = express.Router();

router.put(
  "/pregnancy",
  async (req, res) => {
    try {
      const {
        userId,
        dueDate,
        babyName,
        firstPregnancy,
      } = req.body;

      const user =
        await User.findByIdAndUpdate(
          userId,
          {
            pregnancy: {
              dueDate,
              babyName,
              firstPregnancy,
            },
          },
          { new: true }
        );

      res.json(user);
    } catch (error) {
      res.status(500).json({
        message:
          "Failed to save pregnancy data",
      });
    }
  }
);

export default router;