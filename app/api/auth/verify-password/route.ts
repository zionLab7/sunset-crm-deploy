import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user) {
            return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
        }

        const { password } = await request.json();
        if (!password) {
            return NextResponse.json({ valid: false });
        }

        // Find the current user and compare password
        const user = await prisma.user.findUnique({
            where: { id: (session.user as any).id },
            select: { password: true },
        });

        if (!user) {
            return NextResponse.json({ valid: false });
        }

        const isValid = await bcrypt.compare(password, user.password);
        return NextResponse.json({ valid: isValid });
    } catch (error) {
        return NextResponse.json({ error: "Erro interno" }, { status: 500 });
    }
}
