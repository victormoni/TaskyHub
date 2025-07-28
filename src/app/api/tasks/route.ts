import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import { connectDB } from "@/lib/mongodb";
import { Task } from "@/models/Task";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await connectDB();
  const tasks = await Task.find({ userEmail: session.user?.email });
  return NextResponse.json(tasks);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, dueDate } = await req.json();
  if (!title)
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  await connectDB();
  const taskData: any = {
    title,
    userEmail: session.user?.email,
  };
  if (dueDate) taskData.dueDate = new Date(dueDate);

  const task = await Task.create(taskData);
  return NextResponse.json(task);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { _id, done } = await req.json();
  await connectDB();
  const updated = await Task.findOneAndUpdate(
    { _id, userEmail: session.user?.email }, // garante que o usuário só edita sua tarefa
    { done },
    { new: true }
  );
  return NextResponse.json(updated);
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { _id } = await req.json();
  await connectDB();
  await Task.findOneAndDelete({ _id, userEmail: session.user?.email }); // só deleta se for dono
  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { _id, title, dueDate } = await req.json();
  if (!_id)
    return NextResponse.json({ error: "Invalid data" }, { status: 400 });

  await connectDB();
  const updateData: any = {};
  if (title) updateData.title = title;

  if (dueDate !== undefined)
    updateData.dueDate = dueDate ? new Date(dueDate) : null;

  const updated = await Task.findOneAndUpdate(
    { _id, userEmail: session.user?.email },
    updateData,
    { new: true }
  );

  return NextResponse.json(updated);
}
