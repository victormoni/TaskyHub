import mongoose, { Schema } from "mongoose";

const TaskSchema = new Schema({
  title: { type: String, required: true },
  done: { type: Boolean, default: false },
  userEmail: { type: String, required: true },
});

export const Task = mongoose.models.Task || mongoose.model("Task", TaskSchema);
