export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// GET /api/admin/product-visibility/[productId] — get hidden fields for a product
export async function GET(
    _request: NextRequest,
    { params }: { params: { productId: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

        const visibilities = await prisma.productFieldVisibility.findMany({
            where: { productId: params.productId },
        });
        return NextResponse.json({ visibilities });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/admin/product-visibility/[productId] — set hidden fields for a product (GESTOR only)
export async function POST(
    request: NextRequest,
    { params }: { params: { productId: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
        if ((user as any).role !== "GESTOR") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

        const body = await request.json();
        // body.hiddenFields: string[] — array of fieldKey values to hide from VENDEDOR
        const { hiddenFields }: { hiddenFields: string[] } = body;

        await prisma.$transaction(async (tx) => {
            // Remove all existing visibility rules for this product
            await tx.productFieldVisibility.deleteMany({ where: { productId: params.productId } });
            // Insert new rules
            if (hiddenFields.length > 0) {
                await tx.productFieldVisibility.createMany({
                    data: hiddenFields.map((fieldKey) => ({
                        productId: params.productId,
                        fieldKey,
                        hiddenForRole: "VENDEDOR",
                        customFieldId: fieldKey.startsWith("__") ? null : fieldKey,
                    })),
                });
            }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
