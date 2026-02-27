export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function POST(request: NextRequest) {
    try {
        const sessionUser = await getCurrentUser();
        if (!sessionUser) {
            return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
        }

        // Buscar usuário real do banco pelo email (evita problema de ID stale)
        const dbUser = await prisma.user.findUnique({
            where: { email: sessionUser.email! },
        });

        if (!dbUser) {
            return NextResponse.json({ error: "Usuário não encontrado" }, { status: 401 });
        }

        const body = await request.json();
        const { clientId, newStageId } = body;

        if (!clientId || !newStageId) {
            return NextResponse.json(
                { error: "Dados inválidos" },
                { status: 400 }
            );
        }

        // Atualizar cliente para o novo estágio
        const client = await prisma.client.update({
            where: { id: clientId },
            data: { currentStageId: newStageId },
            include: { currentStage: true },
        });

        // Registrar interação de mudança de status (SEM dados de venda — vendas são registradas separadamente)
        await prisma.interaction.create({
            data: {
                type: "STATUS_CHANGE",
                description: `Status alterado para ${client.currentStage.name}`,
                metadata: JSON.stringify({
                    newStage: client.currentStage.name,
                    newStageId: newStageId,
                }),
                clientId: clientId,
                userId: dbUser.id,
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
