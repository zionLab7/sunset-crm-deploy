export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// PATCH /api/clients/[id]/interactions/[interactionId] - Editar interação
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string; interactionId: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { email: user.email as string },
            select: { id: true, role: true },
        });

        if (!dbUser) {
            return NextResponse.json({ error: "Usuário não encontrado" }, { status: 401 });
        }

        const interaction = await prisma.interaction.findUnique({
            where: { id: params.interactionId },
        });

        if (!interaction) {
            return NextResponse.json({ error: "Interação não encontrada" }, { status: 404 });
        }

        // Somente o gestor pode editar interações de outros usuários
        if (dbUser.role !== "GESTOR" && interaction.userId !== dbUser.id) {
            return NextResponse.json(
                { error: "Sem permissão para editar esta interação" },
                { status: 403 }
            );
        }

        const body = await request.json();
        const { type, description, metadata } = body;

        const updateData: any = {};
        if (type !== undefined) updateData.type = type;
        if (description !== undefined) updateData.description = description;
        if (metadata !== undefined) {
            updateData.metadata = typeof metadata === "string" ? metadata : JSON.stringify(metadata);
        }

        const updated = await prisma.interaction.update({
            where: { id: params.interactionId },
            data: updateData,
            include: {
                user: {
                    select: { id: true, name: true },
                },
            },
        });

        return NextResponse.json({ interaction: updated });
    } catch (error) {
        console.error("Erro ao editar interação:", error);
        return NextResponse.json(
            { error: "Erro ao editar interação" },
            { status: 500 }
        );
    }
}

// DELETE /api/clients/[id]/interactions/[interactionId] - Deletar interação
export async function DELETE(
    request: NextRequest,
    { params }: { params: { id: string; interactionId: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({
            where: { email: user.email as string },
            select: { id: true, role: true },
        });

        if (!dbUser) {
            return NextResponse.json({ error: "Usuário não encontrado" }, { status: 401 });
        }

        // Somente gestor pode deletar interações
        if (dbUser.role !== "GESTOR") {
            return NextResponse.json(
                { error: "Apenas gestores podem deletar interações" },
                { status: 403 }
            );
        }

        await prisma.interaction.delete({
            where: { id: params.interactionId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Erro ao deletar interação:", error);
        return NextResponse.json(
            { error: "Erro ao deletar interação" },
            { status: 500 }
        );
    }
}
