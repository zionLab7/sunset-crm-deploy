export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// POST /api/clients/import — Bulk import clients
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
        }

        const userId = (user as any).id;
        const userRole = (user as any).role;
        const body = await request.json();

        const { clients, currentStageId, assignedUserId } = body;

        if (!clients || !Array.isArray(clients) || clients.length === 0) {
            return NextResponse.json(
                { error: "Nenhum cliente para importar" },
                { status: 400 }
            );
        }

        // Determine stage — use provided or first stage
        let finalStageId = currentStageId;
        if (!finalStageId) {
            const firstStage = await prisma.pipelineStage.findFirst({
                orderBy: { order: "asc" },
            });
            finalStageId = firstStage?.id;
        }

        if (!finalStageId) {
            return NextResponse.json(
                { error: "Nenhuma fase do pipeline configurada" },
                { status: 400 }
            );
        }

        // Determine assigned user
        const finalAssignedUserId =
            userRole === "GESTOR" && assignedUserId ? assignedUserId : userId;

        // Get existing CNPJs to detect duplicates
        const existingClients = await prisma.client.findMany({
            select: { cnpj: true },
            where: { cnpj: { not: null } },
        });
        const existingCnpjs = new Set(
            existingClients.map((c) => c.cnpj).filter(Boolean)
        );

        let created = 0;
        let skipped = 0;
        const errors: string[] = [];

        for (const client of clients) {
            try {
                const name = client.name?.toString().trim();
                if (!name) {
                    skipped++;
                    errors.push(`Linha ignorada: nome vazio`);
                    continue;
                }

                // Clean CNPJ
                const cnpj = client.cnpj
                    ? client.cnpj.toString().replace(/\D/g, "")
                    : null;

                // Check duplicate CNPJ
                if (cnpj && existingCnpjs.has(cnpj)) {
                    skipped++;
                    errors.push(`"${name}": CNPJ ${cnpj} já cadastrado`);
                    continue;
                }

                // Create the client
                const newClient = await prisma.client.create({
                    data: {
                        name,
                        cnpj: cnpj || null,
                        phone: client.phone?.toString().trim() || null,
                        email: client.email?.toString().trim() || null,
                        potentialValue: client.potentialValue
                            ? parseFloat(client.potentialValue)
                            : 0,
                        currentStageId: finalStageId,
                        assignedUserId: finalAssignedUserId,
                    },
                });

                // Record import interaction
                await prisma.interaction.create({
                    data: {
                        type: "NOTE",
                        description: "Cliente importado via planilha",
                        clientId: newClient.id,
                        userId: userId,
                    },
                });

                // Track CNPJ to avoid duplicates within same import
                if (cnpj) {
                    existingCnpjs.add(cnpj);
                }

                created++;
            } catch (err: any) {
                skipped++;
                errors.push(
                    `"${client.name || "?"}": ${err.message || "Erro desconhecido"}`
                );
            }
        }

        return NextResponse.json({
            created,
            skipped,
            total: clients.length,
            errors: errors.slice(0, 20), // Limit error messages
        });
    } catch (error: any) {
        console.error("Erro ao importar clientes:", error);
        return NextResponse.json(
            { error: error.message || "Erro ao importar clientes" },
            { status: 500 }
        );
    }
}
