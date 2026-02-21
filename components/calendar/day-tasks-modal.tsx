"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, Plus } from "lucide-react";

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

interface DayTasksModalProps {
    open: boolean;
    onClose: () => void;
    date: Date | null;
    tasks: Task[];
    onNewTask: () => void;
    onEditTask: (task: Task) => void;
}

const STATUS_CONFIG: Record<string, { label: string; variant: any }> = {
    PENDING: { label: "Pendente", variant: "default" as const },
    OVERDUE: { label: "Atrasada", variant: "destructive" as const },
    COMPLETED: { label: "Concluída", variant: "secondary" as const },
};

export function DayTasksModal({
    open,
    onClose,
    date,
    tasks,
    onNewTask,
    onEditTask,
}: DayTasksModalProps) {
    if (!date) return null;

    const dateFormatted = date.toLocaleDateString("pt-BR", {
        day: "numeric",
        month: "long",
        year: "numeric",
    });

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5" />
                        Tarefas de {dateFormatted}
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* Botão Nova Tarefa */}
                    <Button onClick={onNewTask} className="w-full">
                        <Plus className="h-4 w-4 mr-2" />
                        Nova Tarefa para este dia
                    </Button>

                    {/* Lista de Tarefas */}
                    {tasks.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>Nenhuma tarefa para este dia</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {tasks.map((task) => {
                                const statusConfig =
                                    STATUS_CONFIG[task.status] || STATUS_CONFIG.PENDING;

                                return (
                                    <div
                                        key={task.id}
                                        onClick={() => onEditTask(task)}
                                        className="p-4 border rounded-lg hover:bg-accent cursor-pointer transition-colors"
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <h4 className="font-medium">{task.title}</h4>
                                            <Badge variant={statusConfig.variant}>
                                                {statusConfig.label}
                                            </Badge>
                                        </div>

                                        {task.description && (
                                            <p className="text-sm text-muted-foreground mb-2">
                                                {task.description}
                                            </p>
                                        )}

                                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                            {task.client && (
                                                <span className="bg-muted px-2 py-1 rounded">
                                                    {task.client.name}
                                                </span>
                                            )}
                                            <span>{task.user.name}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
