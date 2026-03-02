"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { CalendarView } from "@/components/calendar/calendar-view";
import { TaskList } from "@/components/calendar/task-list";
import { TaskModal } from "@/components/calendar/task-modal";
import { DayTasksModal } from "@/components/calendar/day-tasks-modal";
import { Plus, Calendar as CalendarIcon, List } from "lucide-react";
import { toast } from "@/hooks/use-toast";

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

interface Client {
    id: string;
    name: string;
}

interface User {
    id: string;
    name: string;
}

export default function CalendarPage() {
    const { data: session } = useSession();
    const [tasks, setTasks] = useState<Task[]>([]);
    const [clients, setClients] = useState<Client[]>([]);
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [taskModalOpen, setTaskModalOpen] = useState(false);
    const [dayTasksModalOpen, setDayTasksModalOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [selectedDate, setSelectedDate] = useState<Date | undefined>();
    const [selectedDayDate, setSelectedDayDate] = useState<Date | null>(null);
    const [statusFilter, setStatusFilter] = useState<string>("all");

    useEffect(() => {
        fetchData();
    }, [statusFilter]);

    const fetchData = async () => {
        try {
            // Buscar tarefas
            const params = new URLSearchParams();
            if (statusFilter !== "all") {
                params.append("status", statusFilter);
            }

            const tasksRes = await fetch(`/api/tasks?${params}`);
            const tasksData = await tasksRes.json();
            setTasks(tasksData.tasks || []);

            // Buscar clientes (para o select)
            const clientsRes = await fetch("/api/clients");
            const clientsData = await clientsRes.json();
            setClients(
                (clientsData.clients || []).map((c: any) => ({
                    id: c.id,
                    name: c.name,
                }))
            );

            // Buscar usuários (vendedores) se for gestor
            if ((session?.user as any)?.role === "GESTOR") {
                const usersRes = await fetch("/api/users");
                const usersData = await usersRes.json();
                setUsers(
                    (usersData.users || []).map((u: any) => ({
                        id: u.id,
                        name: u.name,
                    }))
                );
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro ao carregar dados",
                description: "Tente novamente mais tarde.",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleNewTask = (date?: Date) => {
        setSelectedTask(null);
        setSelectedDate(date);
        setTaskModalOpen(true);
    };

    const handleEditTask = (task: Task) => {
        setSelectedTask(task);
        setSelectedDate(undefined);
        setTaskModalOpen(true);
    };

    const handleDayClick = (date: Date) => {
        // Abrir modal com as tarefas do dia
        setSelectedDayDate(date);
        setDayTasksModalOpen(true);
    };

    const handleNewTaskFromDay = () => {
        // Fechar modal de tarefas do dia e abrir modal de criação
        setDayTasksModalOpen(false);
        handleNewTask(selectedDayDate || undefined);
    };

    const handleEditTaskFromDay = (task: Task) => {
        // Fechar modal de tarefas do dia e abrir modal de edição
        setDayTasksModalOpen(false);
        handleEditTask(task);
    };

    // Filtrar tarefas do dia selecionado
    const getTasksForDay = (date: Date | null) => {
        if (!date) return [];

        // Normalizar data para comparação (apenas ano-mês-dia)
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const dateStr = `${year}-${month}-${day}`;

        return tasks.filter((task) => {
            const taskDate = new Date(task.dueDate);
            const taskYear = taskDate.getFullYear();
            const taskMonth = String(taskDate.getMonth() + 1).padStart(2, '0');
            const taskDay = String(taskDate.getDate()).padStart(2, '0');
            const taskDateStr = `${taskYear}-${taskMonth}-${taskDay}`;

            return taskDateStr === dateStr;
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Agenda</h1>
                    <p className="text-muted-foreground mt-1">
                        Gerencie suas tarefas e compromissos
                    </p>
                </div>
                <Button onClick={() => handleNewTask()}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Tarefa
                </Button>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="calendar" className="space-y-4">
                <div className="flex items-center justify-between">
                    <TabsList>
                        <TabsTrigger value="calendar">
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            Calendário
                        </TabsTrigger>
                        <TabsTrigger value="list">
                            <List className="h-4 w-4 mr-2" />
                            Lista
                        </TabsTrigger>
                    </TabsList>

                    {/* Filtros (apenas na aba Lista) */}
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filtrar por status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os status</SelectItem>
                            <SelectItem value="PENDING">Pendentes</SelectItem>
                            <SelectItem value="OVERDUE">Atrasadas</SelectItem>
                            <SelectItem value="COMPLETED">Concluídas</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Tab: Calendário */}
                <TabsContent value="calendar" className="mt-6">
                    <CalendarView tasks={tasks} onDayClick={handleDayClick} />
                </TabsContent>

                {/* Tab: Lista */}
                <TabsContent value="list" className="mt-6">
                    <TaskList
                        tasks={tasks}
                        onEdit={handleEditTask}
                        onRefresh={fetchData}
                        userRole={(session?.user as any)?.role as string}
                    />
                </TabsContent>
            </Tabs>

            {/* Modal de Tarefa */}
            <TaskModal
                open={taskModalOpen}
                onClose={() => {
                    setTaskModalOpen(false);
                    setSelectedTask(null);
                    setSelectedDate(undefined);
                }}
                onSuccess={fetchData}
                clients={clients}
                users={users}
                currentUserId={(session?.user as any)?.id as string}
                userRole={(session?.user as any)?.role as string}
                initialData={
                    selectedTask
                        ? {
                            id: selectedTask.id,
                            title: selectedTask.title,
                            description: selectedTask.description || undefined,
                            clientId: selectedTask.client?.id || undefined,
                            userId: selectedTask.user.id,
                            dueDate: selectedTask.dueDate.split("T")[0],
                            status: selectedTask.status as any,
                        }
                        : undefined
                }
                selectedDate={selectedDate}
            />

            {/* Modal de Tarefas do Dia */}
            <DayTasksModal
                open={dayTasksModalOpen}
                onClose={() => {
                    setDayTasksModalOpen(false);
                    setSelectedDayDate(null);
                }}
                date={selectedDayDate}
                tasks={getTasksForDay(selectedDayDate)}
                onNewTask={handleNewTaskFromDay}
                onEditTask={handleEditTaskFromDay}
            />
        </div>
    );
}
