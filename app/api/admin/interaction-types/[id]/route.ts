export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// PATCH /api/admin/interaction-types/[id] — update type (GESTOR only)
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
        if ((user as any).role !== "GESTOR") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

        const body = await request.json();
        const { name, emoji, color, isSaleType, order } = body;

        const type = await prisma.interactionTypeConfig.update({
            where: { id: params.id },
            data: {
                ...(name !== undefined && { name }),
                ...(emoji !== undefined && { emoji }),
                ...(color !== undefined && { color }),
                ...(isSaleType !== undefined && { isSaleType }),
                ...(order !== undefined && { order }),
            },
        });
        return NextResponse.json({ type });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE /api/admin/interaction-types/[id] — delete type (GESTOR only, non-system)
export async function DELETE(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
        if ((user as any).role !== "GESTOR") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

        const existing = await prisma.interactionTypeConfig.findUnique({ where: { id: params.id } });
        if (!existing) return NextResponse.json({ error: "Tipo não encontrado" }, { status: 404 });
        if (existing.isSystem) return NextResponse.json({ error: "Tipos de sistema não podem ser excluídos" }, { status: 400 });

        await prisma.interactionTypeConfig.delete({ where: { id: params.id } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
