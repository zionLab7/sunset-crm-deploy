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

        const userId = (user as any).id;
        const userRole = (user as any).role;
        const clientId = params.id;
        const body = await request.json();

        const { type, description } = body;

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

        // Criar interação
        const interaction = await prisma.interaction.create({
            data: {
                type,
                description,
                clientId,
                userId,
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
