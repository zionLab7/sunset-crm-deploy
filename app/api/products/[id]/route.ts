export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const productSchema = z.object({
    name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
    stockCode: z.string().min(1, "Código do estoque é obrigatório"),
    costPrice: z.number().optional().nullable(),
    customFields: z.record(z.string()).optional(),
});

export async function PATCH(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
        if ((user as any).role !== "GESTOR") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

        const body = await request.json();
        const validatedData = productSchema.parse(body);

        const duplicate = await prisma.product.findFirst({
            where: { stockCode: validatedData.stockCode, NOT: { id: params.id } },
        });
        if (duplicate) {
            return NextResponse.json({ error: "Código do estoque já existe em outro produto" }, { status: 400 });
        }

        const product = await prisma.product.update({
            where: { id: params.id },
            data: {
                name: validatedData.name,
                stockCode: validatedData.stockCode,
                costPrice: validatedData.costPrice ?? null,
            },
        });

        if (validatedData.customFields !== undefined) {
            await prisma.customFieldValue.deleteMany({ where: { productId: params.id } });
            for (const [fieldId, value] of Object.entries(validatedData.customFields)) {
                if (value && String(value).trim() !== "") {
                    await prisma.customFieldValue.create({
                        data: { customFieldId: fieldId, productId: product.id, value: String(value) },
                    });
                }
            }
        }

        const productWithFields = await prisma.product.findUnique({
            where: { id: product.id },
            include: { customFieldValues: { include: { customField: true } } },
        });

        return NextResponse.json(productWithFields);
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
        }
        console.error("Erro ao atualizar produto:", error);
        return NextResponse.json({ error: error.message || "Erro ao atualizar produto" }, { status: 500 });
    }
}

export async function DELETE(
    request: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
        if ((user as any).role !== "GESTOR") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

        const product = await prisma.product.findUnique({
            where: { id: params.id },
            include: { clients: true },
        });
        if (!product) return NextResponse.json({ error: "Produto não encontrado" }, { status: 404 });
        if (product.clients.length > 0) {
            return NextResponse.json(
                { error: `Não é possível excluir produto vinculado a ${product.clients.length} cliente(s)` },
                { status: 400 }
            );
        }

        await prisma.product.delete({ where: { id: params.id } });
        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Erro ao excluir produto:", error);
        return NextResponse.json({ error: error.message || "Erro ao excluir produto" }, { status: 500 });
    }
}
