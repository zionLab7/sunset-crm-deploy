export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const productSchema = z.object({
    name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
    stockCode: z.string().min(1, "Código do estoque é obrigatório"),
    costPrice: z.number().optional().nullable(), // Preço de custo (gestor only)
    customFields: z.record(z.string()).optional(),
});

export async function GET(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const search = searchParams.get("search") || "";

        const products = await prisma.product.findMany({
            where: search
                ? {
                    OR: [
                        { name: { contains: search, mode: "insensitive" } },
                        { stockCode: { contains: search, mode: "insensitive" } },
                    ],
                }
                : {},
            orderBy: { name: "asc" },
            include: {
                clients: {
                    include: {
                        client: { select: { id: true, name: true } },
                    },
                },
                customFieldValues: {
                    include: { customField: true },
                },
            },
        });

        const isGestor = (user as any).role === "GESTOR";

        // Gestor vê costPrice; vendedor não
        const filteredProducts = products.map((p) => ({
            ...p,
            costPrice: isGestor ? p.costPrice : undefined,
        }));

        return NextResponse.json({ products: filteredProducts });
    } catch (error: any) {
        console.error("Erro ao buscar produtos:", error);
        return NextResponse.json({ error: error.message || "Erro ao buscar produtos" }, { status: 500 });
    }
}

export async function POST(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
        }
        if ((user as any).role !== "GESTOR") {
            return NextResponse.json({ error: "Acesso negado. Apenas gestores podem criar produtos." }, { status: 403 });
        }

        const body = await request.json();
        const validatedData = productSchema.parse(body);

        const existingProduct = await prisma.product.findUnique({
            where: { stockCode: validatedData.stockCode },
        });
        if (existingProduct) {
            return NextResponse.json({ error: "Código do estoque já existe" }, { status: 400 });
        }

        const product = await prisma.product.create({
            data: {
                name: validatedData.name,
                stockCode: validatedData.stockCode,
                costPrice: validatedData.costPrice ?? null,
            },
        });

        if (validatedData.customFields) {
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
        console.error("Erro ao criar produto:", error);
        return NextResponse.json({ error: error.message || "Erro ao criar produto" }, { status: 500 });
    }
}
