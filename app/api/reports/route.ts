export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
    try {
        // Apenas gestores podem acessar relatórios
        await requireRole("GESTOR");

        const { searchParams } = new URL(request.url);
        const period = searchParams.get("period") || "month";

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

        // Buscar estágios fechados
        const closedStages = await prisma.pipelineStage.findMany({
            where: { isClosedStage: true },
        });
        const closedStageIds = closedStages.map((s) => s.id);

        // Helper: extrair saleValue de interactions de venda
        // Busca todas as interações STATUS_CHANGE com saleValue no metadata
        const getSaleValueFromInteractions = async (clientIds: string[]): Promise<Map<string, number>> => {
            if (clientIds.length === 0) return new Map();

            const saleInteractions = await prisma.interaction.findMany({
                where: {
                    clientId: { in: clientIds },
                    type: "STATUS_CHANGE",
                    createdAt: { gte: startDate, lte: now },
                },
                orderBy: { createdAt: "desc" },
            });

            // Para cada cliente, pegar a última interação com saleValue
            const saleMap = new Map<string, number>();
            for (const interaction of saleInteractions) {
                if (!interaction.metadata) continue;
                try {
                    const meta = JSON.parse(interaction.metadata);
                    if (meta.saleValue && !saleMap.has(interaction.clientId)) {
                        saleMap.set(interaction.clientId, parseFloat(meta.saleValue));
                    }
                } catch { /* ignore */ }
            }
            return saleMap;
        };

        // 1. RANKING DE VENDEDORES
        const vendedores = await prisma.user.findMany({
            where: { role: "VENDEDOR" },
            include: {
                clients: {
                    where: {
                        createdAt: { gte: startDate, lte: now },
                    },
                    include: { currentStage: true },
                },
                tasks: {
                    where: { createdAt: { gte: startDate, lte: now } },
                },
            },
        });

        const vendedoresRanking = await Promise.all(
            vendedores.map(async (vendedor) => {
                const totalClientes = vendedor.clients.length;
                const clientesFechados = vendedor.clients.filter(
                    (c) => closedStageIds.includes(c.currentStageId)
                );
                const fechadoIds = clientesFechados.map((c) => c.id);
                const saleMap = await getSaleValueFromInteractions(fechadoIds);

                // Usar saleValue da interação se disponível, senão potentialValue
                const totalVendas = clientesFechados.reduce((sum, c) => {
                    return sum + (saleMap.get(c.id) ?? c.potentialValue);
                }, 0);

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
            })
        );

        vendedoresRanking.sort((a, b) => b.totalVendas - a.totalVendas);

        // 2. FUNIL DE CONVERSÃO
        const stages = await prisma.pipelineStage.findMany({
            orderBy: { order: "asc" },
        });

        const clientesNoPeriodo = await prisma.client.findMany({
            where: {
                createdAt: { gte: startDate, lte: now },
            },
            include: { currentStage: true },
        });

        const funnelData = stages.map((stage) => {
            const count = clientesNoPeriodo.filter(
                (c) => c.currentStageId === stage.id
            ).length;
            return { stage: stage.name, count, color: stage.color };
        });

        // 3. VENDAS POR DIA (últimos 30 dias)
        const last30Days = new Date();
        last30Days.setDate(now.getDate() - 30);

        const vendasPorDia: { date: string; vendas: number }[] = [];

        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(now.getDate() - i);
            const dateStr = date.toISOString().split("T")[0];

            // Contar interações de venda nesse dia
            const vendasNoDia = await prisma.interaction.count({
                where: {
                    type: "STATUS_CHANGE",
                    metadata: { contains: "saleValue" },
                    createdAt: {
                        gte: new Date(dateStr + "T00:00:00"),
                        lt: new Date(dateStr + "T23:59:59"),
                    },
                },
            });

            vendasPorDia.push({ date: dateStr, vendas: vendasNoDia });
        }

        // 4. MÉTRICAS GERAIS
        const totalClientes = await prisma.client.count({
            where: {
                createdAt: { gte: startDate, lte: now },
            },
        });

        const clientesFechadosGeral = clientesNoPeriodo.filter(
            (c) => closedStageIds.includes(c.currentStageId)
        );

        const clientesFechadosCount = clientesFechadosGeral.length;
        const clientesAtivos = clientesNoPeriodo.filter(
            (c) => !closedStageIds.includes(c.currentStageId)
        ).length;

        const taxaConversaoGeral =
            totalClientes > 0 ? (clientesFechadosCount / totalClientes) * 100 : 0;

        // Calcular valor total usando saleValue das interações
        const fechadoIds = clientesFechadosGeral.map((c) => c.id);
        const saleMapGeral = await getSaleValueFromInteractions(fechadoIds);

        const valorTotalVendas = clientesFechadosGeral.reduce((sum, c) => {
            return sum + (saleMapGeral.get(c.id) ?? c.potentialValue);
        }, 0);

        const ticketMedio =
            clientesFechadosCount > 0 ? valorTotalVendas / clientesFechadosCount : 0;

        return NextResponse.json({
            vendedoresRanking,
            funnelData,
            vendasPorDia,
            metricas: {
                totalClientes,
                clientesAtivos,
                clientesFechados: clientesFechadosCount,
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
