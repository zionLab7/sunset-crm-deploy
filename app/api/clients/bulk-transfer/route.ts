export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// PATCH /api/clients/bulk-transfer — Bulk transfer clients to another seller
export async function PATCH(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
        }

        const dbUser = await prisma.user.findUnique({ where: { email: user.email as string } });
        if (!dbUser) {
            return NextResponse.json({ error: "Usuário não encontrado" }, { status: 401 });
        }

        // Apenas GESTOR pode transferir clientes em massa
        if (dbUser.role !== "GESTOR") {
            return NextResponse.json({ error: "Acesso negado. Apenas gestores podem transferir clientes." }, { status: 403 });
        }

        const body = await request.json();
        const { clientIds, newUserId } = body;

        if (!clientIds || !Array.isArray(clientIds) || clientIds.length === 0) {
            return NextResponse.json({ error: "Nenhum cliente selecionado" }, { status: 400 });
        }

        if (!newUserId) {
            return NextResponse.json({ error: "Nenhum vendedor selecionado" }, { status: 400 });
        }

        // Verificar se o novo vendedor existe
        const targetUser = await prisma.user.findUnique({ where: { id: newUserId } });
        if (!targetUser) {
            return NextResponse.json({ error: "Vendedor de destino não encontrado" }, { status: 404 });
        }

        // Executar transferência em lote (updateMany)
        const updateResult = await prisma.client.updateMany({
            where: {
                id: { in: clientIds },
            },
            data: {
                assignedUserId: newUserId,
            },
        });

        // Registrar interação de transferência para cada cliente
        if (updateResult.count > 0) {
            await prisma.interaction.createMany({
                data: clientIds.map((clientId) => ({
                    clientId,
                    userId: dbUser.id,
                    type: "Sistema",
                    description: `Cliente transferido para o vendedor "${targetUser.name}".`,
                })),
            });
        }

        return NextResponse.json({
            success: true,
            count: updateResult.count,
            message: `${updateResult.count} cliente(s) transferido(s) com sucesso para o vendedor "${targetUser.name}".`,
        });
    } catch (error: any) {
        console.error("Erro na transferência em lote:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
