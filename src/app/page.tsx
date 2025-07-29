"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import ThemeToggle from "@/components/ThemeToggle";

type Recurrence = "none" | "daily" | "weekly" | "monthly";
type FilterType = "all" | "pending" | "completed";

type Task = {
  _id: string;
  title: string;
  done: boolean;
  createdAt?: string;
  dueDate?: string;
  recurrence: Recurrence;
};

const filterOptions: { label: string; value: FilterType }[] = [
  { label: "Todas", value: "all" },
  { label: "Pendentes", value: "pending" },
  { label: "Concluídas", value: "completed" },
];

const recurrenceOptions: { label: string; value: Recurrence }[] = [
  { label: "Sem recorrência", value: "none" },
  { label: "Diária", value: "daily" },
  { label: "Semanal", value: "weekly" },
  { label: "Mensal", value: "monthly" },
];

function formatDateTimeLocal(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function Home() {
  const { data: session, status } = useSession();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence>("none");

  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDueDate, setEditingDueDate] = useState("");
  const [editingRecurrence, setEditingRecurrence] =
    useState<Recurrence>("none");

  const [filter, setFilter] = useState<FilterType>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Batch selection state
  const [selected, setSelected] = useState<string[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (session) fetchTasks();
  }, [session]);

  const fetchTasks = async (notifyExpired = true) => {
    try {
      const res = await fetch("/api/tasks");
      if (!res.ok) throw new Error();
      const data: Task[] = await res.json();
      setTasks(data);
      if (notifyExpired) {
        const now = new Date();
        const expired = data.filter(
          (t) => t.dueDate && new Date(t.dueDate) < now && !t.done
        );
        if (expired.length > 0) {
          toast.error(`Você tem ${expired.length} tarefa(s) vencida(s)`);
        }
      }
    } catch {
      toast.error("Não foi possível carregar as tarefas");
    }
  };

  const addTask = async () => {
    if (!title.trim()) return toast.error("Título não pode ficar vazio");
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, dueDate, recurrence }),
      });
      if (!res.ok) throw new Error();
      toast.success("Tarefa criada!");
      setTitle("");
      setDueDate("");
      setRecurrence("none");
      await fetchTasks(false);
    } catch {
      toast.error("Erro ao criar tarefa");
    }
  };

  const toggleDone = async (task: Task) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: task._id, done: !task.done }),
      });
      if (!res.ok) throw new Error();
      toast.success(
        task.done ? "Tarefa marcada como pendente" : "Tarefa concluída"
      );
      fetchTasks();
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  const deleteTask = async (task: Task) => {
    try {
      const res = await fetch("/api/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: task._id }),
      });
      if (!res.ok) throw new Error();
      toast.success("Tarefa removida");
      await fetchTasks(false);
    } catch {
      toast.error("Erro ao deletar tarefa");
    }
  };

  const startEditing = (task: Task) => {
    setEditingTaskId(task._id);
    setEditingTitle(task.title);
    setEditingDueDate(task.dueDate ?? "");
    setEditingRecurrence(task.recurrence);
  };

  const cancelEditing = () => {
    setEditingTaskId(null);
    setEditingTitle("");
    setEditingDueDate("");
    setEditingRecurrence("none");
  };

  const saveEdit = async () => {
    if (!editingTaskId) return;
    if (!editingTitle.trim()) {
      cancelEditing();
      return toast.error("Título não pode ficar vazio");
    }
    try {
      const res = await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: editingTaskId,
          title: editingTitle.trim(),
          dueDate: editingDueDate,
          recurrence: editingRecurrence,
        }),
      });
      if (!res.ok) throw new Error();
      toast.success("Tarefa atualizada!");
      cancelEditing();
      fetchTasks();
    } catch {
      toast.error("Erro ao salvar edição");
    }
  };

  // Batch actions
  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const markSelected = async () => {
    for (const id of selected) {
      await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: id, done: true }),
      });
    }
    toast.success("Tarefas selecionadas marcadas como feitas");
    setSelected([]);
    fetchTasks();
  };

  const deleteSelected = async () => {
    for (const id of selected) {
      await fetch("/api/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: id }),
      });
    }
    toast.success("Tarefas selecionadas deletadas");
    setSelected([]);
    fetchTasks();
  };

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(tasks, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tasks.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const imported: Partial<Task>[] = JSON.parse(text);
      for (const t of imported) {
        if (!t.title) continue;
        const res = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: t.title,
            dueDate: t.dueDate,
            recurrence: t.recurrence,
          }),
        });
        if (res.ok && t.done) {
          const created = await res.json();
          await fetch("/api/tasks", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ _id: created._id, done: true }),
          });
        }
      }
      toast.success("Tarefas importadas!");
      fetchTasks();
    } catch {
      toast.error("Erro ao importar tarefas");
    }
  };

  const displayedTasks = tasks
    .filter((t) => t.title.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter((t) => {
      if (filter === "all") return true;
      return filter === "pending" ? !t.done : t.done;
    })
    .sort((a, b) =>
      sortOrder === "asc"
        ? a.title.localeCompare(b.title)
        : b.title.localeCompare(a.title)
    );

  if (status === "loading") return <p className="p-6">Carregando...</p>;
  if (!session)
    return (
      <main className="p-6 text-center bg-[var(--background)] text-[var(--foreground)] min-h-screen">
        <h1 className="text-2xl mb-4">Bem‑vindo</h1>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => signIn("google")}
        >
          Entrar com Google
        </button>
      </main>
    );

  return (
    <main className="p-6 max-w-xl mx-auto bg-[var(--background)] text-[var(--foreground)] min-h-screen">
      {/* Cabeçalho */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Minhas Tarefas</h1>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/profile"
            className="text-blue-500 underline hover:text-blue-700"
          >
            Perfil
          </Link>
          <button className="text-red-500 underline" onClick={() => signOut()}>
            Sair
          </button>
        </div>
      </div>

      <p className="mb-4">Olá, {session.user?.name}</p>

      {/* Export/Import and Batch Actions */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={handleExport}
          className="bg-green-600 text-white px-4 py-1 rounded hover:bg-green-700"
        >
          Exportar JSON
        </button>
        <button
          onClick={handleImportClick}
          className="bg-yellow-600 text-white px-4 py-1 rounded hover:bg-yellow-700"
        >
          Importar JSON
        </button>
        <button
          onClick={markSelected}
          disabled={selected.length === 0}
          className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          Marcar selecionadas
        </button>
        <button
          onClick={deleteSelected}
          disabled={selected.length === 0}
          className="bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700 disabled:opacity-50"
        >
          Deletar selecionadas
        </button>
        <input
          type="file"
          accept="application/json"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Nova tarefa + dueDate + recorrência */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          className="border rounded px-2 py-1 flex-1 min-w-[8rem] bg-transparent text-[var(--foreground)] border-[var(--foreground)]"
          placeholder="Nova tarefa..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          type="datetime-local"
          className="border rounded px-2 py-1 bg-transparent text-[var(--foreground)] border-[var(--foreground)]"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
        <select
          value={recurrence}
          onChange={(e) => setRecurrence(e.target.value as Recurrence)}
          className="border rounded px-2 py-1 bg-transparent text-[var(--foreground)] border-[var(--foreground)]"
        >
          {recurrenceOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <button
          className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
          onClick={addTask}
        >
          Adicionar
        </button>
      </div>

      {/* Busca e ordenação */}
      <div className="flex gap-2 mb-4">
        <input
          type="text"
          placeholder="Buscar tarefa..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border rounded px-2 py-1 flex-1 bg-transparent text-[var(--foreground)] border-[var(--foreground)]"
        />
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as "asc" | "desc")}
          className="border rounded px-2 py-1 bg-transparent text-[var(--foreground)] border-[var(--foreground)]"
        >
          <option value="asc">A → Z</option>
          <option value="desc">Z → A</option>
        </select>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-4">
        {filterOptions.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1 rounded-full text-sm ${
              filter === f.value
                ? "bg-blue-600 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Lista de tarefas */}
      <ul className="space-y-2">
        {displayedTasks.map((task) => (
          <li
            key={task._id}
            className="border rounded px-4 py-2 border-[var(--foreground)]"
          >
            {/* Seleção + Título + badge vencida */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selected.includes(task._id)}
                  onChange={() => toggleSelect(task._id)}
                />
                <input
                  type="checkbox"
                  checked={task.done}
                  onChange={() => toggleDone(task)}
                />
                {editingTaskId === task._id ? (
                  <>
                    <input
                      className="border-b border-gray-400 px-1 py-0.5 bg-transparent text-[var(--foreground)]"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onBlur={saveEdit}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit();
                        if (e.key === "Escape") cancelEditing();
                      }}
                      autoFocus
                    />
                    <input
                      type="datetime-local"
                      className="border-b border-gray-400 px-1 py-0.5 bg-transparent text-[var(--foreground)]"
                      value={editingDueDate}
                      onChange={(e) => setEditingDueDate(e.target.value)}
                    />
                    <select
                      value={editingRecurrence}
                      onChange={(e) =>
                        setEditingRecurrence(e.target.value as Recurrence)
                      }
                      className="border-b border-gray-400 px-1 py-0.5 bg-transparent text-[var(--foreground)]"
                    >
                      {recurrenceOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </>
                ) : (
                  <div className="flex items-center gap-2">
                    <span
                      className={task.done ? "line-through text-gray-400" : ""}
                    >
                      {task.title}
                    </span>
                    {task.dueDate &&
                      new Date(task.dueDate) < new Date() &&
                      !task.done && (
                        <span className="bg-red-100 text-red-800 text-xs font-semibold px-2 py-0.5 rounded-full">
                          Vencida
                        </span>
                      )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {editingTaskId === task._id ? (
                  <button
                    onClick={cancelEditing}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => startEditing(task)}
                      className="text-blue-500 hover:text-blue-700"
                    >
                      ✎
                    </button>
                    <button
                      onClick={() => deleteTask(task)}
                      className="text-red-500 hover:text-red-700"
                    >
                      ✕
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Datas */}
            {task.createdAt && (
              <div className="mt-1 text-xs text-gray-500">
                Criada em {formatDateTimeLocal(task.createdAt)}
              </div>
            )}
            {task.dueDate && (
              <div className="mt-1 text-xs text-gray-500">
                Vence em {formatDateTimeLocal(task.dueDate)}
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
