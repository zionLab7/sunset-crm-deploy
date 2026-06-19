"use client";

import { useState, useEffect, useRef } from "react";
import { Bell, X, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";

interface TaskNotification {
    id: string;
    title: string;
    dueDate: string;
    dueTime: string | null;
    status: string;
    client?: { name: string } | null;
    isOverdue: boolean;
}

export function NotificationBell() {
    const router = useRouter();
    const containerRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [tasks, setTasks] = useState<TaskNotification[]>([]);
    const [loading, setLoading] = useState(false);
    const prevTaskIds = useRef<Set<string>>(new Set());

    const playNotificationSound = () => {
        try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const oscillator = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioCtx.destination);

            oscillator.type = "sine";
            oscillator.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5 note
            oscillator.frequency.setValueAtTime(880, audioCtx.currentTime + 0.1); // A5 note

            gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.35);

            oscillator.start(audioCtx.currentTime);
            oscillator.stop(audioCtx.currentTime + 0.35);
        } catch (e) {
            console.warn("Could not play notification sound:", e);
        }
    };

    const fetchUrgentTasks = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/tasks/urgent");
            if (!res.ok) return;
            const data = await res.json();
            const newTasks: TaskNotification[] = data.tasks || [];

            const currentIds = new Set(newTasks.map((t) => t.id));

            // Tocar som de notificação apenas se houver uma nova tarefa urgente
            if (prevTaskIds.current.size > 0) {
                let hasNew = false;
                for (const id of currentIds) {
                    if (!prevTaskIds.current.has(id)) {
                        hasNew = true;
                        break;
                    }
                }
                if (hasNew) {
                    playNotificationSound();
                }
            }

            setTasks(newTasks);
            prevTaskIds.current = currentIds;
        } catch { } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUrgentTasks();
        const interval = setInterval(fetchUrgentTasks, 60 * 1000); // Polling a cada 1 minuto
        return () => clearInterval(interval);
    }, []);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        const handleClickOutside = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [open]);

    const overdueCount = tasks.filter((t) => t.isOverdue).length;
    const totalCount = tasks.length;

    const formatDue = (t: TaskNotification) => {
        const date = new Date(t.dueDate);
        const dateStr = date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        return t.dueTime ? `${dateStr} às ${t.dueTime}` : dateStr;
    };

    return (
        <div ref={containerRef} className="relative" style={{ zIndex: 50 }}>
            <Button
                variant="ghost"
                size="sm"
                className="relative h-9 w-9 p-0"
                onClick={() => {
                    if (!open) fetchUrgentTasks();
                    setOpen((prev) => !prev);
                }}
                title="Notificações de tarefas"
            >
                <Bell className="h-5 w-5" />
                {totalCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold animate-pulse">
                        {totalCount > 9 ? "9+" : totalCount}
                    </span>
                )}
            </Button>

            {open && (
                <div
                    className="absolute top-full mt-2 w-80 bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-border right-0"
                    style={{ zIndex: 9999 }}
                >
                    <div className="flex items-center justify-between px-4 py-3 border-b">
                        <div className="flex items-center gap-2">
                            <Bell className="h-4 w-4" />
                            <span className="font-semibold text-sm">Tarefas Urgentes</span>
                            {overdueCount > 0 && (
                                <Badge variant="destructive" className="h-5 text-xs">
                                    {overdueCount} atrasada{overdueCount > 1 ? "s" : ""}
                                </Badge>
                            )}
                        </div>
                        <button
                            onClick={() => setOpen(false)}
                            className="text-muted-foreground hover:text-foreground"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="max-h-72 overflow-y-auto">
                        {loading ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                            </div>
                        ) : tasks.length === 0 ? (
                            <div className="py-8 text-center text-sm text-muted-foreground">
                                <Bell className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                Nenhuma tarefa urgente 🎉
                            </div>
                        ) : (
                            tasks.map((task) => (
                                <button
                                    key={task.id}
                                    onClick={() => {
                                        setOpen(false);
                                        // Navigate to calendar — the Agenda page will open
                                        const taskDate = new Date(task.dueDate);
                                        const dateStr = `${taskDate.getFullYear()}-${String(taskDate.getMonth() + 1).padStart(2, '0')}-${String(taskDate.getDate()).padStart(2, '0')}`;
                                        router.push(`/calendar?date=${dateStr}`);
                                    }}
                                    className={`w-full text-left px-4 py-3 hover:bg-muted transition-colors border-b last:border-b-0 ${task.isOverdue ? "bg-red-50 dark:bg-red-950/30" : "bg-amber-50 dark:bg-amber-950/30"}`}
                                >
                                    <div className="flex items-start gap-2">
                                        {task.isOverdue ? (
                                            <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                                        ) : (
                                            <Clock className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{task.title}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {task.isOverdue ? "⚠️ Atrasada — " : "⏰ Vence "}{formatDue(task)}
                                            </p>
                                            {task.client && (
                                                <p className="text-xs text-muted-foreground truncate">
                                                    Cliente: {task.client.name}
                                                </p>
                                            )}
                                        </div>
                                    </div>
                                </button>
                            ))
                        )}
                    </div>

                    {tasks.length > 0 && (
                        <div className="px-4 py-2 border-t">
                            <Button
                                variant="ghost"
                                className="w-full text-xs h-7"
                                onClick={() => { setOpen(false); router.push("/calendar"); }}
                            >
                                Ver todas as tarefas →
                            </Button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
