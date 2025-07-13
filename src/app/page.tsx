"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";

type Task = {
  _id: string;
  title: string;
  done: boolean;
};

export default function Home() {
  const { data: session, status } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");

  useEffect(() => {
    if (session) fetchTasks();
  }, [session]);

  const fetchTasks = async () => {
    const res = await fetch("/api/tasks");
    const data = await res.json();
    setTasks(data);
  };

  const addTask = async () => {
    if (!title.trim()) return;
    await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    setTitle("");
    fetchTasks();
  };

  const toggleDone = async (task: Task) => {
    await fetch("/api/tasks", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _id: task._id, done: !task.done }),
    });
    fetchTasks();
  };

  const deleteTask = async (task: Task) => {
    await fetch("/api/tasks", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ _id: task._id }),
    });
    fetchTasks();
  };

  if (status === "loading") return <p className="p-6">Carregando...</p>;

  if (!session) {
    return (
      <main className="p-6 text-center">
        <h1 className="text-2xl mb-4">Bem-vindo</h1>
        <p className="mb-4">Faça login para acessar suas tarefas</p>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded"
          onClick={() => signIn("google")}
        >
          Entrar com Google
        </button>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-xl mx-auto">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Minhas Tarefas</h1>
        <button className="text-red-500 underline" onClick={() => signOut()}>
          Sair
        </button>
      </div>

      <p className="mb-4">Olá, {session.user?.name}</p>

      <div className="flex gap-2 mb-4">
        <input
          className="border rounded px-2 py-1 flex-1"
          placeholder="Nova tarefa..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button
          className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
          onClick={addTask}
        >
          Adicionar
        </button>
      </div>

      <ul className="space-y-2">
        {tasks.map((task) => (
          <li
            key={task._id}
            className="border rounded px-4 py-2 flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={task.done}
                onChange={() => toggleDone(task)}
              />
              <span className={task.done ? "line-through text-gray-400" : ""}>
                {task.title}
              </span>
            </div>
            <button
              className="text-red-500 hover:text-red-700"
              onClick={() => deleteTask(task)}
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}
