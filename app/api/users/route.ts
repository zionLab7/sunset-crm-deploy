export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser, requireRole } from "@/lib/session";

// GET /api/users - Lista usuários (apenas para gestores)
export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
        }

        // Apenas gestores podem listar todos os usuários
        await requireRole("GESTOR");

        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
            },
            orderBy: {
                name: "asc",
            },
        });

        return NextResponse.json({ users });
    } catch (error) {
        console.error("Erro ao buscar usuários:", error);

        // Verificar se é erro de autorização
        if (error instanceof Error && error.message.includes("autorização")) {
            return NextResponse.json(
                { error: "Acesso negado" },
                { status: 403 }
            );
        }

        return NextResponse.json(
            { error: "Erro ao buscar usuários" },
            { status: 500 }
        );
    }
}
