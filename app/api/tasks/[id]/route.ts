export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// PATCH /api/tasks/[id] - Atualiza tarefa
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
        const taskId = params.id;
        const body = await request.json();

        // Buscar tarefa
        const existingTask = await prisma.task.findUnique({
            where: { id: taskId },
        });

        if (!existingTask) {
            return NextResponse.json(
                { error: "Tarefa não encontrada" },
                { status: 404 }
            );
        }

        // Verificar permissão
        if (userRole !== "GESTOR" && existingTask.userId !== userId) {
            return NextResponse.json(
                { error: "Sem permissão para editar esta tarefa" },
                { status: 403 }
            );
        }

        const { title, description, clientId, dueDate, status } = body;

        // Preparar dados de atualização
        const updateData: any = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description || null;
        if (clientId !== undefined) updateData.clientId = clientId || null;
        if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
        if (status !== undefined) updateData.status = status;

        const task = await prisma.task.update({
            where: { id: taskId },
            data: updateData,
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
        });

        return NextResponse.json({ task });
    } catch (error) {
        console.error("Erro ao atualizar tarefa:", error);
        return NextResponse.json(
            { error: "Erro ao atualizar tarefa" },
            { status: 500 }
        );
    }
}

// DELETE /api/tasks/[id] - Deleta tarefa
export async function DELETE(
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
        const taskId = params.id;

        // Buscar tarefa
        const existingTask = await prisma.task.findUnique({
            where: { id: taskId },
        });

        if (!existingTask) {
            return NextResponse.json(
                { error: "Tarefa não encontrada" },
                { status: 404 }
            );
        }

        // Verificar permissão
        if (userRole !== "GESTOR" && existingTask.userId !== userId) {
            return NextResponse.json(
                { error: "Sem permissão para deletar esta tarefa" },
                { status: 403 }
            );
        }

        await prisma.task.delete({
            where: { id: taskId },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Erro ao deletar tarefa:", error);
        return NextResponse.json(
            { error: "Erro ao deletar tarefa" },
            { status: 500 }
        );
    }
}
