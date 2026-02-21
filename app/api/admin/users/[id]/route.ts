export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { requireRole, getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

const updateUserSchema = z.object({
    name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").optional(),
    email: z.string().email("Email inválido").optional(),
    password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres").optional(),
    role: z.enum(["VENDEDOR", "GESTOR"]).optional(),
});

// PATCH - Editar usuário
export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await requireRole("GESTOR");

        const body = await request.json();
        const validatedData = updateUserSchema.parse(body);

        // Se está alterando email, verificar se já existe
        if (validatedData.email) {
            const existing = await prisma.user.findUnique({
                where: { email: validatedData.email },
            });

            if (existing && existing.id !== params.id) {
                return NextResponse.json(
                    { error: "Email já cadastrado" },
                    { status: 400 }
                );
            }
        }

        // Se está alterando senha, hash
        const updateData: any = { ...validatedData };
        if (validatedData.password) {
            updateData.password = await bcrypt.hash(validatedData.password, 10);
        }

        const user = await prisma.user.update({
            where: { id: params.id },
            data: updateData,
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
            },
        });

        return NextResponse.json({ user });
    } catch (error: any) {
        if (error.name === "ZodError") {
            return NextResponse.json(
                { error: error.errors[0].message },
                { status: 400 }
            );
        }

        console.error("Erro ao atualizar usuário:", error);
        return NextResponse.json(
            { error: "Erro ao atualizar usuário" },
            { status: 500 }
        );
    }
}

// DELETE - Excluir usuário
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await requireRole("GESTOR");

        const currentUser = await getCurrentUser();
        const currentUserId = (currentUser as any)?.id;

        // Não pode excluir a si mesmo
        if (params.id === currentUserId) {
            return NextResponse.json(
                { error: "Você não pode excluir sua própria conta" },
                { status: 400 }
            );
        }

        // Verificar se tem clientes ou tarefas vinculadas
        const user = await prisma.user.findUnique({
            where: { id: params.id },
            include: {
                _count: {
                    select: {
                        clients: true,
                        tasks: true,
                    },
                },
            },
        });

        if (!user) {
            return NextResponse.json(
                { error: "Usuário não encontrado" },
                { status: 404 }
            );
        }

        const totalLinked = user._count.clients + user._count.tasks;

        if (totalLinked > 0) {
            return NextResponse.json(
                { error: `Não é possível excluir usuário com ${totalLinked} item(ns) vinculado(s) (clientes ou tarefas)` },
                { status: 400 }
            );
        }

        // Excluir usuário
        await prisma.user.delete({
            where: { id: params.id },
        });

        return NextResponse.json({
            message: "Usuário excluído com sucesso",
        });
    } catch (error: any) {
        if (error.message === "Acesso negado") {
            return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
        }

        console.error("Erro ao excluir usuário:", error);
        console.error("Stack trace:", error.stack);

        return NextResponse.json(
            { error: error.message || "Erro ao excluir usuário" },
            { status: 500 }
        );
    }
}
