export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const reorderSchema = z.object({
    stages: z.array(z.object({
        id: z.string(),
        order: z.number().int().min(0),
    })),
});

// PATCH - Reordenar fases
export async function PATCH(request: Request) {
    try {
        await requireRole("GESTOR");

        const body = await request.json();
        const validatedData = reorderSchema.parse(body);

        // Atualizar ordem de cada fase em uma transação
        await prisma.$transaction(
            validatedData.stages.map((stage) =>
                prisma.pipelineStage.update({
                    where: { id: stage.id },
                    data: { order: stage.order },
                })
            )
        );

        return NextResponse.json({ success: true });
    } catch (error: any) {
        if (error.message === "Acesso negado") {
            return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
        }

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: error.errors[0].message },
                { status: 400 }
            );
        }

        console.error("Erro ao reordenar fases:", error);
        return NextResponse.json(
            { error: error.message || "Erro ao reordenar fases" },
            { status: 500 }
        );
    }
}
