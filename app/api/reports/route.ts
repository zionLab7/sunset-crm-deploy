export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
    try {
        await requireRole("GESTOR");

        const { searchParams } = new URL(request.url);
        const period = searchParams.get("period") || "month";

        const now = new Date();
        let startDate = new Date();

        switch (period) {
            case "week": startDate.setDate(now.getDate() - 7); break;
            case "month": startDate = new Date(now.getFullYear(), now.getMonth(), 1); break;
            case "quarter": startDate.setMonth(now.getMonth() - 3); break;
            case "year": startDate.setFullYear(now.getFullYear() - 1); break;
            default: startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        }

        // ✅ Fetch only custom sale interaction type names (NOT STATUS_CHANGE)
        let saleTypeNames: string[] = [];
        try {
            const saleTypes = await (prisma as any).interactionTypeConfig.findMany({
                where: { isSaleType: true },
                select: { name: true },
            });
            saleTypeNames = saleTypes.map((t: any) => t.name);
        } catch {
            saleTypeNames = ["Venda"];
        }
        // Guarantee "Venda" is always included as fallback
        if (!saleTypeNames.includes("Venda")) saleTypeNames.push("Venda");

        // ✅ Fetch ALL sale interactions in the period (by type name + saleValue in metadata)
        // No pipeline stage filtering — sales come solely from registered interactions
        const allSaleInteractions = await prisma.interaction.findMany({
            where: {
                type: { in: saleTypeNames },
                metadata: { contains: "saleValue" },
                createdAt: { gte: startDate, lte: now },
            },
            select: { id: true, clientId: true, userId: true, metadata: true, createdAt: true },
        });

        // Build a map: clientId -> total sale value
        const clientSaleMap = new Map<string, number>();
        // Build a map: userId -> total sale value (for ranking)
        const userSaleMap = new Map<string, number>();
        // Count unique clients with sales
        const clientsWithSales = new Set<string>();

        let totalVendasGeral = 0;

        for (const interaction of allSaleInteractions) {
            if (!interaction.metadata) continue;
            try {
                const meta = JSON.parse(interaction.metadata);
                const val = parseFloat(String(meta.saleValue || 0));
                if (val > 0) {
                    clientSaleMap.set(interaction.clientId, (clientSaleMap.get(interaction.clientId) || 0) + val);
                    userSaleMap.set(interaction.userId, (userSaleMap.get(interaction.userId) || 0) + val);
                    clientsWithSales.add(interaction.clientId);
                    totalVendasGeral += val;
                }
            } catch { /* ignore */ }
        }

        // ✅ Vendor ranking — based purely on sale interactions
        const vendedores = await prisma.user.findMany({
            where: { role: "VENDEDOR" },
            include: {
                clients: {
                    where: { createdAt: { gte: startDate, lte: now } },
                },
                tasks: { where: { createdAt: { gte: startDate, lte: now } } },
            },
        });

        const vendedoresRanking = vendedores.map((vendedor) => {
            const totalClientes = vendedor.clients.length;
            const totalVendas = userSaleMap.get(vendedor.id) || 0;
            // Count unique clients sold to by this vendedor
            const clientesVendidos = allSaleInteractions.filter(
                i => i.userId === vendedor.id && (clientSaleMap.get(i.clientId) || 0) > 0
            );
            const uniqueClientesVendidos = new Set(clientesVendidos.map(i => i.clientId)).size;
            const conversao = totalClientes > 0 ? (uniqueClientesVendidos / totalClientes) * 100 : 0;

            return {
                id: vendedor.id,
                name: vendedor.name,
                totalClientes,
                clientesFechados: uniqueClientesVendidos,
                totalVendas,
                conversao: Math.round(conversao),
            };
        });

        vendedoresRanking.sort((a, b) => b.totalVendas - a.totalVendas);

        // ✅ Funnel data — still shows distribution of clients across stages (informational only)
        const stages = await prisma.pipelineStage.findMany({ orderBy: { order: "asc" } });
        const clientesNoPeriodo = await prisma.client.findMany({
            where: { createdAt: { gte: startDate, lte: now } },
            include: { currentStage: true },
        });
        const funnelData = stages.map((stage) => ({
            stage: stage.name,
            count: clientesNoPeriodo.filter(c => c.currentStageId === stage.id).length,
            color: stage.color,
        }));

        // ✅ Sales per day — from sale interactions
        const vendasPorDia: { date: string; vendas: number }[] = [];
        for (let i = 29; i >= 0; i--) {
            const date = new Date();
            date.setDate(now.getDate() - i);
            const dateStr = date.toISOString().split("T")[0];
            const vendasNoDia = allSaleInteractions.filter(interaction => {
                return interaction.createdAt.toISOString().split("T")[0] === dateStr;
            }).reduce((sum, interaction) => {
                try {
                    const meta = JSON.parse(interaction.metadata || "{}");
                    return sum + (parseFloat(String(meta.saleValue || 0)) > 0 ? 1 : 0);
                } catch { return sum; }
            }, 0);
            vendasPorDia.push({ date: dateStr, vendas: vendasNoDia });
        }

        // ✅ Overall metrics — purely from sale interactions
        const totalClientes = await prisma.client.count({
            where: { createdAt: { gte: startDate, lte: now } },
        });
        const clientesFechadosCount = clientsWithSales.size;
        const clientesAtivos = totalClientes - clientesFechadosCount;
        const taxaConversaoGeral = totalClientes > 0 ? (clientesFechadosCount / totalClientes) * 100 : 0;
        const ticketMedio = clientesFechadosCount > 0 ? totalVendasGeral / clientesFechadosCount : 0;

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
                valorTotalVendas: totalVendasGeral,
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
