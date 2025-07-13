import { connectDB } from "@/lib/mongodb";
import { Task } from "@/models/Task";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";
import { NextRequest, NextResponse } from "next/server";

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

  const { title } = await req.json();
  await connectDB();
  const task = await Task.create({
    title,
    userEmail: session.user?.email,
  });
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
