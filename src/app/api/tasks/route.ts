// src/app/api/tasks/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { connectDB } from "@/lib/mongodb";
import { Task } from "@/models/Task";

interface CreateTaskBody {
  title: string;
  dueDate?: string;
}

interface UpdateTaskBody {
  _id: string;
  title?: string;
  dueDate?: string | null;
}

// GET /api/tasks
export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectDB();
  const tasks = await Task.find({ userEmail: email });
  return NextResponse.json(tasks);
}

// POST /api/tasks
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { title, dueDate } = (await req.json()) as CreateTaskBody;
  if (!title) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  await connectDB();
  const taskData: {
    title: string;
    userEmail: string;
    dueDate?: Date;
  } = {
    title,
    userEmail: email,
  };
  if (dueDate) {
    taskData.dueDate = new Date(dueDate);
  }

  const task = await Task.create(taskData);
  return NextResponse.json(task);
}

// PUT /api/tasks
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { _id, done } = (await req.json()) as { _id: string; done: boolean };

  await connectDB();
  const updated = await Task.findOneAndUpdate(
    { _id, userEmail: email },
    { done },
    { new: true }
  );
  return NextResponse.json(updated);
}

// DELETE /api/tasks
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { _id } = (await req.json()) as { _id: string };

  await connectDB();
  await Task.findOneAndDelete({ _id, userEmail: email });
  return NextResponse.json({ success: true });
}

// PATCH /api/tasks
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { _id, title, dueDate } = (await req.json()) as UpdateTaskBody;
  if (!_id) {
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });
  }

  await connectDB();
  const updateData: {
    title?: string;
    dueDate?: Date | null;
  } = {};

  if (title) {
    updateData.title = title;
  }
  if (dueDate !== undefined) {
    updateData.dueDate = dueDate ? new Date(dueDate) : null;
  }

  const updated = await Task.findOneAndUpdate(
    { _id, userEmail: email },
    updateData,
    { new: true }
  );

  return NextResponse.json(updated);
}
