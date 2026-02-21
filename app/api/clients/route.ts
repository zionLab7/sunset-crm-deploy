export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// GET /api/clients - Lista clientes com filtros
export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
        }

        const userId = (user as any).id;
        const userRole = (user as any).role;

        // Pegar parâmetros de busca
        const searchParams = request.nextUrl.searchParams;
        const search = searchParams.get("search");
        const stageId = searchParams.get("stageId");

        // Construir where clause
        const where: any = {};

        // MUDANÇA: Vendedores agora veem TODOS os clientes (para evitar duplicação)
        // O Kanban continua mostrando apenas clientes do vendedor
        // if (userRole !== "GESTOR") {
        //     where.assignedUserId = userId;
        // }


        // Filtro de busca (nome ou CNPJ)
        if (search) {
            where.OR = [
                { name: { contains: search, mode: "insensitive" } },
                { cnpj: { contains: search.replace(/\D/g, "") } },
            ];
        }

        // Filtro por estágio
        if (stageId) {
            where.currentStageId = stageId;
        }

        const clients = await prisma.client.findMany({
            where,
            include: {
                currentStage: true,
                assignedUser: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
            orderBy: {
                potentialValue: "desc",
            },
        });

        return NextResponse.json({ clients });
    } catch (error) {
        console.error("Erro ao buscar clientes:", error);
        return NextResponse.json(
            { error: "Erro ao buscar clientes" },
            { status: 500 }
        );
    }
}

// POST /api/clients - Cria novo cliente
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
        }

        const userId = (user as any).id;
        const userRole = (user as any).role;
        const body = await request.json();

        const {
            name,
            cnpj,
            phone,
            email,
            potentialValue,
            currentStageId,
            assignedUserId,
            customFields,
            productIds,
        } = body;

        // Validações
        if (!name || !cnpj) {
            return NextResponse.json(
                { error: "Nome e CNPJ são obrigatórios" },
                { status: 400 }
            );
        }

        // CNPJ único
        const existingClient = await prisma.client.findUnique({
            where: { cnpj: cnpj.replace(/\D/g, "") },
        });

        if (existingClient) {
            return NextResponse.json(
                { error: "CNPJ já cadastrado" },
                { status: 400 }
            );
        }

        // Se não for gestor, só pode criar cliente para si mesmo
        const finalAssignedUserId = userRole === "GESTOR" && assignedUserId
            ? assignedUserId
            : userId;

        // Pegar primeiro estágio se não especificado
        let finalStageId = currentStageId;
        if (!finalStageId) {
            const firstStage = await prisma.pipelineStage.findFirst({
                orderBy: { order: "asc" },
            });
            finalStageId = firstStage?.id;
        }

        const client = await prisma.client.create({
            data: {
                name,
                cnpj: cnpj.replace(/\D/g, ""),
                phone: phone || null,
                email: email || null,
                potentialValue: potentialValue || 0,
                currentStageId: finalStageId!,
                assignedUserId: finalAssignedUserId,
            },
            include: {
                currentStage: true,
                assignedUser: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                    },
                },
            },
        });

        // Criar campos customizados se houver
        if (customFields && Object.keys(customFields).length > 0) {
            const customFieldValues = Object.entries(customFields).map(
                ([fieldId, value]) => ({
                    customFieldId: fieldId,
                    clientId: client.id,
                    value: String(value),
                })
            );

            await prisma.customFieldValue.createMany({
                data: customFieldValues,
            });
        }

        // Vincular produtos se houver
        if (productIds && Array.isArray(productIds) && productIds.length > 0) {
            const clientProducts = productIds.map((productId: string) => ({
                clientId: client.id,
                productId: productId,
                quantity: 1,
            }));

            await prisma.clientProduct.createMany({
                data: clientProducts,
            });
        }

        // Criar interação de criação
        await prisma.interaction.create({
            data: {
                type: "NOTE",
                description: "Cliente criado no sistema",
                clientId: client.id,
                userId: userId,
            },
        });

        return NextResponse.json({ client }, { status: 201 });
    } catch (error) {
        console.error("Erro ao criar cliente:", error);
        return NextResponse.json(
            { error: "Erro ao criar cliente" },
            { status: 500 }
        );
    }
}
