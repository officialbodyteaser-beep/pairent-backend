import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, default: "" },
    profileImage: { type: String, default: "" },
    role: { type: String, enum: ["mother", "partner"], default: "mother" },
    language: { type: String, default: "en" },
    notifications: { type: Boolean, default: true },
    inviteCode: { type: String, default: "" },
    linkedPartner: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    pregnancy: {
      dueDate: { type: Date },
      babyName: { type: String, default: "" }, // Keep for backward compatibility
      firstPregnancy: { type: String, default: "yes" },
      // NEW: Multiple babies support
      babyCount: { type: Number, default: 1, min: 1, max: 4 }, // 1-4 babies
      babyNames: { type: [String], default: [""] }, // Array of baby names
    },
  },
  { timestamps: true }
);

// Helper method to get baby display text
userSchema.methods.getBabyDisplayText = function() {
  if (!this.pregnancy.babyCount || this.pregnancy.babyCount === 1) {
    return this.pregnancy.babyName || "Baby";
  }
  
  const count = this.pregnancy.babyCount;
  const names = this.pregnancy.babyNames?.filter(n => n && n.trim()) || [];
  
  if (names.length === 0) {
    // Return generic text like "Twins", "Triplets", etc.
    const genericNames = {
      2: "Twins",
      3: "Triplets",
      4: "Quadruplets"
    };
    return genericNames[count] || `${count} Babies`;
  }
  
  return names.join(" & ");
};

// Helper method to get baby names array (always returns valid array)
userSchema.methods.getBabyNamesArray = function() {
  if (!this.pregnancy.babyCount || this.pregnancy.babyCount === 1) {
    return [this.pregnancy.babyName || "Baby"];
  }
  
  const names = this.pregnancy.babyNames || [];
  // Ensure array length matches babyCount
  while (names.length < this.pregnancy.babyCount) {
    names.push("");
  }
  return names.slice(0, this.pregnancy.babyCount);
};

// Helper method to get baby name by index (0-based)
userSchema.methods.getBabyName = function(index) {
  const names = this.getBabyNamesArray();
  return names[index] || `Baby ${String.fromCharCode(65 + index)}`; // A, B, C, D
};

// Helper method to get trimester based on due date
userSchema.methods.getCurrentTrimester = function() {
  if (!this.pregnancy.dueDate) return 1;
  
  const today = new Date();
  const dueDate = new Date(this.pregnancy.dueDate);
  const weeksLeft = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24 * 7));
  const weeksAlong = 40 - weeksLeft;
  
  if (weeksAlong <= 12) return 1;
  if (weeksAlong <= 27) return 2;
  return 3;
};

// Helper method to get baby type string (single/twins/triplets/quadruplets)
userSchema.methods.getBabyType = function() {
  const count = this.pregnancy.babyCount || 1;
  const types = {
    1: "single",
    2: "twins",
    3: "triplets",
    4: "quadruplets"
  };
  return types[count] || "single";
};

// NO PASSWORD HASHING FOR NOW (for testing)
// Password will be stored as plain text temporarily

// Simple password comparison (no hashing)
userSchema.methods.comparePassword = function(candidatePassword) {
  return this.password === candidatePassword;
};

export default mongoose.model("User", userSchema);
