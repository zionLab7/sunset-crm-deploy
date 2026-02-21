export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { requireAuth, requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
    try {
        // Apenas gestores podem acessar relatórios
        await requireRole("GESTOR");

        const { searchParams } = new URL(request.url);
        const period = searchParams.get("period") || "month";

        // Calcular intervalo de datas baseado no período
        const now = new Date();
        let startDate = new Date();

        switch (period) {
            case "week":
                startDate.setDate(now.getDate() - 7);
                break;
            case "month":
                startDate.setMonth(now.getMonth() - 1);
                break;
            case "quarter":
                startDate.setMonth(now.getMonth() - 3);
                break;
            case "year":
                startDate.setFullYear(now.getFullYear() - 1);
                break;
            default:
                startDate.setMonth(now.getMonth() - 1);
        }

        // 1. RANKING DE VENDEDORES
        // Buscar todos os vendedores com seus clientes
        const vendedores = await prisma.user.findMany({
            where: { role: "VENDEDOR" },
            include: {
                clients: {
                    where: {
                        createdAt: {
                            gte: startDate,
                            lte: now,
                        },
                    },
                    include: {
                        currentStage: true,
                    },
                },
                tasks: {
                    where: {
                        createdAt: {
                            gte: startDate,
                            lte: now,
                        },
                    },
                },
            },
        });

        // Buscar estágio de "Fechamento" para calcular vendas
        const fechamentoStage = await prisma.pipelineStage.findFirst({
            where: { name: "Fechamento" },
        });

        const vendedoresRanking = vendedores.map((vendedor) => {
            const totalClientes = vendedor.clients.length;
            const clientesFechados = vendedor.clients.filter(
                (c) => c.currentStageId === fechamentoStage?.id
            );
            const totalVendas = clientesFechados.reduce(
                (sum, c) => sum + c.potentialValue,
                0
            );
            const conversao =
                totalClientes > 0
                    ? (clientesFechados.length / totalClientes) * 100
                    : 0;

            return {
                id: vendedor.id,
                name: vendedor.name,
                totalClientes,
                clientesFechados: clientesFechados.length,
                totalVendas,
                conversao: Math.round(conversao),
            };
        }).sort((a, b) => b.totalVendas - a.totalVendas);

        // 2. FUNIL DE CONVERSÃO
        const stages = await prisma.pipelineStage.findMany({
            orderBy: { order: "asc" },
        });

        const clientesNoPerodo = await prisma.client.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: now,
                },
            },
            include: {
                currentStage: true,
            },
        });

        const funnelData = stages.map((stage) => {
            const count = clientesNoPerodo.filter(
                (c) => c.currentStageId === stage.id
            ).length;
            return {
                stage: stage.name,
                count,
                color: stage.color,
            };
        });

        // 3. VENDAS POR DIA (últimos 30 dias)
        const last30Days = new Date();
        last30Days.setDate(now.getDate() - 30);

        const vendasPorDia: { date: string; vendas: number }[] = [];

        // Gerar array de datas dos últimos 30 dias
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(now.getDate() - i);
            const dateStr = date.toISOString().split("T")[0];

            // Contar clientes que chegaram ao "Fechamento" nesse dia
            const vendasNoDia = await prisma.client.count({
                where: {
                    currentStageId: fechamentoStage?.id,
                    updatedAt: {
                        gte: new Date(dateStr + "T00:00:00"),
                        lt: new Date(dateStr + "T23:59:59"),
                    },
                },
            });

            vendasPorDia.push({
                date: dateStr,
                vendas: vendasNoDia,
            });
        }

        // 4. MÉTRICAS GERAIS
        const totalClientes = await prisma.client.count({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: now,
                },
            },
        });

        const clientesFechados = await prisma.client.count({
            where: {
                currentStageId: fechamentoStage?.id,
                createdAt: {
                    gte: startDate,
                    lte: now,
                },
            },
        });

        const clientesAtivos = clientesNoPerodo.filter(
            (c) => c.currentStageId !== fechamentoStage?.id
        ).length;

        const taxaConversaoGeral =
            totalClientes > 0 ? (clientesFechados / totalClientes) * 100 : 0;

        const valorTotalVendas = clientesNoPerodo
            .filter((c) => c.currentStageId === fechamentoStage?.id)
            .reduce((sum, c) => sum + c.potentialValue, 0);

        const ticketMedio =
            clientesFechados > 0 ? valorTotalVendas / clientesFechados : 0;

        return NextResponse.json({
            vendedoresRanking,
            funnelData,
            vendasPorDia,
            metricas: {
                totalClientes,
                clientesAtivos,
                clientesFechados,
                taxaConversaoGeral: Math.round(taxaConversaoGeral),
                ticketMedio: Math.round(ticketMedio),
                valorTotalVendas,
            },
        });
    } catch (error: any) {
        console.error("Erro ao buscar relatórios:", error);
        return NextResponse.json(
            { error: error.message || "Erro ao buscar relatórios" },
            { status: 500 }
        );
    }
}
