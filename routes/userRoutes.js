import express from "express";
import User from "../models/User.js";

const router = express.Router();

/* UPDATE PROFILE IMAGE / DETAILS - MAIN PROFILE UPDATE */
router.put("/profile", async (req, res) => {
  try {
    const {
      email,
      fullName,
      phone,
      profileImage,
      pregnancy,
    } = req.body;

    console.log("📝 Updating profile for:", email);
    console.log("Pregnancy data received:", pregnancy);

    if (!email) {
      return res.status(400).json({ 
        success: false,
        message: "Email is required" 
      });
    }

    // Prepare update object
    const updateData = {
      fullName,
      phone,
      profileImage,
    };

    // Handle pregnancy data with multiple babies support
    if (pregnancy) {
      // Filter out empty baby names
      const filteredBabyNames = (pregnancy.babyNames || []).filter(name => name && name.trim());
      
      updateData.pregnancy = {
        dueDate: pregnancy.dueDate,
        babyName: filteredBabyNames[0] || pregnancy.babyName || "",
        firstPregnancy: pregnancy.firstPregnancy || "yes",
        babyCount: pregnancy.babyCount || 1,
        babyNames: filteredBabyNames.length > 0 ? filteredBabyNames : [""]
      };
      
      console.log("Saving pregnancy:", updateData.pregnancy);
    }

    const updatedUser = await User.findOneAndUpdate(
      { email },
      { $set: updateData },
      { new: true }
    );

    if (!updatedUser) {
      return res.status(404).json({ 
        success: false,
        message: "User not found" 
      });
    }

    // Ensure response includes multiple babies fields
    if (updatedUser.pregnancy) {
      if (!updatedUser.pregnancy.babyCount) {
        updatedUser.pregnancy.babyCount = 1;
      }
      if (!updatedUser.pregnancy.babyNames || updatedUser.pregnancy.babyNames.length === 0) {
        updatedUser.pregnancy.babyNames = updatedUser.pregnancy.babyName ? [updatedUser.pregnancy.babyName] : [""];
      }
    }

    console.log("✅ Profile updated successfully for:", email);
    
    res.json({ 
      success: true, 
      user: updatedUser,
      pregnancy: updatedUser.pregnancy
    });
  } catch (err) {
    console.error("❌ Update error:", err);
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/* GET PROFILE */
router.get("/profile/:email", async (req, res) => {
  try {
    const user = await User.findOne({
      email: req.params.email,
    });

    if (!user) {
      return res.status(404).json({
        success: false,
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

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message,
    });
  }
});

/* UPDATE PREGNANCY DATA (including multiples) */
router.put("/pregnancy", async (req, res) => {
  try {
    const {
      email,
      dueDate,
      babyCount,
      babyNames,
      firstPregnancy,
    } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const babyCountValue = babyCount || 1;
    let babyNamesArray = babyNames || [];
    
    // Ensure babyNames array length matches babyCount
    while (babyNamesArray.length < babyCountValue) {
      babyNamesArray.push("");
    }
    while (babyNamesArray.length > babyCountValue) {
      babyNamesArray.pop();
    }

    const pregnancyData = {
      dueDate,
      babyName: babyNamesArray[0] || "",
      firstPregnancy: firstPregnancy || "yes",
      babyCount: babyCountValue,
      babyNames: babyNamesArray
    };

    const user = await User.findOneAndUpdate(
      { email },
      { $set: { pregnancy: pregnancyData } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json({ 
      success: true, 
      user,
      pregnancy: pregnancyData
    });
  } catch (error) {
    console.error("Error saving pregnancy data:", error);
    res.status(500).json({
      message: "Failed to save pregnancy data",
      error: error.message
    });
  }
});

/* GET PREGNANCY DATA */
router.get("/pregnancy/:email", async (req, res) => {
  try {
    const { email } = req.params;
    
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const pregnancy = user.pregnancy || {};
    if (!pregnancy.babyCount) {
      pregnancy.babyCount = 1;
    }
    if (!pregnancy.babyNames || pregnancy.babyNames.length === 0) {
      pregnancy.babyNames = pregnancy.babyName ? [pregnancy.babyName] : [""];
    }

    res.json({
      success: true,
      pregnancy,
      dueDate: pregnancy.dueDate,
      babyCount: pregnancy.babyCount,
      babyNames: pregnancy.babyNames,
      babyName: pregnancy.babyName,
      firstPregnancy: pregnancy.firstPregnancy
    });
  } catch (error) {
    console.error("Error fetching pregnancy data:", error);
    res.status(500).json({
      message: "Failed to fetch pregnancy data",
      error: error.message
    });
  }
});

/* UPLOAD PROFILE IMAGE */
router.post("/upload-profile-image", async (req, res) => {
  try {
    const { email, imageData } = req.body;
    
    const user = await User.findOneAndUpdate(
      { email },
      { $set: { profileImage: imageData } },
      { new: true }
    );
    
    res.json({ success: true, imageUrl: imageData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
