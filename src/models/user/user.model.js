import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: function () {
        return this.provider === "local";
      },
      minlength: 6,
    },

    phone: {
      type: String,
      default: "",
      trim: true,
    },

    countryCode: {
      type: String,
      default: "",
      trim: true,
    },

    role: {
      type: String,
      enum: ["user", "admin", "super_admin"],
      default: "user",
    },

    avatar: {
      type: String,
      default: "",
    },

    provider: {
      type: String,
      enum: ["local", "google", "facebook", "github"],
      default: "local",
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    isPhoneVerified: {
      type: Boolean,
      default: false,
    },

    is2FAEnabled: {
      type: Boolean,
      default: false,
    },

    twoFASecret: {
      type: String,
      default: "",
    },

    refreshToken: {
      type: String,
      default: "",
    },

    passwordResetToken: {
      type: String,
      default: "",
    },

    passwordResetExpires: {
      type: Date,
      default: null,
    },

    emailVerificationToken: {
      type: String,
      default: "",
    },

    emailVerificationExpires: {
      type: Date,
      default: null,
    },

    phoneVerificationOtp: {
      type: String,
      default: "",
    },

    phoneVerificationExpires: {
      type: Date,
      default: null,
    },

    phoneVerificationAttempts: {
      type: Number,
      default: 0,
    },

    phoneVerificationLastSentAt: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: ["active", "inactive", "blocked"],
      default: "active",
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

export default User;