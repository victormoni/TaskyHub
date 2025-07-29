import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { connectDB } from "@/lib/mongodb";
import { Task, Recurrence } from "@/models/Task";

interface CreateTaskBody {
  title: string;
  dueDate?: string;
  recurrence?: Recurrence;
}

interface UpdateTaskBody {
  _id: string;
  title?: string;
  dueDate?: string | null;
  recurrence?: Recurrence;
}

// --- GET: list tasks ---
export async function GET() {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const tasks = await Task.find({ userEmail: email });
  return NextResponse.json(tasks);
}

// --- POST: create task ---
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const {
    title,
    dueDate,
    recurrence = "none",
  } = (await req.json()) as CreateTaskBody;
  if (!title)
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  await connectDB();
  const taskData: {
    title: string;
    userEmail: string;
    dueDate?: Date;
    recurrence: Recurrence;
  } = { title, userEmail: email, recurrence };

  if (dueDate) taskData.dueDate = new Date(dueDate);
  const task = await Task.create(taskData);
  return NextResponse.json(task);
}

// --- PUT: toggle done + create recurrence ---
export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { _id, done } = (await req.json()) as { _id: string; done: boolean };
  await connectDB();

  const task = await Task.findOneAndUpdate(
    { _id, userEmail: email },
    { done },
    { new: true }
  );

  if (task && done && task.recurrence !== "none") {
    const nextDate = task.dueDate ? new Date(task.dueDate) : new Date();
    switch (task.recurrence) {
      case "daily":
        nextDate.setDate(nextDate.getDate() + 1);
        break;
      case "weekly":
        nextDate.setDate(nextDate.getDate() + 7);
        break;
      case "monthly":
        nextDate.setMonth(nextDate.getMonth() + 1);
        break;
    }
    await Task.create({
      title: task.title,
      userEmail: email,
      dueDate: nextDate,
      recurrence: task.recurrence,
    });
  }

  return NextResponse.json(task);
}

// --- DELETE: delete task ---
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { _id } = (await req.json()) as { _id: string };
  await connectDB();
  await Task.findOneAndDelete({ _id, userEmail: email });
  return NextResponse.json({ success: true });
}

// --- PATCH: update title, data e recurrence ---
export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { _id, title, dueDate, recurrence } =
    (await req.json()) as UpdateTaskBody;
  if (!_id)
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  await connectDB();
  const updateData: {
    title?: string;
    dueDate?: Date | null;
    recurrence?: Recurrence;
  } = {};

  if (title) updateData.title = title;
  if (dueDate !== undefined)
    updateData.dueDate = dueDate ? new Date(dueDate) : null;
  if (recurrence !== undefined) updateData.recurrence = recurrence;

  const updated = await Task.findOneAndUpdate(
    { _id, userEmail: email },
    updateData,
    { new: true }
  );

  return NextResponse.json(updated);
}
