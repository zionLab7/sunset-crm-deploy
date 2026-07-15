export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { GoogleGenerativeAI } from "@google/generative-ai";

// Helper to get Gemini API key from SystemConfig (DB)
async function getGeminiApiKey(): Promise<string | null> {
    const config = await prisma.systemConfig.findUnique({ where: { key: "geminiApiKey" } });
    return config?.value || null;
}

// Fetch an optimized snapshot of business data (token-efficient)
async function getBusinessContext() {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    // 1. Sellers with limited depth
    const sellers = await prisma.user.findMany({
        where: { role: "VENDEDOR" },
        include: {
            clients: {
                include: {
                    currentStage: true,
                    interactions: {
                        orderBy: { createdAt: "desc" },
                        take: 2,
                    },
                    products: {
                        include: { product: { select: { name: true } } },
                    },
                },
            },
            tasks: {
                where: { status: { not: "CONCLUIDA" } },
                include: { client: { select: { name: true } } },
                orderBy: { dueDate: "asc" },
                take: 10,
            },
        },
    });

    // 2. Pipeline stages
    const stages = await prisma.pipelineStage.findMany({
        orderBy: { order: "asc" },
        include: { _count: { select: { clients: true } } },
    });
    const closedStageIds = stages.filter((s) => s.isClosedStage).map((s) => s.id);

    // 3. Compact client list
    const allClients = await prisma.client.findMany({
        include: {
            currentStage: { select: { name: true } },
            assignedUser: { select: { name: true } },
            interactions: {
                orderBy: { createdAt: "desc" },
                take: 1,
                select: { createdAt: true, type: true, metadata: true },
            },
            products: { include: { product: { select: { name: true } } } },
            customFieldValues: {
                include: { customField: { select: { name: true } } },
            },
        },
    });

    // 4. Overdue tasks
    const overdueTasks = await prisma.task.findMany({
        where: { dueDate: { lt: now }, status: { not: "CONCLUIDA" } },
        include: {
            user: { select: { name: true } },
            client: { select: { name: true } },
        },
    });

    // 5. Products
    const products = await prisma.product.findMany({
        include: {
            _count: { select: { clients: true } },
            customFieldValues: {
                include: { customField: { select: { name: true } } },
            },
        },
    });

    // 6. Gestores
    const gestores = await prisma.user.findMany({
        where: { role: "GESTOR" },
        select: { name: true, monthlyGoal: true },
    });

    // 7. Recent interaction count
    const recentInteractions = await prisma.interaction.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
    });

    // 8. Vendas Programadas
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

    const scheduledInteractions = await prisma.interaction.findMany({
        where: {
            type: { in: saleTypeNames },
            metadata: { contains: "SCHEDULED" },
        },
        include: {
            client: { select: { name: true } },
            user: { select: { name: true } },
        },
    });

    const vendasProgramadas = scheduledInteractions
        .map((i) => {
            try {
                const meta = JSON.parse(i.metadata || "{}");
                if (meta.saleType !== "SCHEDULED" || !meta.deliveries) return null;
                return {
                    cliente: i.client.name,
                    vendedor: i.user.name,
                    dataRegistro: i.createdAt.toISOString().split("T")[0],
                    valorTotal: meta.saleValue,
                    itens: (meta.items || []).map((it: any) => `${it.productName} (x${it.quantity})`).join(", ") || "—",
                    entregas: (meta.deliveries || []).map((d: any) => `${d.dueDate}: U$ ${parseFloat(String(d.value || 0)).toFixed(2)}`).join(" | "),
                };
            } catch { return null; }
        })
        .filter(Boolean);

    // ============ HELPERS ============
    function getSaleValue(interactions: Array<{ metadata: string | null }>, potentialValue: number): number {
        for (const i of interactions) {
            if (i.metadata) {
                try {
                    const m = JSON.parse(i.metadata);
                    if (m.saleValue != null) return parseFloat(String(m.saleValue));
                } catch { }
            }
        }
        return potentialValue;
    }

    // ============ BUILD CONTEXT ============

    // Sellers — compact per-client summary
    const sellersContext = sellers.map((s) => {
        const closedClients = s.clients.filter((c) => closedStageIds.includes(c.currentStageId));
        const totalRevenue = closedClients.reduce((sum, c) => sum + getSaleValue(c.interactions, c.potentialValue), 0);
        const pendingTasks = s.tasks.filter((t) => t.status === "PENDENTE").length;
        const overdue = s.tasks.filter((t) => t.dueDate < now).length;

        return {
            nome: s.name,
            email: s.email,
            metaMensal: s.monthlyGoal,
            progressoMeta: s.monthlyGoal > 0 ? `${((totalRevenue / s.monthlyGoal) * 100).toFixed(1)}%` : "Sem meta",
            totalClientes: s.clients.length,
            vendas: closedClients.length,
            receita: totalRevenue,
            tarefasPendentes: pendingTasks,
            tarefasAtrasadas: overdue,
            clientes: s.clients.map((c) => ({
                nome: c.name,
                fase: c.currentStage.name,
                valor: c.potentialValue,
                produtos: c.products.map((p) => p.product.name).join(", ") || "—",
                ultimaInteracao: c.interactions[0]?.createdAt.toISOString().split("T")[0] || "Nunca",
                tipoUltima: c.interactions[0]?.type || null,
            })),
            proximasTarefas: s.tasks.slice(0, 5).map((t) => ({
                titulo: t.title,
                status: t.status,
                vencimento: t.dueDate.toISOString().split("T")[0],
                cliente: t.client?.name || "—",
            })),
        };
    });

    // Pipeline
    const pipelineContext = stages.map((s) => ({
        fase: s.name, total: s._count.clients, fechamento: s.isClosedStage,
    }));

    // Compact client list
    const clientsCompact = allClients.map((c) => {
        const isClosed = closedStageIds.includes(c.currentStageId);
        const saleVal = isClosed ? getSaleValue(c.interactions, c.potentialValue) : null;
        const lastDate = c.interactions[0]?.createdAt;
        const inactive = !lastDate || lastDate < thirtyDaysAgo;
        return {
            nome: c.name,
            cnpj: c.cnpj || "—",
            vendedor: c.assignedUser?.name || "—",
            fase: c.currentStage.name,
            valor: c.potentialValue,
            valorVenda: saleVal,
            produtos: c.products.map((p) => p.product.name).join(", ") || "—",
            ultimaInteracao: lastDate?.toISOString().split("T")[0] || "Nunca",
            inativo: inactive,
            campos: c.customFieldValues.length > 0
                ? c.customFieldValues.map((v) => `${v.customField.name}: ${v.value}`).join("; ")
                : null,
        };
    });

    // Overdue tasks
    const overdueContext = overdueTasks.map((t) => ({
        tarefa: t.title, vendedor: t.user.name, cliente: t.client?.name || "—",
        vencimento: t.dueDate.toISOString().split("T")[0],
    }));

    // Products
    const productsContext = products.map((p) => ({
        nome: p.name, codigo: p.stockCode, clientes: p._count.clients,
        campos: p.customFieldValues.map((v) => `${v.customField.name}: ${v.value}`).join("; ") || "—",
    }));

    // KPIs
    const totalClients = allClients.length;
    const closedClients = allClients.filter((c) => closedStageIds.includes(c.currentStageId));
    const totalRevenue = closedClients.reduce((sum, c) => sum + getSaleValue(c.interactions, c.potentialValue), 0);
    const conversionRate = totalClients > 0 ? ((closedClients.length / totalClients) * 100).toFixed(1) : "0";
    const avgTicket = closedClients.length > 0 ? (totalRevenue / closedClients.length).toFixed(2) : "0";
    const gestorGoal = gestores.reduce((max, g) => Math.max(max, g.monthlyGoal), 0);
    const inactiveCount = clientsCompact.filter((c) => c.inativo).length;

    return `
=== SUNSET DISTRIBUIDORA — CONTEXTO ===
Data: ${now.toISOString().split("T")[0]}
Moeda: U$ (dólar americano). Valores de receita = valor REAL registrado na venda.

--- KPIs ---
Clientes: ${totalClients} | Vendas fechadas: ${closedClients.length} | Receita: U$ ${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2 })}
Conversão: ${conversionRate}% | Ticket médio: U$ ${avgTicket} | Interações 30d: ${recentInteractions}
Tarefas atrasadas: ${overdueTasks.length} | Clientes inativos (30d+): ${inactiveCount}
Meta mensal: U$ ${gestorGoal.toLocaleString("en-US", { minimumFractionDigits: 2 })} | Progresso: ${gestorGoal > 0 ? ((totalRevenue / gestorGoal) * 100).toFixed(1) + "%" : "Sem meta"} | Falta: U$ ${gestorGoal > 0 ? Math.max(0, gestorGoal - totalRevenue).toLocaleString("en-US", { minimumFractionDigits: 2 }) : "—"}

--- VENDEDORES ---
${JSON.stringify(sellersContext, null, 1)}

--- FUNIL ---
${JSON.stringify(pipelineContext)}

--- CLIENTES ---
${JSON.stringify(clientsCompact, null, 1)}

--- TAREFAS ATRASADAS ---
${JSON.stringify(overdueContext)}

--- PRODUTOS ---
${JSON.stringify(productsContext)}

--- GESTORES ---
${JSON.stringify(gestores)}

--- VENDAS PROGRAMADAS ---
${vendasProgramadas.length > 0 ? JSON.stringify(vendasProgramadas, null, 1) : "Nenhuma venda programada registrada."}
`;
}

const SYSTEM_PROMPT = `Você é o Assistente IA da Sunset Distribuidora, um analista de negócios experiente e estratégico.

Seu papel:
- Responder perguntas sobre o desempenho comercial da empresa com base nos dados reais fornecidos
- Você tem acesso aos dados de cada cliente (cadastro, fase, produtos, campos customizados, última interação)
- Você tem acesso ao desempenho de cada vendedor (clientes, receita, tarefas, progresso de meta)
- Fornecer insights acionáveis e sugestões práticas
- Identificar riscos, oportunidades e tendências
- Ser direto, objetivo e usar linguagem profissional em português brasileiro
- Formatar respostas com markdown quando apropriado (negrito, listas, tabelas)
- Nunca inventar dados. Se não tiver a informação, diga claramente
- Ao mencionar valores monetários, use sempre U$ (dólar americano), formato: U$ X,XXX.XX
- Os valores de receita são baseados no valor REAL registrado na venda (não o potencial estimado)
- Sempre que perguntado sobre progresso da meta, informe o percentual atingido e quanto falta

Capacidades:
- Pode responder sobre QUALQUER cliente específico (dados, produtos, valor, estágio, inatividade)
- Pode responder sobre QUALQUER vendedor (desempenho, clientes, tarefas pendentes)
- Pode cruzar dados entre vendedores, clientes, produtos e pipeline
- Pode responder sobre VENDAS PROGRAMADAS: valor, cliente, vendedor, datas de entrega e status
- Quando perguntado sobre vendas programadas, liste-as com cliente, valor total, e datas de entrega
- Pode identificar padrões de comportamento e recomendar ações

Personalidade: Profissional, analítico, proativo. Você antecipa problemas e sugere soluções.

Limitações: Você só tem acesso aos dados fornecidos no contexto. Não tem acesso a dados históricos além do que foi fornecido.`;

export async function POST(request: Request) {
    try {
        await requireRole("GESTOR");

        const { message, history } = await request.json();

        if (!message || typeof message !== "string") {
            return NextResponse.json(
                { error: "Mensagem é obrigatória" },
                { status: 400 }
            );
        }

        const apiKey = await getGeminiApiKey();
        if (!apiKey) {
            return NextResponse.json(
                { error: "Chave da API Gemini não configurada. Configure em Configurações → Integrações." },
                { status: 500 }
            );
        }

        const genAI = new GoogleGenerativeAI(apiKey);

        // Fetch fresh business data
        const businessContext = await getBusinessContext();

        // Build conversation for Gemini
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const chat = model.startChat({
            history: [
                {
                    role: "user",
                    parts: [
                        {
                            text: `${SYSTEM_PROMPT}\n\nAqui estão os dados atualizados da empresa:\n${businessContext}\n\nPor favor, confirme que entendeu os dados e está pronto para responder perguntas.`,
                        },
                    ],
                },
                {
                    role: "model",
                    parts: [
                        {
                            text: "Entendido! Analisei todos os dados da Sunset Distribuidora. Estou pronto para responder suas perguntas sobre vendedores, clientes, pipeline, tarefas e produtos. Como posso ajudar?",
                        },
                    ],
                },
                // Include previous conversation history
                ...(history || []).map(
                    (msg: { role: string; content: string }) => ({
                        role: msg.role === "user" ? "user" : "model",
                        parts: [{ text: msg.content }],
                    })
                ),
            ],
        });

        const result = await chat.sendMessage(message);
        const response = result.response.text();

        return NextResponse.json({ response });
    } catch (error: any) {
        console.error("Erro no chat IA:", error);

        if (error.message?.includes("GESTOR")) {
            return NextResponse.json(
                { error: "Acesso negado. Apenas gestores podem usar o Assistente IA." },
                { status: 403 }
            );
        }

        return NextResponse.json(
            { error: error.message || "Erro ao processar mensagem" },
            { status: 500 }
        );
    }
}
