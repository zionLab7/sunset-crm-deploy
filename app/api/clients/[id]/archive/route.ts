export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
        }

        const client = await prisma.client.findUnique({
            where: { id: params.id },
            select: { archivedFromPipeline: true, name: true },
        });

        if (!client) {
            return NextResponse.json({ error: "Cliente não encontrado" }, { status: 404 });
        }

        const newState = !client.archivedFromPipeline;

        // Atualizar o campo
        const updated = await prisma.client.update({
            where: { id: params.id },
            data: { archivedFromPipeline: newState },
        });

        // Registrar interação
        await prisma.interaction.create({
            data: {
                type: "STATUS_CHANGE",
                description: newState
                    ? `Cliente "${client.name}" foi arquivado do pipeline de vendas`
                    : `Cliente "${client.name}" foi restaurado ao pipeline de vendas`,
                clientId: params.id,
                userId: (user as any).id,
            },
        });

        return NextResponse.json({
            archived: updated.archivedFromPipeline,
            message: newState
                ? "Cliente arquivado do pipeline"
                : "Cliente restaurado ao pipeline",
        });
    } catch (error) {
        console.error("Erro ao arquivar/restaurar cliente:", error);
        return NextResponse.json(
            { error: "Erro ao processar operação" },
            { status: 500 }
        );
    }
}
