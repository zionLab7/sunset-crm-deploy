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

        // Buscar o usuário real do banco pelo email (garante que o ID está correto)
        const dbUser = await prisma.user.findUnique({
            where: { email: user.email! },
            select: { id: true, role: true, monthlyGoal: true },
        });

        if (!dbUser) {
            return NextResponse.json({ error: "Usuário não encontrado" }, { status: 401 });
        }

        const { id: userId, role: userRole, monthlyGoal } = dbUser;

        // Buscar fases de venda fechada
        const closedStages = await prisma.pipelineStage.findMany({
            where: { isClosedStage: true },
            select: { id: true },
        });
        const closedStageIds = closedStages.map(s => s.id);

        // Buscar clientes fechados (com as interações de venda)
        const closedClients = await prisma.client.findMany({
            where: {
                currentStageId: { in: closedStageIds },
                ...(userRole === "GESTOR" ? {} : { assignedUserId: userId }),
            },
            include: {
                interactions: {
                    where: { type: "STATUS_CHANGE" },
                    orderBy: { createdAt: "desc" },
                },
            },
        });

        // Para cada cliente fechado: usar saleValue do metadata da interação de venda,
        // com fallback para potentialValue se ainda não registrado via modal
        let currentValue = 0;
        for (const client of closedClients) {
            let saleValue: number | null = null;

            // Procurar a interação com saleValue registrado pelo SaleModal
            for (const interaction of client.interactions) {
                if (interaction.metadata) {
                    try {
                        const meta = JSON.parse(interaction.metadata);
                        if (meta.saleValue != null) {
                            saleValue = parseFloat(String(meta.saleValue));
                            break;
                        }
                    } catch { /* ignorar JSON inválido */ }
                }
            }

            // Fallback: potentialValue do cliente (casos migrados ou sem modal)
            currentValue += saleValue !== null ? saleValue : client.potentialValue;
        }

        // Todos os clientes (para newLeads e tarefas)
        const allClients = await prisma.client.findMany({
            where: userRole === "GESTOR" ? {} : { assignedUserId: userId },
            select: { id: true, currentStageId: true },
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
        const newLeads = prospeccaoStage
            ? allClients.filter(c => c.currentStageId === prospeccaoStage.id).length
            : 0;

        return NextResponse.json({
            monthlyGoal: monthlyGoal || 0,
            currentValue,
            overdueTasks,
            newLeads,
        });
    } catch (error) {
        console.error("Erro ao buscar estatísticas:", error);
        return NextResponse.json({ error: "Erro ao buscar estatísticas" }, { status: 500 });
    }
}
