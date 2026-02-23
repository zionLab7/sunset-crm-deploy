export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const goalSchema = z.object({
    monthlyGoal: z.number().min(0, "Meta deve ser um valor positivo"),
});

// GET — retorna a meta atual do usuário logado
export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

        const dbUser = await prisma.user.findUnique({
            where: { email: user.email as string },
            select: { monthlyGoal: true },
        });

        return NextResponse.json({ monthlyGoal: dbUser?.monthlyGoal || 0 });
    } catch (error) {
        return NextResponse.json({ error: "Erro ao buscar meta" }, { status: 500 });
    }
}

// PATCH — atualiza a meta mensal (gestor only)
export async function PATCH(request: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
        if ((user as any).role !== "GESTOR") {
            return NextResponse.json({ error: "Apenas gestores podem definir a meta" }, { status: 403 });
        }

        const body = await request.json();
        const { monthlyGoal } = goalSchema.parse(body);

        const dbUser = await prisma.user.update({
            where: { email: user.email as string },
            data: { monthlyGoal },
            select: { monthlyGoal: true },
        });

        return NextResponse.json({ monthlyGoal: dbUser.monthlyGoal });
    } catch (error: any) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors[0].message }, { status: 400 });
        }
        return NextResponse.json({ error: "Erro ao atualizar meta" }, { status: 500 });
    }
}
