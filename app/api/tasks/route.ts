export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// GET /api/tasks - Lista tarefas com filtros
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
        const status = searchParams.get("status");
        const clientId = searchParams.get("clientId");
        const month = searchParams.get("month");
        const year = searchParams.get("year");

        // Construir where clause
        const where: any = {};

        // Filtrar por role
        if (userRole !== "GESTOR") {
            where.userId = userId;
        }

        // Filtro por status
        if (status && status !== "all") {
            where.status = status;
        }

        // Filtro por cliente
        if (clientId) {
            where.clientId = clientId;
        }

        // Filtro por mês/ano (para calendário)
        if (month && year) {
            const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
            const endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);

            where.dueDate = {
                gte: startDate,
                lte: endDate,
            };
        }

        const tasks = await prisma.task.findMany({
            where,
            include: {
                client: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
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
        });

        return NextResponse.json({ tasks });
    } catch (error) {
        console.error("Erro ao buscar tarefas:", error);
        return NextResponse.json(
            { error: "Erro ao buscar tarefas" },
            { status: 500 }
        );
    }
}

// POST /api/tasks - Cria nova tarefa
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
        }

        const userId = (user as any).id;
        const userRole = (user as any).role;
        const body = await request.json();

        const { title, description, clientId, dueDate, status, assignedUserId } = body;

        // Validações
        if (!title || !dueDate) {
            return NextResponse.json(
                { error: "Título e data são obrigatórios" },
                { status: 400 }
            );
        }

        // Se não for gestor, só pode criar tarefa para si mesmo
        const finalUserId = userRole === "GESTOR" && assignedUserId
            ? assignedUserId
            : userId;

        // Validar e limpar clientId
        const cleanClientId = clientId && clientId !== "none" && clientId.trim() !== ""
            ? clientId
            : null;

        const task = await prisma.task.create({
            data: {
                title,
                description: description && description.trim() !== "" ? description : null,
                clientId: cleanClientId,
                dueDate: new Date(dueDate),
                status: status || "PENDENTE",
                userId: finalUserId,
            },
            include: {
                ...(cleanClientId && {
                    client: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                }),
                user: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        return NextResponse.json({ task }, { status: 201 });
    } catch (error) {
        console.error("❌ Erro ao criar tarefa:", error);
        return NextResponse.json(
            { error: "Erro ao criar tarefa", details: error instanceof Error ? error.message : String(error) },
            { status: 500 }
        );
    }
}
