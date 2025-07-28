import mongoose, { Schema } from "mongoose";

const TaskSchema = new Schema(
  {
    title: { type: String, required: true },
    done: { type: Boolean, default: false },
    userEmail: { type: String, required: true },
  },
  {
    timestamps: true, // <— com isso mongoose popula createdAt e updatedAt
  }
);

export const Task = mongoose.models.Task || mongoose.model("Task", TaskSchema);
