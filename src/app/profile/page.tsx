"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { useEffect, useState } from "react";
import ThemeToggle from "@/components/ThemeToggle";
import { toast } from "sonner";

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    if (session) {
      fetch("/api/tasks")
        .then((res) => res.json())
        .then((data) => setCount(Array.isArray(data) ? data.length : null))
        .catch(() => setCount(null));
    }
  }, [session]);

  const handleDelete = async () => {
    if (!confirm("Excluir conta e todas as tarefas?")) return;
    try {
      const res = await fetch("/api/account", { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Conta e tarefas excluídas!");
      signOut({ callbackUrl: "/" });
    } catch {
      toast.error("Erro ao excluir conta");
    }
  };

  if (status === "loading") return <p className="p-6">Carregando...</p>;
  if (!session)
    return (
      <main className="p-6 text-center">
        <p>Você precisa estar logado.</p>
        <Link href="/" className="text-blue-600 underline">
          Voltar
        </Link>
      </main>
    );

  const { user } = session;
  return (
    <main className="p-6 max-w-md mx-auto bg-[var(--background)] text-[var(--foreground)] min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Perfil do Usuário</h1>
      <div className="space-y-2 mb-6">
        <p>
          <strong>Nome:</strong> {user?.name}
        </p>
        <p>
          <strong>E‑mail:</strong> {user?.email}
        </p>
        <p>
          <strong>Minhas tarefas:</strong> {count !== null ? count : "—"}
        </p>
      </div>

      <div className="flex items-center gap-4 mb-6">
        <ThemeToggle />
      </div>

      <button
        onClick={handleDelete}
        className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
      >
        Excluir conta
      </button>
    </main>
  );
}
