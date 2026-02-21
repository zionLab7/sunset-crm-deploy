export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
        }

        const body = await request.json();
        const { clientId, newStageId } = body;

        if (!clientId || !newStageId) {
            return NextResponse.json(
                { error: "Dados inválidos" },
                { status: 400 }
            );
        }

        // Atualizar cliente
        const client = await prisma.client.update({
            where: { id: clientId },
            data: { currentStageId: newStageId },
            include: { currentStage: true },
        });

        // Registrar interação
        await prisma.interaction.create({
            data: {
                type: "STATUS_CHANGE",
                description: `Status alterado para ${client.currentStage.name}`,
                metadata: JSON.stringify({
                    newStage: client.currentStage.name,
                    newStageId: newStageId,
                }),
                clientId: clientId,
                userId: (user as any).id,
            },
        });

        return NextResponse.json({ success: true, client });
    } catch (error) {
        console.error("Erro ao mover cliente:", error);
        return NextResponse.json(
            { error: "Erro ao mover cliente" },
            { status: 500 }
        );
    }
}
