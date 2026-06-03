import express from "express";
import User from "../models/User.js";

const router = express.Router();

/* SAVE / UPDATE PROFILE */
router.post("/", async (req, res) => {
  try {
    const {
      user,
      pregnancy,
      profileImage,
    } = req.body;

    if (!user?.email) {
      return res.status(400).json({
        message: "User email required",
      });
    }

    const updatedUser =
      await User.findOneAndUpdate(
        { email: user.email },
        {
          $set: {
            pregnancy,
            profileImage:
              profileImage || "",
          },
        },
        {
          new: true,
        }
      );

    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

/* GET PROFILE */
router.get("/:email", async (req, res) => {
  try {
    const user =
      await User.findOne({
        email: req.params.email,
      });

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      });
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

/* UPDATE PROFILE IMAGE / DETAILS */
router.put("/", async (req, res) => {
  try {
    const {
      email,
      fullName,
      phone,
      profileImage,
      pregnancy,
    } = req.body;

    const updatedUser =
      await User.findOneAndUpdate(
        { email },
        {
          fullName,
          phone,
          profileImage,
          pregnancy,
        },
        { new: true }
      );

    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

export default router;