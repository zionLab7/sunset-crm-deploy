export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const customFieldSchema = z.object({
    name: z.string().min(1, "Nome é obrigatório"),
    fieldType: z.enum(["text", "number", "date", "select", "calculated"]),
    entityType: z.enum(["CLIENT", "PRODUCT"]),
    options: z.string().nullable().optional(),
    formula: z.string().nullable().optional(),
    required: z.boolean().default(false),
    order: z.number().default(0),
    highlightColor: z.string().nullable().optional(),
});

// POST - Criar campo customizado
export async function POST(request: Request) {
    try {
        await requireRole("GESTOR");

        const body = await request.json();
        const validatedData = customFieldSchema.parse(body);

        const customField = await prisma.customField.create({
            data: {
                name: validatedData.name,
                fieldType: validatedData.fieldType,
                entityType: validatedData.entityType,
                options: validatedData.options ?? null,
                formula: validatedData.formula ?? null,
                required: validatedData.required,
                order: validatedData.order,
                highlightColor: validatedData.highlightColor ?? null,
            },
        });

        return NextResponse.json(customField);
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

        console.error("Erro ao criar campo customizado:", error);
        return NextResponse.json(
            { error: error.message || "Erro ao criar campo customizado" },
            { status: 500 }
        );
    }
}
