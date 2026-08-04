import mongoose from "mongoose";

const projectSchema = new mongoose.Schema(
  {
    projectCode: {
      type: String,
      required: [true, "Project code is required"],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    title: {
      type: String,
      required: [true, "Project title is required"],
      trim: true,
      maxlength: [200, "Project title cannot exceed 200 characters"],
    },

    description: {
      type: String,
      default: "",
      trim: true,
      maxlength: [2000, "Description cannot exceed 2000 characters"],
    },

    projectType: {
      type: String,
      enum: [
        "electrical_audit",
        "energy_audit",
        "risk_rectification",
        "solar_installation",
        "testing_commissioning",
        "other",
      ],
      default: "risk_rectification",
    },

    client: {
      name: {
        type: String,
        required: [true, "Client name is required"],
        trim: true,
      },

      company: {
        type: String,
        default: "",
        trim: true,
      },

      email: {
        type: String,
        default: "",
        lowercase: true,
        trim: true,
      },

      phone: {
        type: String,
        default: "",
        trim: true,
      },
    },

    site: {
      name: {
        type: String,
        required: [true, "Site name is required"],
        trim: true,
      },

      location: {
        type: String,
        required: [true, "Site location is required"],
        trim: true,
      },

      city: {
        type: String,
        default: "",
        trim: true,
      },

      province: {
        type: String,
        default: "",
        trim: true,
      },

      country: {
        type: String,
        default: "Pakistan",
        trim: true,
      },
    },

    systemCapacityKW: {
      type: Number,
      default: 0,
      min: [0, "System capacity cannot be negative"],
    },

    auditDate: {
      type: Date,
      default: null,
    },

    startDate: {
      type: Date,
      required: [true, "Project start date is required"],
    },

    expectedCompletionDate: {
      type: Date,
      required: [true, "Expected completion date is required"],
    },

    actualCompletionDate: {
      type: Date,
      default: null,
    },

    status: {
      type: String,
      enum: [
        "draft",
        "active",
        "on_hold",
        "awaiting_verification",
        "completed",
        "archived",
      ],
      default: "draft",
    },

    overallRiskLevel: {
      type: String,
      enum: [
        "low",
        "medium",
        "high",
        "critical",
        "high_to_critical",
      ],
      default: "high_to_critical",
    },

    progress: {
      overall: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },

      rectification: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },

      evidence: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },

      testing: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },

      actionPlan: {
        type: Number,
        default: 0,
        min: 0,
        max: 100,
      },
    },

    riskSummary: {
      totalRiskGroups: {
        type: Number,
        default: 0,
        min: 0,
      },

      totalEvidence: {
        type: Number,
        default: 0,
        min: 0,
      },

      extreme: {
        type: Number,
        default: 0,
        min: 0,
      },

      high: {
        type: Number,
        default: 0,
        min: 0,
      },

      medium: {
        type: Number,
        default: 0,
        min: 0,
      },

      low: {
        type: Number,
        default: 0,
        min: 0,
      },

      open: {
        type: Number,
        default: 0,
        min: 0,
      },

      inProgress: {
        type: Number,
        default: 0,
        min: 0,
      },

      awaitingVerification: {
        type: Number,
        default: 0,
        min: 0,
      },

      closed: {
        type: Number,
        default: 0,
        min: 0,
      },
    },

    projectLead: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    teamMembers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    clientAccessEnabled: {
      type: Boolean,
      default: true,
    },

    clientAccessToken: {
      type: String,
      unique: true,
      sparse: true,
      select: false,
      default: null,
    },

    clientAccessExpiresAt: {
      type: Date,
      default: null,
    },

    lastClientAccessAt: {
      type: Date,
      default: null,
    },

    notes: {
      type: String,
      default: "",
      trim: true,
      maxlength: [3000, "Notes cannot exceed 3000 characters"],
    },

    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Project creator is required"],
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

projectSchema.index({ status: 1, createdAt: -1 });
projectSchema.index({ "client.name": 1 });
projectSchema.index({ "site.city": 1 });
projectSchema.index({ overallRiskLevel: 1 });

const Project = mongoose.model("Project", projectSchema);

export default Project;