export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const entityType = searchParams.get("entityType") || "CLIENT";

        const customFields = await prisma.customField.findMany({
            where: {
                entityType: entityType as any,
            },
            orderBy: {
                order: "asc",
            },
        });

        return NextResponse.json({ customFields });
    } catch (error: any) {
        console.error("Erro ao buscar campos customizados:", error);
        return NextResponse.json(
            { error: error.message || "Erro ao buscar campos customizados" },
            { status: 500 }
        );
    }
}
