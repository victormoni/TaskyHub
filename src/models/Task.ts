import mongoose, { Schema } from "mongoose";

const TaskSchema = new Schema(
  {
    title: { type: String, required: true },
    done: { type: Boolean, default: false },
    userEmail: { type: String, required: true },
    dueDate: { type: Date }, // ← campo de vencimento opcional
  },
  {
    timestamps: true, // já tinha criado em / atualizado em
  }
);

export const Task = mongoose.models.Task || mongoose.model("Task", TaskSchema);
