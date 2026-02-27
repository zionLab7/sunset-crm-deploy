export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// PATCH /api/tasks/[id] — Atualiza tarefa
export async function PATCH(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

        // Lookup by email to avoid stale session ID
        const dbUser = await prisma.user.findUnique({ where: { email: user.email as string } });
        if (!dbUser) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 401 });

        const userRole = dbUser.role;
        const taskId = params.id;
        const body = await request.json();

        const existingTask = await prisma.task.findUnique({ where: { id: taskId } });
        if (!existingTask) return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });

        // Permission check:
        // - Vendedor can ONLY update status on their own task
        // - Gestor can update everything
        if (userRole !== "GESTOR") {
            if (existingTask.userId !== dbUser.id) {
                return NextResponse.json({ error: "Sem permissão para editar esta tarefa" }, { status: 403 });
            }
            const allowedKeys = ["status"];
            const attemptedKeys = Object.keys(body);
            const forbidden = attemptedKeys.filter((k) => !allowedKeys.includes(k));
            if (forbidden.length > 0) {
                return NextResponse.json(
                    { error: "Vendedores só podem atualizar o status da tarefa" },
                    { status: 403 }
                );
            }
        }

        const { title, description, clientId, dueDate, dueTime, status, assignedUserId } = body;

        const updateData: any = {};
        if (title !== undefined) updateData.title = title;
        if (description !== undefined) updateData.description = description || null;
        if (clientId !== undefined) updateData.clientId = clientId || null;
        if (dueDate !== undefined) updateData.dueDate = new Date(dueDate);
        if (dueTime !== undefined) updateData.dueTime = dueTime || null;
        if (status !== undefined) {
            updateData.status = status;
            // Auto-set completedAt when marking as done
            if (status === "CONCLUIDA" && existingTask.status !== "CONCLUIDA") {
                updateData.completedAt = new Date();
            } else if (status !== "CONCLUIDA") {
                updateData.completedAt = null;
            }
        }
        if (userRole === "GESTOR" && assignedUserId !== undefined) {
            updateData.userId = assignedUserId;
        }

        const task = await prisma.task.update({
            where: { id: taskId },
            data: updateData,
            include: {
                client: { select: { id: true, name: true } },
                user: { select: { id: true, name: true } },
            },
        });

        return NextResponse.json({ task });
    } catch (error: any) {
        console.error("Erro ao atualizar tarefa:", error);
        return NextResponse.json({ error: "Erro ao atualizar tarefa" }, { status: 500 });
    }
}

// DELETE /api/tasks/[id] — Deleta tarefa (somente GESTOR)
export async function DELETE(
    _request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

        const dbUser = await prisma.user.findUnique({ where: { email: user.email as string } });
        if (!dbUser) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 401 });

        // Only GESTOR can delete tasks
        if (dbUser.role !== "GESTOR") {
            return NextResponse.json(
                { error: "Apenas gestores podem excluir tarefas" },
                { status: 403 }
            );
        }

        const existingTask = await prisma.task.findUnique({ where: { id: params.id } });
        if (!existingTask) return NextResponse.json({ error: "Tarefa não encontrada" }, { status: 404 });

        await prisma.task.delete({ where: { id: params.id } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Erro ao deletar tarefa:", error);
        return NextResponse.json({ error: "Erro ao deletar tarefa" }, { status: 500 });
    }
}
