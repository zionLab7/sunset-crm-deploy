export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateStageSchema = z.object({
    name: z.string().min(1, "Nome é obrigatório").optional(),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor deve estar no formato hex (#RRGGBB)").optional(),
    order: z.number().int().min(0).optional(),
});

// PATCH - Editar fase
export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await requireRole("GESTOR");

        const body = await request.json();
        const validatedData = updateStageSchema.parse(body);

        const stage = await prisma.pipelineStage.update({
            where: { id: params.id },
            data: validatedData,
        });

        return NextResponse.json(stage);
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

        console.error("Erro ao atualizar fase:", error);
        return NextResponse.json(
            { error: error.message || "Erro ao atualizar fase" },
            { status: 500 }
        );
    }
}

// DELETE - Excluir fase
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await requireRole("GESTOR");

        // Verificar se há clientes vinculados
        const stageWithClients = await prisma.pipelineStage.findUnique({
            where: { id: params.id },
            include: {
                _count: {
                    select: {
                        clients: true,
                    },
                },
            },
        });

        if (!stageWithClients) {
            return NextResponse.json(
                { error: "Fase não encontrada" },
                { status: 404 }
            );
        }

        if (stageWithClients._count.clients > 0) {
            return NextResponse.json(
                { error: `Não é possível excluir fase com ${stageWithClients._count.clients} cliente(s) vinculado(s)` },
                { status: 400 }
            );
        }

        await prisma.pipelineStage.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        if (error.message === "Acesso negado") {
            return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
        }

        console.error("Erro ao excluir fase:", error);
        return NextResponse.json(
            { error: error.message || "Erro ao excluir fase" },
            { status: 500 }
        );
    }
}
