export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// POST /api/clients/[id]/interactions - Cria nova interação
export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
        }

        // Buscar usuário real do banco pelo email (evita FK inválido por session ID stale)
        const dbUser = await prisma.user.findUnique({
            where: { email: user.email as string },
            select: { id: true, role: true },
        });

        if (!dbUser) {
            return NextResponse.json({ error: "Usuário não encontrado" }, { status: 401 });
        }

        const userId = dbUser.id;
        const userRole = dbUser.role;
        const clientId = params.id;
        const body = await request.json();

        const { type, description, metadata } = body;

        // Validações
        if (!type || !description) {
            return NextResponse.json(
                { error: "Tipo e descrição são obrigatórios" },
                { status: 400 }
            );
        }

        // Verificar se cliente existe e se tem permissão
        const client = await prisma.client.findUnique({
            where: { id: clientId },
        });

        if (!client) {
            return NextResponse.json(
                { error: "Cliente não encontrado" },
                { status: 404 }
            );
        }

        if (userRole !== "GESTOR" && client.assignedUserId !== userId) {
            return NextResponse.json(
                { error: "Sem permissão para interagir com este cliente" },
                { status: 403 }
            );
        }

        // Criar interação (com metadata opcional para registros de venda)
        const interaction = await prisma.interaction.create({
            data: {
                type,
                description,
                clientId,
                userId,
                ...(metadata ? { metadata } : {}),
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        return NextResponse.json({ interaction }, { status: 201 });
    } catch (error) {
        console.error("Erro ao criar interação:", error);
        return NextResponse.json(
            { error: "Erro ao criar interação" },
            { status: 500 }
        );
    }
}
