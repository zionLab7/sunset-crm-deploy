"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Edit, Trash2, CheckCircle2, Calendar } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import Link from "next/link";

interface Task {
    id: string;
    title: string;
    description: string | null;
    status: string;
    dueDate: string;
    client?: {
        id: string;
        name: string;
    };
    user: {
        id: string;
        name: string;
    };
}

interface TaskListProps {
    tasks: Task[];
    onEdit: (task: Task) => void;
    onRefresh: () => void;
    userRole?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; variant: any }> = {
    PENDENTE: {
        label: "Pendente",
        color: "bg-blue-500",
        variant: "default" as const,
    },
    ATRASADA: {
        label: "Atrasada",
        color: "bg-red-500",
        variant: "destructive" as const,
    },
    CONCLUIDA: {
        label: "Concluída",
        color: "bg-green-500",
        variant: "secondary" as const,
    },
};

export function TaskList({ tasks, onEdit, onRefresh, userRole }: TaskListProps) {
    const { confirm, ConfirmDialog } = useConfirm();
    const router = useRouter();
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const isGestor = userRole === "GESTOR";

    const handleToggleComplete = async (task: Task) => {
        try {
            const newStatus = task.status === "CONCLUIDA" ? "PENDENTE" : "CONCLUIDA";

            const response = await fetch(`/api/tasks/${task.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: newStatus }),
            });

            if (!response.ok) {
                throw new Error("Erro ao atualizar tarefa");
            }

            toast({
                title: newStatus === "CONCLUIDA" ? "✅ Tarefa concluída!" : "📝 Tarefa reaberta!",
                description: task.title,
            });

            onRefresh();
            router.refresh();
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro ao atualizar tarefa",
                description: "Tente novamente mais tarde.",
            });
        }
    };

    const handleDeleteClick = async (taskId: string, taskTitle: string) => {
        const confirmed = await confirm({
            title: "Excluir Tarefa",
            description: `Tem certeza que deseja deletar a tarefa "${taskTitle}"? Esta ação não pode ser desfeita.`,
            confirmText: "Excluir",
        });

        if (!confirmed) {
            return;
        }

        setDeletingId(taskId);
        try {
            const response = await fetch(`/api/tasks/${taskId}`, {
                method: "DELETE",
            });

            if (!response.ok) {
                throw new Error("Erro ao deletar tarefa");
            }

            toast({
                title: "🗑️ Tarefa deletada!",
                description: taskTitle,
            });

            onRefresh();
            router.refresh();
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro ao deletar tarefa",
                description: "Tente novamente mais tarde.",
            });
        } finally {
            setDeletingId(null);
        }
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const day = date.getDate().toString().padStart(2, '0');
        const month = (date.getMonth() + 1).toString().padStart(2, '0');
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    };

    if (tasks.length === 0) {
        return (
            <Card>
                <CardContent className="p-12 text-center">
                    <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                        Nenhuma tarefa encontrada com os filtros aplicados.
                    </p>
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-3">
            {tasks.map((task) => {
                const statusConfig = STATUS_CONFIG[task.status] || STATUS_CONFIG.PENDENTE;
                const isCompleted = task.status === "CONCLUIDA";

                return (
                    <Card
                        key={task.id}
                        className={`hover:shadow-md transition-shadow ${isCompleted ? "opacity-60" : ""
                            }`}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                                {/* Checkbox */}
                                <Checkbox
                                    checked={isCompleted}
                                    onCheckedChange={() => handleToggleComplete(task)}
                                    className="mt-1"
                                />

                                {/* Content */}
                                <div className="flex-1">
                                    <div className="flex items-start justify-between mb-2">
                                        <div>
                                            <h4
                                                className={`font-medium ${isCompleted ? "line-through text-muted-foreground" : ""
                                                    }`}
                                            >
                                                {task.title}
                                            </h4>
                                            {task.description && (
                                                <p className="text-sm text-muted-foreground mt-1">
                                                    {task.description}
                                                </p>
                                            )}
                                        </div>

                                        {/* Actions */}
                                        <div className="flex gap-1">
                                            <Button
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => onEdit(task)}
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            {isGestor && (
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={() => handleDeleteClick(task.id, task.title)}
                                                    disabled={deletingId === task.id}
                                                >
                                                    <Trash2 className="h-4 w-4 text-red-500" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Meta info */}
                                    <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
                                        <div className="flex items-center gap-1 flex-shrink-0">
                                            <Calendar className="h-3 w-3" />
                                            {formatDate(task.dueDate)}
                                        </div>
                                        {task.client && (
                                            <>
                                                <Separator orientation="vertical" className="h-4 flex-shrink-0" />
                                                <Link
                                                    href={`/clients/${task.client.id}`}
                                                    className="hover:underline truncate max-w-[150px]"
                                                >
                                                    {task.client.name}
                                                </Link>
                                            </>
                                        )}
                                        <Separator orientation="vertical" className="h-4 flex-shrink-0" />
                                        <Badge variant={statusConfig.variant} className="flex-shrink-0">
                                            {statusConfig.label}
                                        </Badge>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}

            <ConfirmDialog />
        </div>
    );
}
