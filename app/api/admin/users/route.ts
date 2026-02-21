export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

const userSchema = z.object({
    name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
    email: z.string().email("Email inválido"),
    password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
    role: z.enum(["VENDEDOR", "GESTOR"]),
});

// GET - Listar todos os usuários
export async function GET(request: Request) {
    try {
        await requireRole("GESTOR");

        const users = await prisma.user.findMany({
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
                _count: {
                    select: {
                        clients: true,
                        tasks: true,
                    },
                },
            },
            orderBy: {
                name: "asc",
            },
        });

        return NextResponse.json({ users });
    } catch (error: any) {
        if (error.message === "Acesso negado") {
            return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
        }

        console.error("Erro ao listar usuários:", error);
        return NextResponse.json(
            { error: "Erro ao listar usuários" },
            { status: 500 }
        );
    }
}

// POST - Criar novo usuário
export async function POST(request: Request) {
    try {
        await requireRole("GESTOR");

        const body = await request.json();
        const validatedData = userSchema.parse(body);

        // Verificar se email já existe
        const existingUser = await prisma.user.findUnique({
            where: { email: validatedData.email },
        });

        if (existingUser) {
            return NextResponse.json(
                { error: "Email já cadastrado" },
                { status: 400 }
            );
        }

        // Hash da senha
        const hashedPassword = await bcrypt.hash(validatedData.password, 10);

        const user = await prisma.user.create({
            data: {
                name: validatedData.name,
                email: validatedData.email,
                password: hashedPassword,
                role: validatedData.role,
            },
            select: {
                id: true,
                name: true,
                email: true,
                role: true,
                createdAt: true,
            },
        });

        return NextResponse.json(user);
    } catch (error: any) {
        if (error.message === "Acesso negado") {
            return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
        }

        if (error instanceof z.ZodError) {
            return NextResponse.json(
                { error: error.errors[0].message },
                { status: 400 }
            );
        }

        console.error("Erro ao criar usuário:", error);
        return NextResponse.json(
            { error: error.message || "Erro ao criar usuário" },
            { status: 500 }
        );
    }
}
