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
      babyName: { type: String, default: "" },
      firstPregnancy: { type: String, default: "yes" },
    },
  },
  { timestamps: true }
);

// NO PASSWORD HASHING FOR NOW (for testing)
// Password will be stored as plain text temporarily

// Simple password comparison (no hashing)
userSchema.methods.comparePassword = function(candidatePassword) {
  return this.password === candidatePassword;
};

export default mongoose.model("User", userSchema);