export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const customFieldSchema = z.object({
    name: z.string().min(1, "Nome é obrigatório"),
    fieldType: z.enum(["text", "number", "date", "select", "calculated"]),
    options: z.string().nullable().optional(),
    formula: z.string().nullable().optional(),
    required: z.boolean().default(false),
    order: z.number().default(0),
    highlightColor: z.string().nullable().optional(),
});

// PATCH - Editar campo customizado
export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await requireRole("GESTOR");

        const body = await request.json();
        const validatedData = customFieldSchema.parse(body);

        const customField = await prisma.customField.update({
            where: { id: params.id },
            data: {
                name: validatedData.name,
                fieldType: validatedData.fieldType,
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

        console.error("Erro ao atualizar campo customizado:", error);
        return NextResponse.json(
            { error: error.message || "Erro ao atualizar campo customizado" },
            { status: 500 }
        );
    }
}

// DELETE - Excluir campo customizado
export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        await requireRole("GESTOR");

        // Verificar se há valores vinculados
        const fieldWithValues = await prisma.customField.findUnique({
            where: { id: params.id },
            include: {
                values: true,
            },
        });

        if (!fieldWithValues) {
            return NextResponse.json(
                { error: "Campo não encontrado" },
                { status: 404 }
            );
        }

        if (fieldWithValues.values.length > 0) {
            return NextResponse.json(
                { error: `Não é possível excluir campo com ${fieldWithValues.values.length} valor(es) vinculado(s)` },
                { status: 400 }
            );
        }

        await prisma.customField.delete({
            where: { id: params.id },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        if (error.message === "Acesso negado") {
            return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
        }

        console.error("Erro ao excluir campo customizado:", error);
        return NextResponse.json(
            { error: error.message || "Erro ao excluir campo customizado" },
            { status: 500 }
        );
    }
}
