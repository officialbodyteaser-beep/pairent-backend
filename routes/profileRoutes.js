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

    // Ensure pregnancy data has multiple babies fields
    const updatedPregnancy = {
      ...pregnancy,
      // Set default babyCount if not provided
      babyCount: pregnancy?.babyCount || 1,
      // Ensure babyNames is an array
      babyNames: pregnancy?.babyNames || (pregnancy?.babyName ? [pregnancy.babyName] : [""]),
      // Keep babyName for backward compatibility
      babyName: pregnancy?.babyName || (pregnancy?.babyNames?.[0] || "")
    };

    const updatedUser =
      await User.findOneAndUpdate(
        { email: user.email },
        {
          $set: {
            pregnancy: updatedPregnancy,
            profileImage: profileImage || "",
            // Also update fullName if provided
            fullName: user.fullName || undefined,
            phone: user.phone || undefined,
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

    // Ensure pregnancy data has multiple babies fields for backward compatibility
    if (user.pregnancy) {
      if (!user.pregnancy.babyCount) {
        user.pregnancy.babyCount = 1;
      }
      if (!user.pregnancy.babyNames || user.pregnancy.babyNames.length === 0) {
        user.pregnancy.babyNames = user.pregnancy.babyName ? [user.pregnancy.babyName] : [""];
      }
    }

    res.json(user);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

/* UPDATE PROFILE IMAGE / DETAILS - MAIN PROFILE UPDATE */
router.put("/", async (req, res) => {
  try {
    const {
      email,
      fullName,
      phone,
      profileImage,
      pregnancy,
    } = req.body;

    // Prepare update object
    const updateData = {
      fullName,
      phone,
      profileImage,
    };

    // Handle pregnancy data with multiple babies support
    if (pregnancy) {
      updateData.pregnancy = {
        dueDate: pregnancy.dueDate,
        babyName: pregnancy.babyName || (pregnancy.babyNames?.[0] || ""),
        firstPregnancy: pregnancy.firstPregnancy,
        // Multiple babies fields
        babyCount: pregnancy.babyCount || 1,
        babyNames: pregnancy.babyNames || (pregnancy.babyName ? [pregnancy.babyName] : [""])
      };
    }

    const updatedUser =
      await User.findOneAndUpdate(
        { email },
        { $set: updateData },
        { new: true }
      );

    // Ensure response includes multiple babies fields
    if (updatedUser && updatedUser.pregnancy) {
      if (!updatedUser.pregnancy.babyCount) {
        updatedUser.pregnancy.babyCount = 1;
      }
      if (!updatedUser.pregnancy.babyNames || updatedUser.pregnancy.babyNames.length === 0) {
        updatedUser.pregnancy.babyNames = updatedUser.pregnancy.babyName ? [updatedUser.pregnancy.babyName] : [""];
      }
    }

    res.json(updatedUser);
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

/* UPDATE PROFILE TASKS */
router.put("/tasks/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const { completedTasks } = req.body;

    const updatedUser = await User.findOneAndUpdate(
      { email },
      { $set: { completedTasks: completedTasks || [] } },
      { new: true }
    );

    res.json({ success: true, user: updatedUser });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

/* UPDATE USER PREFERENCES (NOTIFICATIONS, ETC) */
router.put("/preferences", async (req, res) => {
  try {
    const { email, notifications } = req.body;

    const updatedUser = await User.findOneAndUpdate(
      { email },
      { $set: { notifications: notifications !== false } },
      { new: true }
    );

    res.json({ success: true, user: updatedUser });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

export default router;
