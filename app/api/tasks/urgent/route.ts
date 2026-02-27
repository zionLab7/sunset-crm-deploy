export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/session";

// GET /api/tasks/urgent — tasks that are overdue or due today (for notification bell)
export async function GET() {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

        const dbUser = await prisma.user.findUnique({ where: { email: user.email as string } });
        if (!dbUser) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 401 });

        const now = new Date();
        const todayEnd = new Date(now);
        todayEnd.setHours(23, 59, 59, 999);

        const tasks = await prisma.task.findMany({
            where: {
                status: { not: "CONCLUIDA" },
                dueDate: { lte: todayEnd },
                userId: dbUser.id,  // sempre filtra pelo usuário logado
            },
            include: {
                client: { select: { id: true, name: true } },
            },
            orderBy: { dueDate: "asc" },
            take: 20,
        });

        const result = tasks.map((t) => ({
            id: t.id,
            title: t.title,
            dueDate: t.dueDate.toISOString(),
            dueTime: (t as any).dueTime || null,
            status: t.status,
            client: t.client,
            isOverdue: t.dueDate < now,
        }));

        return NextResponse.json({ tasks: result });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
