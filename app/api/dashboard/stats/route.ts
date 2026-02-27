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

        const dbUser = await prisma.user.findUnique({
            where: { email: user.email! },
            select: { id: true, role: true, monthlyGoal: true },
        });

        if (!dbUser) {
            return NextResponse.json({ error: "Usuário não encontrado" }, { status: 401 });
        }

        const { id: userId, role: userRole, monthlyGoal } = dbUser;

        // Fetch all interaction types marked as sale types
        let saleTypeNames: string[] = [];
        try {
            const saleTypes = await (prisma as any).interactionTypeConfig.findMany({
                where: { isSaleType: true },
                select: { name: true },
            });
            saleTypeNames = saleTypes.map((t: any) => t.name);
        } catch {
            // fallback: use "Venda" if table not available
            saleTypeNames = ["Venda"];
        }

        // Start of current month
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        // Fetch interactions this month that are sale types with a saleValue in metadata
        const saleInteractions = await prisma.interaction.findMany({
            where: {
                type: { in: saleTypeNames },
                metadata: { contains: "saleValue" },
                createdAt: { gte: startOfMonth },
                ...(userRole === "GESTOR" ? {} : { userId }),
            },
            select: { metadata: true },
        });

        // Sum up actual sale values from metadata
        let currentValue = 0;
        for (const interaction of saleInteractions) {
            if (interaction.metadata) {
                try {
                    const meta = JSON.parse(interaction.metadata);
                    if (meta.saleValue != null) {
                        currentValue += parseFloat(String(meta.saleValue));
                    }
                } catch { /* ignore invalid JSON */ }
            }
        }

        // All clients for newLeads count
        const allClients = await prisma.client.findMany({
            where: userRole === "GESTOR" ? {} : { assignedUserId: userId },
            select: { id: true, currentStageId: true },
        });

        // Overdue tasks
        const hoje = new Date();
        const overdueTasks = await prisma.task.count({
            where: {
                ...(userRole === "GESTOR" ? {} : { userId }),
                dueDate: { lt: hoje },
                status: { not: "CONCLUIDA" },
            },
        });

        // New leads (Prospecção)
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
