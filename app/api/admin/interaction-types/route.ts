export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// GET /api/admin/interaction-types - List all type configs (fallback to seed if empty)
export async function GET() {
    try {
        let types = await prisma.interactionTypeConfig.findMany({
            orderBy: { order: "asc" },
        });

        // Seed default system types if none exist
        if (types.length === 0) {
            const defaults = [
                { name: "Ligação", emoji: "📞", isSaleType: false, isSystem: true, color: "blue", order: 1 },
                { name: "Visita", emoji: "🏢", isSaleType: false, isSystem: true, color: "purple", order: 2 },
                { name: "Email", emoji: "📧", isSaleType: false, isSystem: true, color: "green", order: 3 },
                { name: "Nota", emoji: "📝", isSaleType: false, isSystem: true, color: "gray", order: 4 },
                { name: "Venda", emoji: "💰", isSaleType: true, isSystem: true, color: "amber", order: 5 },
                { name: "Amostra", emoji: "🧪", isSaleType: false, isSystem: true, color: "indigo", order: 6 },
            ];

            await prisma.interactionTypeConfig.createMany({
                data: defaults,
            });

            types = await prisma.interactionTypeConfig.findMany({
                orderBy: { order: "asc" },
            });
        } else {
            // Check if Amostra exists, if not, create it
            const hasAmostra = types.some(t => t.name === "Amostra");
            if (!hasAmostra) {
                await prisma.interactionTypeConfig.create({
                    data: {
                        name: "Amostra",
                        emoji: "🧪",
                        isSaleType: false,
                        isSystem: true,
                        color: "indigo",
                        order: types.length + 1,
                    },
                });
                types = await prisma.interactionTypeConfig.findMany({
                    orderBy: { order: "asc" },
                });
            }
        }

        return NextResponse.json({ types });
    } catch (error: any) {
        console.error("Erro ao buscar tipos de interação:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST /api/admin/interaction-types - Create new custom type config (GESTOR only)
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
        if ((user as any).role !== "GESTOR") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

        const body = await request.json();
        const { name, emoji, color, isSaleType } = body;

        if (!name) {
            return NextResponse.json({ error: "Nome é obrigatório" }, { status: 400 });
        }

        // Get max order
        const maxOrderType = await prisma.interactionTypeConfig.findFirst({
            orderBy: { order: "desc" },
            select: { order: true },
        });
        const nextOrder = (maxOrderType?.order || 0) + 1;

        const type = await prisma.interactionTypeConfig.create({
            data: {
                name,
                emoji: emoji || "📝",
                color: color || "gray",
                isSaleType: !!isSaleType,
                isSystem: false,
                order: nextOrder,
            },
        });

        return NextResponse.json({ type }, { status: 201 });
    } catch (error: any) {
        console.error("Erro ao criar tipo de interação:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
