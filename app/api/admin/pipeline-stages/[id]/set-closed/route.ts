export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// PATCH - Marcar/desmarcar como fase de venda fechada
export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await requireRole("GESTOR");

        const { isClosedStage } = await request.json();

        // Se estamos marcando como true, desmarcar todas as outras
        if (isClosedStage === true) {
            await prisma.pipelineStage.updateMany({
                where: { isClosedStage: true },
                data: { isClosedStage: false },
            });
        }

        // Atualizar a fase específica
        const stage = await prisma.pipelineStage.update({
            where: { id: params.id },
            data: { isClosedStage },
        });

        return NextResponse.json({ stage });
    } catch (error: any) {
        if (error.message === "Acesso negado") {
            return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
        }

        console.error("Erro ao atualizar isClosedStage:", error);
        console.error("Stack trace:", error.stack);
        console.error("Error details:", JSON.stringify(error, null, 2));

        return NextResponse.json(
            { error: error.message || "Erro ao atualizar fase" },
            { status: 500 }
        );
    }
}
