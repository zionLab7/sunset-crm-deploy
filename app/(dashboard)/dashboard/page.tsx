import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { DashboardStats } from "@/components/dashboard/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard } from "lucide-react";

export default async function DashboardPage() {
    const user = await requireAuth();

    // Buscar usuário real do banco pelo email (evita problema de ID stale da sessão)
    const dbUser = await prisma.user.findUnique({
        where: { email: user.email as string },
        select: { id: true, role: true, monthlyGoal: true, name: true },
    });

    if (!dbUser) {
        return <div>Usuário não encontrado</div>;
    }

    const { id: userId, role: userRole, monthlyGoal, name } = dbUser;

    // Buscar todos os estágios fechados (usa isClosedStage, não nome hardcoded)
    const closedStages = await prisma.pipelineStage.findMany({
        where: { isClosedStage: true },
        select: { id: true },
    });
    const closedStageIds = closedStages.map(s => s.id);

    // Buscar clientes fechados com interações de venda
    const closedClients = await prisma.client.findMany({
        where: {
            currentStageId: { in: closedStageIds },
            ...(userRole === "GESTOR" ? {} : { assignedUserId: userId }),
        },
        select: {
            id: true,
            potentialValue: true,
            interactions: {
                where: { type: "STATUS_CHANGE" },
                orderBy: { createdAt: "desc" },
                select: { metadata: true },
            },
        },
    });

    // Calcular currentValue: usa saleValue do SaleModal; fallback = potentialValue
    let currentValue = 0;
    for (const client of closedClients) {
        let saleValue: number | null = null;
        for (const interaction of client.interactions) {
            if (interaction.metadata) {
                try {
                    const meta = JSON.parse(interaction.metadata);
                    if (meta.saleValue != null) {
                        saleValue = parseFloat(String(meta.saleValue));
                        break;
                    }
                } catch { /* ignora JSON inválido */ }
            }
        }
        currentValue += saleValue !== null ? saleValue : client.potentialValue;
    }

    // Buscar todos os clientes para o funil e leads (sem os dados de interação — performance)
    const allClients = await prisma.client.findMany({
        where: userRole === "GESTOR" ? {} : { assignedUserId: userId },
        include: { currentStage: true },
    });

    // Tarefas atrasadas
    const hoje = new Date();
    const overdueTasks = await prisma.task.count({
        where: {
            ...(userRole === "GESTOR" ? {} : { userId }),
            dueDate: { lt: hoje },
            status: { not: "CONCLUIDA" },
        },
    });

    // Novos leads (Prospecção)
    const prospeccaoStage = await prisma.pipelineStage.findFirst({
        where: { name: "Prospecção" },
        select: { id: true },
    });
    const newLeads = allClients.filter(c => c.currentStageId === prospeccaoStage?.id).length;

    // Tarefas recentes
    const recentTasks = await prisma.task.findMany({
        where: userRole === "GESTOR" ? {} : { userId },
        include: { client: true, user: true },
        orderBy: { createdAt: "desc" },
        take: 5,
    });

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
                        Bem-vindo, {name}!
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Aqui está um resumo do seu desempenho
                    </p>
                </div>
                <LayoutDashboard className="h-8 w-8 text-muted-foreground" />
            </div>

            {/* Stats Cards */}
            <DashboardStats
                monthlyGoal={monthlyGoal || 0}
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

                {/* Funil de Vendas */}
                <Card>
                    <CardHeader>
                        <CardTitle>Funil de Vendas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-3">
                            {allClients.length === 0 ? (
                                <p className="text-sm text-muted-foreground">
                                    Nenhum cliente encontrado
                                </p>
                            ) : (
                                <>
                                    {Array.from(
                                        new Set(allClients.map((c) => c.currentStage.name))
                                    ).map((stageName) => {
                                        const stageClients = allClients.filter(
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
