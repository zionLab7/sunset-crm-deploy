export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// GET — public for all authenticated users
export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

        const types = await prisma.interactionTypeConfig.findMany({
            orderBy: { order: "asc" },
        });
        return NextResponse.json({ types });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST — create new type (GESTOR only)
export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
        if ((user as any).role !== "GESTOR") return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

        const body = await request.json();
        const { name, emoji, color, isSaleType } = body;

        if (!name?.trim()) return NextResponse.json({ error: "Nome obrigatório" }, { status: 400 });

        const maxOrder = await prisma.interactionTypeConfig.aggregate({ _max: { order: true } });

        const type = await prisma.interactionTypeConfig.create({
            data: {
                name: name.trim(),
                emoji: emoji || "📝",
                color: color || "gray",
                isSaleType: isSaleType || false,
                isSystem: false,
                order: (maxOrder._max.order ?? 0) + 1,
            },
        });
        return NextResponse.json({ type }, { status: 201 });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
