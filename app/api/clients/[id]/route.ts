export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// GET /api/clients/[id] - Busca cliente específico com interações
export async function GET(
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

        const client = await prisma.client.findUnique({
            where: { id: clientId },
            include: {
                currentStage: true,
                assignedUser: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
                products: {
                    include: {
                        product: true
                    }
                },
                customFieldValues: {
                    include: {
                        customField: true
                    }
                },
                interactions: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                    orderBy: {
                        createdAt: "desc",
                    },
                },
                tasks: {
                    include: {
                        user: {
                            select: {
                                id: true,
                                name: true,
                            },
                        },
                    },
                    orderBy: {
                        dueDate: "asc",
                    },
                },
            },
        });

        if (!client) {
            return NextResponse.json(
                { error: "Cliente não encontrado" },
                { status: 404 }
            );
        }

        // Verificar permissão (vendedor só vê seus clientes)
        if (userRole !== "GESTOR" && client.assignedUserId !== userId) {
            return NextResponse.json(
                { error: "Sem permissão para ver este cliente" },
                { status: 403 }
            );
        }

        return NextResponse.json({ client });
    } catch (error) {
        console.error("Erro ao buscar cliente:", error);
        return NextResponse.json(
            { error: "Erro ao buscar cliente" },
            { status: 500 }
        );
    }
}

// PATCH /api/clients/[id] - Atualiza cliente
export async function PATCH(
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

        // Buscar cliente
        const existingClient = await prisma.client.findUnique({
            where: { id: clientId },
        });

        if (!existingClient) {
            return NextResponse.json(
                { error: "Cliente não encontrado" },
                { status: 404 }
            );
        }

        // Verificar permissão
        if (userRole !== "GESTOR" && existingClient.assignedUserId !== userId) {
            return NextResponse.json(
                { error: "Sem permissão para editar este cliente" },
                { status: 403 }
            );
        }

        const { name, phone, email, potentialValue, currentStageId, assignedUserId, customFields, productIds, cnpj } = body;

        // Preparar dados de atualização
        const updateData: any = {};
        if (name !== undefined) updateData.name = name;
        if (phone !== undefined) updateData.phone = phone || null;
        if (email !== undefined) updateData.email = email || null;
        if (cnpj !== undefined) updateData.cnpj = cnpj;
        if (potentialValue !== undefined) updateData.potentialValue = potentialValue;
        if (currentStageId !== undefined) updateData.currentStageId = currentStageId;

        // Apenas gestor pode reatribuir cliente
        if (userRole === "GESTOR" && assignedUserId !== undefined) {
            updateData.assignedUserId = assignedUserId;
        }

        // Atualizar cliente + custom fields + products em uma transação
        const client = await prisma.$transaction(async (tx) => {
            // 1. Atualizar dados básicos do cliente
            const updatedClient = await tx.client.update({
                where: { id: clientId },
                data: updateData,
            });

            // 2. Atualizar custom fields se fornecidos
            if (customFields) {
                // Deletar valores antigos
                await tx.customFieldValue.deleteMany({
                    where: { clientId: clientId },
                });

                // Criar novos valores
                if (Object.keys(customFields).length > 0) {
                    await tx.customFieldValue.createMany({
                        data: Object.entries(customFields).map(([fieldId, value]) => ({
                            customFieldId: fieldId,
                            clientId: clientId,
                            value: String(value),
                        })),
                    });
                }
            }

            // 3. Atualizar products se fornecidos
            if (productIds !== undefined) {
                // Deletar vínculos antigos
                await tx.clientProduct.deleteMany({
                    where: { clientId: clientId },
                });

                // Criar novos vínculos
                if (productIds.length > 0) {
                    await tx.clientProduct.createMany({
                        data: productIds.map((productId: string) => ({
                            clientId: clientId,
                            productId: productId,
                        })),
                    });
                }
            }

            // Retornar cliente atualizado com relações
            return tx.client.findUnique({
                where: { id: clientId },
                include: {
                    currentStage: true,
                    assignedUser: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        },
                    },
                    products: {
                        include: {
                            product: true
                        }
                    },
                    customFieldValues: {
                        include: {
                            customField: true
                        }
                    },
                },
            });
        });

        return NextResponse.json({ client });
    } catch (error) {
        console.error("Erro ao atualizar cliente:", error);
        return NextResponse.json(
            { error: "Erro ao atualizar cliente" },
            { status: 500 }
        );
    }
}
