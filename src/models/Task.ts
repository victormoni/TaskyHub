import mongoose, { Schema } from "mongoose";

const recurrenceEnum = ["none", "daily", "weekly", "monthly"] as const;
export type Recurrence = (typeof recurrenceEnum)[number];

const TaskSchema = new Schema(
  {
    title: { type: String, required: true },
    done: { type: Boolean, default: false },
    userEmail: { type: String, required: true },
    dueDate: { type: Date },
    recurrence: {
      type: String,
      enum: recurrenceEnum,
      default: "none",
    },
  },
  {
    timestamps: true,
  }
);

export const Task = mongoose.models.Task || mongoose.model("Task", TaskSchema);
