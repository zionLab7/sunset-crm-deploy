export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const pipelineStageSchema = z.object({
    name: z.string().min(1, "Nome é obrigatório"),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor deve estar no formato hex (#RRGGBB)"),
    order: z.number().int().min(0),
});

// GET - Listar todas as fases
export async function GET(request: Request) {
    try {
        await requireRole("GESTOR");

        const stages = await prisma.pipelineStage.findMany({
            orderBy: { order: "asc" },
            include: {
                _count: {
                    select: {
                        clients: true,
                    },
                },
            },
        });

        return NextResponse.json({ stages });
    } catch (error: any) {
        if (error.message === "Acesso negado") {
            return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
        }

        console.error("Erro ao listar fases:", error);
        return NextResponse.json(
            { error: "Erro ao listar fases" },
            { status: 500 }
        );
    }
}

// POST - Criar nova fase
export async function POST(request: Request) {
    try {
        await requireRole("GESTOR");

        const body = await request.json();

        // Se não enviaram order, calcular automaticamente
        if (body.order === undefined) {
            const lastStage = await prisma.pipelineStage.findFirst({
                orderBy: { order: "desc" },
            });
            body.order = (lastStage?.order ?? -1) + 1;
        }

        const validatedData = pipelineStageSchema.parse(body);

        const stage = await prisma.pipelineStage.create({
            data: validatedData,
        });

        return NextResponse.json(stage);
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

        console.error("Erro ao criar fase:", error);
        return NextResponse.json(
            { error: error.message || "Erro ao criar fase" },
            { status: 500 }
        );
    }
}
