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

        // Garantir que temos o usuário real do banco pelo email (evita problema de ID stale)
        const dbUser = await prisma.user.findUnique({
            where: { email: sessionUser.email! },
        });

        if (!dbUser) {
            return NextResponse.json({ error: "Usuário não encontrado" }, { status: 401 });
        }

        const body = await request.json();
        const { clientId, newStageId, saleData } = body;

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

        // Montar metadata da interação
        const metadata: Record<string, any> = {
            newStage: client.currentStage.name,
            newStageId: newStageId,
        };

        // Se houver dados de venda (estágio fechado), incluí-los
        if (saleData) {
            metadata.saleValue = saleData.saleValue;
            metadata.productId = saleData.productId;
            metadata.productName = saleData.productName;
            metadata.quantity = saleData.quantity;
            metadata.notes = saleData.notes;
        }

        // Determinar descrição da interação
        const description = saleData
            ? `✅ Venda fechada! Produto: ${saleData.productName} (x${saleData.quantity}) — U$ ${Number(saleData.saleValue).toFixed(2)}`
            : `Status alterado para ${client.currentStage.name}`;

        // Registrar interação usando ID real do banco
        await prisma.interaction.create({
            data: {
                type: "STATUS_CHANGE",
                description,
                metadata: JSON.stringify(metadata),
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
