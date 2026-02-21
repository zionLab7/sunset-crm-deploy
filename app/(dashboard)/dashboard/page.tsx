import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { DashboardStats } from "@/components/dashboard/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard } from "lucide-react";

export default async function DashboardPage() {
    const user = await requireAuth();
    const userId = (user as any).id;
    const userRole = (user as any).role;

    // Buscar dados do usuário
    const userData = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            monthlyGoal: true,
            name: true,
        },
    });

    // Buscar clientes do vendedor (ou todos se for gestor)
    const clients = await prisma.client.findMany({
        where: userRole === "GESTOR" ? {} : { assignedUserId: userId },
        include: {
            currentStage: true,
        },
    });

    // Calcular valor atual (soma dos clientes em "Fechamento")
    const closedStage = await prisma.pipelineStage.findFirst({
        where: { name: "Fechamento" },
    });

    const currentValue = clients
        .filter((c) => c.currentStageId === closedStage?.id)
        .reduce((sum, c) => sum + c.potentialValue, 0);

    // Buscar tarefas atrasadas
    const hoje = new Date();
    const overdueTasks = await prisma.task.count({
        where: {
            userId: userRole === "GESTOR" ? undefined : userId,
            dueDate: { lt: hoje },
            status: { not: "CONCLUIDA" },
        },
    });

    // Buscar novos leads (clientes em "Prospecção")
    const prospeccaoStage = await prisma.pipelineStage.findFirst({
        where: { name: "Prospecção" },
    });

    const newLeads = clients.filter(
        (c) => c.currentStageId === prospeccaoStage?.id
    ).length;

    // Buscar tarefas recentes
    const recentTasks = await prisma.task.findMany({
        where: userRole === "GESTOR" ? {} : { userId },
        include: {
            client: true,
            user: true,
        },
        orderBy: { createdAt: "desc" },
        take: 5,
    });

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                        Bem-vindo, {userData?.name}!
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Aqui está um resumo do seu desempenho
                    </p>
                </div>
                <LayoutDashboard className="h-8 w-8 text-muted-foreground" />
            </div>

            {/* Stats Cards */}
            <DashboardStats
                monthlyGoal={userData?.monthlyGoal || 0}
                currentValue={currentValue}
                overdueTasks={overdueTasks}
                newLeads={newLeads}
            />

            {/* Tarefas Recentes */}
            <div className="grid gap-4 md:grid-cols-2">
                <Card>
                    <CardHeader>
                        <CardTitle>Tarefas Recentes</CardTitle>
                    </CardHeader>
                    <CardContent>
                        {recentTasks.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                Nenhuma tarefa encontrada
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {recentTasks.map((task) => (
                                    <div
                                        key={task.id}
                                        className="flex items-start justify-between border-b pb-2 last:border-0"
                                    >
                                        <div className="flex-1">
                                            <p className="text-sm font-medium">{task.title}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {task.client?.name || "Sem cliente"}
                                            </p>
                                        </div>
                                        <span
                                            className={`text-xs px-2 py-1 rounded-full ${task.status === "CONCLUIDA"
                                                ? "bg-green-100 text-green-700"
                                                : task.status === "ATRASADA"
                                                    ? "bg-red-100 text-red-700"
                                                    : "bg-blue-100 text-blue-700"
                                                }`}
                                        >
                                            {task.status === "CONCLUIDA"
                                                ? "Concluída"
                                                : task.status === "ATRASADA"
                                                    ? "Atrasada"
                                                    : "Pendente"}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Atividade Recente */}
                <Card>
                    <CardHeader>
                        <CardTitle>Funil de Vendas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {clients.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    Nenhum cliente encontrado
                                </p>
                            ) : (
                                <>
                                    {Array.from(
                                        new Set(clients.map((c) => c.currentStage.name))
                                    ).map((stageName) => {
                                        const stageClients = clients.filter(
                                            (c) => c.currentStage.name === stageName
                                        );
                                        const stageColor = stageClients[0]?.currentStage.color;
                                        return (
                                            <div key={stageName} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-3 h-3 rounded-full"
                                                        style={{ backgroundColor: stageColor }}
                                                    />
                                                    <span className="text-sm font-medium">
                                                        {stageName}
                                                    </span>
                                                </div>
                                                <span className="text-sm text-muted-foreground">
                                                    {stageClients.length}{" "}
                                                    {stageClients.length === 1 ? "cliente" : "clientes"}
                                                </span>
                                            </div>
                                        );
                                    })}
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
