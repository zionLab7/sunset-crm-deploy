import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
    try {
        // Testa conexão com o banco
        await prisma.$queryRaw`SELECT 1`;

        return NextResponse.json(
            {
                status: "ok",
                timestamp: new Date().toISOString(),
                uptime: process.uptime(),
            },
            { status: 200 }
        );
    } catch (error: any) {
        return NextResponse.json(
            {
                status: "error",
                error: error.message,
                timestamp: new Date().toISOString(),
            },
            { status: 503 }
        );
    }
}
