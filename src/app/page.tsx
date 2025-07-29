"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { toast } from "sonner";
import ThemeToggle from "@/components/ThemeToggle";
import { AnimatePresence, motion } from "framer-motion";

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

type ConfirmProps = {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
};

function ConfirmModal({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
}: ConfirmProps) {
  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg w-80"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0.8 }}
          >
            <h2 className="text-lg font-bold mb-4">{title}</h2>
            <p className="mb-6">{message}</p>
            <div className="flex justify-end gap-2">
              <button
                onClick={onCancel}
                className="px-4 py-2 rounded border hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                Cancelar
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2 rounded bg-red-600 text-white hover:bg-red-700"
              >
                Confirmar
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function Home() {
  const { data: session, status } = useSession();

  // Main state
  const [tasks, setTasks] = useState<Task[]>([]);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [recurrence, setRecurrence] = useState<Recurrence>("none");

  // Inline editing
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingDueDate, setEditingDueDate] = useState("");
  const [editingRecurrence, setEditingRecurrence] =
    useState<Recurrence>("none");

  // Filter/search/sort
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Batch mode
  const [batchMode, setBatchMode] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [showConfirmMark, setShowConfirmMark] = useState(false);
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load tasks
  useEffect(() => {
    if (session) fetchTasks();
  }, [session]);

  // Fetch tasks from API
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

  // Add new task
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

  // Toggle done status
  const toggleDone = async (task: Task) => {
    try {
      await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: task._id, done: !task.done }),
      });
      toast.success(
        task.done ? "Tarefa marcada como pendente" : "Tarefa concluída"
      );
      fetchTasks();
    } catch {
      toast.error("Erro ao atualizar status");
    }
  };

  // Delete single task
  const deleteOne = async (task: Task) => {
    try {
      await fetch("/api/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: task._id }),
      });
      toast.success("Tarefa removida");
      await fetchTasks(false);
    } catch {
      toast.error("Erro ao deletar tarefa");
    }
  };

  // Start and cancel inline editing
  const startEditing = (task: Task) => {
    setEditingTaskId(task._id);
    setEditingTitle(task.title);
    setEditingDueDate(task.dueDate ?? "");
    setEditingRecurrence(task.recurrence);
  };
  const cancelEditing = () => {
    setEditingTaskId(null);
    setEditingTitle("");
  };

  // Save inline edit
  const saveEdit = async () => {
    if (!editingTaskId) return;
    if (!editingTitle.trim()) {
      cancelEditing();
      return toast.error("Título não pode ficar vazio");
    }
    try {
      await fetch("/api/tasks", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          _id: editingTaskId,
          title: editingTitle.trim(),
          dueDate: editingDueDate,
          recurrence: editingRecurrence,
        }),
      });
      toast.success("Tarefa atualizada!");
      cancelEditing();
      fetchTasks();
    } catch {
      toast.error("Erro ao salvar edição");
    }
  };

  // Batch selection handlers
  const toggleSelect = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  // Confirmed batch operations
  const handleBatchMark = async () => {
    for (const id of selected) {
      await fetch("/api/tasks", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: id, done: true }),
      });
    }
    toast.success("Tarefas marcadas como feitas");
    setSelected([]);
    setBatchMode(false);
    setShowConfirmMark(false);
    fetchTasks();
  };
  const handleBatchDelete = async () => {
    for (const id of selected) {
      await fetch("/api/tasks", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ _id: id }),
      });
    }
    toast.success("Tarefas deletadas");
    setSelected([]);
    setBatchMode(false);
    setShowConfirmDelete(false);
    fetchTasks();
  };

  // Export / Import
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
  const handleImportClick = () => fileInputRef.current?.click();
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

  // Filter, search, sort
  const displayedTasks = tasks
    .filter((t) => t.title.toLowerCase().includes(searchTerm.toLowerCase()))
    .filter((t) =>
      filter === "all" ? true : filter === "pending" ? !t.done : t.done
    )
    .sort((a, b) =>
      sortOrder === "asc"
        ? a.title.localeCompare(b.title)
        : b.title.localeCompare(a.title)
    );

  if (status === "loading") return <p className="p-6">Carregando...</p>;
  if (!session) {
    return (
      <main className="p-6 text-center bg-[var(--background)] text-[var(--foreground)] min-h-screen">
        <h1 className="text-2xl mb-4">Bem-vindo</h1>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          onClick={() => signIn("google")}
        >
          Entrar com Google
        </button>
      </main>
    );
  }

  return (
    <main className="p-6 max-w-xl mx-auto bg-[var(--background)] text-[var(--foreground)] min-h-screen">
      {/* Header */}
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
          <button onClick={() => signOut()} className="text-red-500 underline">
            Sair
          </button>
        </div>
      </div>

      <p className="mb-4">Olá, {session.user?.name}</p>

      {/* Confirm Modals */}
      <ConfirmModal
        isOpen={showConfirmMark}
        title="Confirmar marcação"
        message="Deseja marcar as tarefas selecionadas como concluídas?"
        onConfirm={handleBatchMark}
        onCancel={() => setShowConfirmMark(false)}
      />
      <ConfirmModal
        isOpen={showConfirmDelete}
        title="Confirmar deleção"
        message="Deseja deletar as tarefas selecionadas?"
        onConfirm={handleBatchDelete}
        onCancel={() => setShowConfirmDelete(false)}
      />

      {/* Export / Import / Select */}
      <div className="flex gap-2 mb-4 items-center">
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
          onClick={() => {
            setBatchMode(!batchMode);
            if (batchMode) setSelected([]);
          }}
          className="text-sm px-2 py-1 border rounded hover:bg-gray-200 dark:hover:bg-gray-700 ml-auto"
        >
          {batchMode ? "✕ Cancelar seleção" : "✓ Selecionar tarefas"}
        </button>
        <input
          type="file"
          accept="application/json"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Batch Actions */}
      {batchMode && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setShowConfirmMark(true)}
            disabled={selected.length === 0}
            className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Marcar selecionadas
          </button>
          <button
            onClick={() => setShowConfirmDelete(true)}
            disabled={selected.length === 0}
            className="bg-red-600 text-white px-4 py-1 rounded hover:bg-red-700 disabled:opacity-50"
          >
            Deletar selecionadas
          </button>
        </div>
      )}

      {/* New Task Input */}
      <div className="flex items-center gap-2 mb-2">
        <input
          className="border rounded px-2 py-1 flex-1 bg-transparent text-[var(--foreground)] border-[var(--foreground)]"
          placeholder="Nova tarefa..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <button
          onClick={addTask}
          className="bg-blue-600 text-white px-4 py-1 rounded hover:bg-blue-700"
        >
          Adicionar
        </button>
      </div>
      <div className="flex gap-2 mb-4">
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
      </div>

      {/* Search and Sort */}
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

      {/* Filters */}
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

      {/* Task List */}
      <ul className="space-y-2">
        {displayedTasks.map((task) => (
          <motion.li
            key={task._id}
            layout
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="border rounded px-4 py-2 border-[var(--foreground)]"
          >
            <div className="flex items-center gap-2">
              {batchMode && (
                <input
                  type="checkbox"
                  checked={selected.includes(task._id)}
                  onChange={() => toggleSelect(task._id)}
                  className="accent-blue-500"
                />
              )}
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
                <div className="flex-1 flex items-center justify-between">
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
              {editingTaskId !== task._id && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => startEditing(task)}
                    className="text-blue-500 hover:text-blue-700"
                  >
                    ✎
                  </button>
                  <button
                    onClick={() => deleteOne(task)}
                    className="text-red-500 hover:text-red-700"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
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
          </motion.li>
        ))}
      </ul>
    </main>
  );
}
