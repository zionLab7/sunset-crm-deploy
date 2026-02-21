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

// Fetch a comprehensive snapshot of all business data for the AI context
async function getBusinessContext() {
    const now = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(now.getDate() - 30);

    // 1. All sellers with full performance data
    const sellers = await prisma.user.findMany({
        where: { role: "VENDEDOR" },
        include: {
            clients: {
                include: {
                    currentStage: true,
                    interactions: {
                        orderBy: { createdAt: "desc" },
                        take: 5,
                    },
                    products: {
                        include: { product: true },
                    },
                },
            },
            tasks: {
                include: {
                    client: { select: { name: true } },
                },
                orderBy: { dueDate: "desc" },
            },
            interactions: {
                orderBy: { createdAt: "desc" },
                take: 20,
                include: {
                    client: { select: { name: true } },
                },
            },
        },
    });

    // 2. Pipeline stages
    const stages = await prisma.pipelineStage.findMany({
        orderBy: { order: "asc" },
        include: { _count: { select: { clients: true } } },
    });

    const closedStageIds = stages
        .filter((s) => s.isClosedStage)
        .map((s) => s.id);

    // 3. All clients with full detail
    const allClients = await prisma.client.findMany({
        include: {
            currentStage: true,
            assignedUser: { select: { name: true, email: true } },
            interactions: {
                orderBy: { createdAt: "desc" },
                take: 5,
                include: {
                    user: { select: { name: true } },
                },
            },
            products: {
                include: { product: true },
            },
            customFieldValues: {
                include: { customField: true },
            },
        },
    });

    // 4. Recent interactions (last 30 days)
    const recentInteractions = await prisma.interaction.count({
        where: { createdAt: { gte: thirtyDaysAgo } },
    });

    // 5. Overdue tasks
    const overdueTasks = await prisma.task.findMany({
        where: {
            dueDate: { lt: now },
            status: { not: "CONCLUIDA" },
        },
        include: {
            user: { select: { name: true } },
            client: { select: { name: true } },
        },
    });

    // 6. Products with custom fields
    const products = await prisma.product.findMany({
        include: {
            _count: { select: { clients: true } },
            customFieldValues: {
                include: { customField: true },
            },
        },
    });

    // 7. Gestores
    const gestores = await prisma.user.findMany({
        where: { role: "GESTOR" },
        select: { name: true, monthlyGoal: true },
    });

    // ============ BUILD CONTEXT ============

    // Sellers with per-client timeline
    const sellersContext = sellers.map((s) => {
        const totalClients = s.clients.length;
        const closedClients = s.clients.filter((c) =>
            closedStageIds.includes(c.currentStageId)
        );
        const totalRevenue = closedClients.reduce(
            (sum, c) => sum + c.potentialValue, 0
        );
        const pendingTasks = s.tasks.filter((t) => t.status === "PENDENTE").length;
        const overdue = s.tasks.filter(
            (t) => t.status !== "CONCLUIDA" && t.dueDate < now
        ).length;
        const completedTasks = s.tasks.filter((t) => t.status === "CONCLUIDA").length;

        // Per-client summary for this seller
        const clientsSummary = s.clients.map((c) => ({
            nome: c.name,
            estagio: c.currentStage.name,
            valorPotencial: c.potentialValue,
            ultimaInteracao: c.interactions.length > 0
                ? c.interactions[0].createdAt.toISOString().split("T")[0]
                : "Nunca",
            tipoUltimaInteracao: c.interactions.length > 0
                ? c.interactions[0].type : null,
            totalInteracoes: c.interactions.length,
            produtos: c.products.map((p) => p.product.name),
        }));

        // Recent interactions timeline
        const timeline = s.interactions.slice(0, 10).map((i) => ({
            data: i.createdAt.toISOString().split("T")[0],
            tipo: i.type,
            cliente: i.client?.name || "N/A",
            descricao: i.description?.substring(0, 100) || "",
        }));

        // Tasks detail
        const tarefasDetalhadas = s.tasks.slice(0, 10).map((t) => ({
            titulo: t.title,
            status: t.status,
            vencimento: t.dueDate.toISOString().split("T")[0],
            cliente: t.client?.name || "Sem cliente",
        }));

        return {
            nome: s.name,
            email: s.email,
            metaMensal: s.monthlyGoal,
            totalClientes: totalClients,
            clientesFechados: closedClients.length,
            receitaTotal: totalRevenue,
            tarefasPendentes: pendingTasks,
            tarefasAtrasadas: overdue,
            tarefasConcluidas: completedTasks,
            clientes: clientsSummary,
            ultimasInteracoes: timeline,
            tarefas: tarefasDetalhadas,
        };
    });

    const pipelineContext = stages.map((s) => ({
        fase: s.name,
        totalClientes: s._count.clients,
        cor: s.color,
        isFaseFechamento: s.isClosedStage,
    }));

    // Full client records
    const clientsContext = allClients.map((c) => ({
        nome: c.name,
        cnpj: c.cnpj || "Não informado",
        telefone: c.phone || "Não informado",
        email: c.email || "Não informado",
        vendedor: c.assignedUser?.name || "Sem vendedor",
        faseAtual: c.currentStage.name,
        valorPotencial: c.potentialValue,
        criadoEm: c.createdAt.toISOString().split("T")[0],
        produtos: c.products.map((p) => p.product.name),
        camposCustomizados: c.customFieldValues.map((cfv) => ({
            campo: cfv.customField.name,
            valor: cfv.value,
        })),
        interacoes: c.interactions.map((i) => ({
            data: i.createdAt.toISOString().split("T")[0],
            tipo: i.type,
            responsavel: i.user?.name || "Sistema",
            descricao: i.description?.substring(0, 150) || "",
        })),
        ultimaInteracao: c.interactions.length > 0
            ? c.interactions[0].createdAt.toISOString().split("T")[0]
            : "Nunca",
    }));

    // Inactive clients
    const inactiveClients = allClients
        .filter((c) => {
            if (c.interactions.length === 0) return true;
            return c.interactions[0].createdAt < thirtyDaysAgo;
        })
        .map((c) => ({
            nome: c.name,
            vendedor: c.assignedUser?.name || "Sem vendedor",
            faseAtual: c.currentStage.name,
            valorPotencial: c.potentialValue,
            ultimaInteracao: c.interactions.length > 0
                ? c.interactions[0].createdAt.toISOString().split("T")[0]
                : "Nunca",
        }));

    const overdueContext = overdueTasks.map((t) => ({
        tarefa: t.title,
        vendedor: t.user.name,
        cliente: t.client?.name || "Sem cliente",
        vencimento: t.dueDate.toISOString().split("T")[0],
    }));

    // Products with custom field values
    const productsContext = products.map((p) => ({
        nome: p.name,
        codigo: p.stockCode,
        clientesVinculados: p._count.clients,
        camposCustomizados: p.customFieldValues.map((cfv) => ({
            campo: cfv.customField.name,
            valor: cfv.value,
        })),
    }));

    // General KPIs
    const totalClients = allClients.length;
    const closedClientsCount = allClients.filter((c) =>
        closedStageIds.includes(c.currentStageId)
    ).length;
    const totalRevenue = allClients
        .filter((c) => closedStageIds.includes(c.currentStageId))
        .reduce((sum, c) => sum + c.potentialValue, 0);
    const conversionRate =
        totalClients > 0
            ? ((closedClientsCount / totalClients) * 100).toFixed(1)
            : "0";
    const avgTicket =
        closedClientsCount > 0
            ? (totalRevenue / closedClientsCount).toFixed(2)
            : "0";

    return `
=== DADOS COMPLETOS DA EMPRESA SUNSET DISTRIBUIDORA ===
Data atual: ${now.toISOString().split("T")[0]}

--- KPIs GERAIS ---
Total de Clientes: ${totalClients}
Clientes com Venda Fechada: ${closedClientsCount}
Receita Total (vendas fechadas): R$ ${totalRevenue.toLocaleString("pt-BR")}
Taxa de Conversão: ${conversionRate}%
Ticket Médio: R$ ${avgTicket}
Interações nos últimos 30 dias: ${recentInteractions}
Tarefas atrasadas: ${overdueTasks.length}

--- VENDEDORES (com clientes e histórico detalhado) ---
${JSON.stringify(sellersContext, null, 2)}

--- FUNIL DE VENDAS (Pipeline) ---
${JSON.stringify(pipelineContext, null, 2)}

--- FICHAS COMPLETAS DOS CLIENTES ---
${JSON.stringify(clientsContext, null, 2)}

--- CLIENTES SEM INTERAÇÃO (30+ dias) ---
${JSON.stringify(inactiveClients, null, 2)}

--- TAREFAS ATRASADAS ---
${JSON.stringify(overdueContext, null, 2)}

--- PRODUTOS (com campos customizados) ---
${JSON.stringify(productsContext, null, 2)}

--- GESTORES ---
${JSON.stringify(gestores, null, 2)}
`;
}

const SYSTEM_PROMPT = `Você é o Assistente IA da Sunset Distribuidora, um analista de negócios experiente e estratégico.

Seu papel:
- Responder perguntas sobre o desempenho comercial da empresa com base nos dados reais fornecidos
- Você tem acesso às FICHAS COMPLETAS de cada cliente (dados cadastrais, interações, produtos, campos customizados)
- Você tem acesso ao HISTÓRICO DETALHADO de cada vendedor (clientes, timeline de interações, tarefas)
- Fornecer insights acionáveis e sugestões práticas
- Identificar riscos, oportunidades e tendências
- Ser direto, objetivo e usar linguagem profissional em português brasileiro
- Formatar respostas com markdown quando apropriado (negrito, listas, tabelas)
- Nunca inventar dados. Se não tiver a informação, diga claramente
- Ao mencionar valores monetários, use o formato brasileiro (R$ X.XXX,XX)

Capacidades especiais:
- Pode responder sobre QUALQUER cliente específico (dados, interações, produtos, valor, estágio)
- Pode responder sobre QUALQUER vendedor (desempenho, clientes, tarefas pendentes, timeline)
- Pode cruzar dados entre vendedores, clientes, produtos e pipeline
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
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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
