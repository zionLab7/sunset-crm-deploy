export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
        }

        const userId = (user as any).id;
        const userRole = (user as any).role;

        // Buscar dados do usuário
        const userData = await prisma.user.findUnique({
            where: { id: userId },
            select: { monthlyGoal: true },
        });

        // Buscar fases de venda fechada
        const closedStages = await prisma.pipelineStage.findMany({
            where: { isClosedStage: true },
            select: { id: true },
        });
        const closedStageIds = closedStages.map(s => s.id);

        const clients = await prisma.client.findMany({
            where: userRole === "GESTOR" ? {} : { assignedUserId: userId },
        });

        const currentValue = clients
            .filter((c) => closedStageIds.includes(c.currentStageId))
            .reduce((sum, c) => sum + c.potentialValue, 0);

        // Tarefas atrasadas
        const hoje = new Date();
        const overdueTasks = await prisma.task.count({
            where: {
                userId: userRole === "GESTOR" ? undefined : userId,
                dueDate: { lt: hoje },
                status: { not: "CONCLUIDA" },
            },
        });

        // Novos leads
        const prospeccaoStage = await prisma.pipelineStage.findFirst({
            where: { name: "Prospecção" },
        });

        const newLeads = prospeccaoStage
            ? clients.filter((c) => c.currentStageId === prospeccaoStage.id).length
            : 0;

        return NextResponse.json({
            monthlyGoal: userData?.monthlyGoal || 0,
            currentValue,
            overdueTasks,
            newLeads,
        });
    } catch (error) {
        console.error("Erro ao buscar estatísticas:", error);
        return NextResponse.json(
            { error: "Erro ao buscar estatísticas" },
            { status: 500 }
        );
    }
}
