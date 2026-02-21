export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { requireRole, getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

// GET - Retorna todas as configurações (ou filtra por key)
export async function GET(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const key = searchParams.get("key");

        if (key) {
            const config = await prisma.systemConfig.findUnique({
                where: { key },
            });
            return NextResponse.json({ config });
        }

        const configs = await prisma.systemConfig.findMany();
        return NextResponse.json({ configs });
    } catch (error: any) {
        console.error("Erro ao buscar configurações:", error);
        return NextResponse.json(
            { error: error.message || "Erro ao buscar configurações" },
            { status: 500 }
        );
    }
}

// POST - Criar ou atualizar configuração (GESTOR only)
export async function POST(request: Request) {
    try {
        await requireRole("GESTOR");

        const { key, value } = await request.json();

        if (!key || typeof key !== "string") {
            return NextResponse.json(
                { error: "Chave é obrigatória" },
                { status: 400 }
            );
        }

        const config = await prisma.systemConfig.upsert({
            where: { key },
            update: { value: value || "" },
            create: { key, value: value || "" },
        });

        return NextResponse.json(config);
    } catch (error: any) {
        if (error.message?.includes("Acesso negado")) {
            return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
        }

        console.error("Erro ao salvar configuração:", error);
        return NextResponse.json(
            { error: error.message || "Erro ao salvar configuração" },
            { status: 500 }
        );
    }
}
