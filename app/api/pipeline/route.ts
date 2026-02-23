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

        // Buscar estágios do pipeline
        const stages = await prisma.pipelineStage.findMany({
            orderBy: { order: "asc" },
        });

        // Buscar clientes (excluir arquivados do pipeline)
        const clients = await prisma.client.findMany({
            where: {
                ...(userRole === "GESTOR" ? {} : { assignedUserId: userId }),
                archivedFromPipeline: false,
            },
            include: {
                currentStage: true,
            },
        });

        // Organizar em colunas
        const columns = stages.map((stage) => ({
            id: stage.id,
            name: stage.name,
            color: stage.color,
            isClosedStage: stage.isClosedStage,
            clients: clients
                .filter((c) => c.currentStageId === stage.id)
                .map((c) => ({
                    id: c.id,
                    name: c.name,
                    potentialValue: c.potentialValue,
                    phone: c.phone,
                    currentStageId: c.currentStageId,
                })),
        }));

        return NextResponse.json({ columns });
    } catch (error) {
        console.error("Erro ao buscar pipeline:", error);
        return NextResponse.json(
            { error: "Erro ao buscar pipeline" },
            { status: 500 }
        );
    }
}
