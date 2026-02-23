import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Iniciando seed do banco de dados...');

    // Limpar dados existentes
    await prisma.customFieldValue.deleteMany();
    await prisma.customField.deleteMany();
    await prisma.clientProduct.deleteMany();
    await prisma.product.deleteMany();
    await prisma.interaction.deleteMany();
    await prisma.task.deleteMany();
    await prisma.client.deleteMany();
    await prisma.pipelineStage.deleteMany();
    await prisma.user.deleteMany();

    console.log('✅ Dados antigos removidos');

    // Criar usuários
    const hashedPassword = await bcrypt.hash('123456', 10);

    const gestor = await prisma.user.create({
        data: {
            name: 'Admin Gestor',
            email: 'admin@sunset.com',
            password: hashedPassword,
            role: 'GESTOR',
            monthlyGoal: 100000,
        },
    });

    const vendedor1 = await prisma.user.create({
        data: {
            name: 'João Silva',
            email: 'joao@sunset.com',
            password: hashedPassword,
            role: 'VENDEDOR',
            monthlyGoal: 50000,
        },
    });

    const vendedor2 = await prisma.user.create({
        data: {
            name: 'Maria Santos',
            email: 'maria@sunset.com',
            password: hashedPassword,
            role: 'VENDEDOR',
            monthlyGoal: 45000,
        },
    });

    console.log('✅ Usuários criados');

    // Criar estágios do funil
    const prospeccao = await prisma.pipelineStage.create({
        data: {
            name: 'Prospecção',
            color: '#3B82F6', // blue-500
            order: 1,
        },
    });

    const negociacao = await prisma.pipelineStage.create({
        data: {
            name: 'Negociação',
            color: '#F59E0B', // amber-500
            order: 2,
        },
    });

    const proposta = await prisma.pipelineStage.create({
        data: {
            name: 'Proposta Enviada',
            color: '#8B5CF6', // violet-500
            order: 3,
        },
    });

    const fechamento = await prisma.pipelineStage.create({
        data: {
            name: 'Fechamento',
            color: '#10B981', // green-500
            order: 4,
            isClosedStage: true, // ← Marca que esta fase é uma venda fechada (aciona o SaleModal)
        },
    });

    console.log('✅ Estágios do funil criados');

    // Criar clientes
    const clientes = [
        {
            name: 'Supermercado Bom Preço',
            cnpj: '12.345.678/0001-90',
            phone: '11987654321',
            email: 'contato@bompreco.com',
            potentialValue: 15000,
            assignedUserId: vendedor1.id,
            currentStageId: prospeccao.id,
        },
        {
            name: 'Distribuidora Centro',
            cnpj: '98.765.432/0001-10',
            phone: '11912345678',
            email: 'vendas@districentro.com',
            potentialValue: 25000,
            assignedUserId: vendedor1.id,
            currentStageId: negociacao.id,
        },
        {
            name: 'Atacado São Paulo',
            cnpj: '11.222.333/0001-44',
            phone: '11998877665',
            email: 'contato@atacadosp.com',
            potentialValue: 40000,
            assignedUserId: vendedor1.id,
            currentStageId: proposta.id,
        },
        {
            name: 'Mercado Popular',
            cnpj: '44.555.666/0001-77',
            phone: '11987651234',
            email: 'compras@mercadopopular.com',
            potentialValue: 18000,
            assignedUserId: vendedor2.id,
            currentStageId: prospeccao.id,
        },
        {
            name: 'Rede SuperMax',
            cnpj: '77.888.999/0001-00',
            phone: '11976543210',
            email: 'vendas@supermax.com',
            potentialValue: 60000,
            assignedUserId: vendedor2.id,
            currentStageId: fechamento.id,
        },
        {
            name: 'Mercearia da Vila',
            cnpj: '22.333.444/0001-55',
            phone: '11965432109',
            email: 'merceariavila@email.com',
            potentialValue: 8000,
            assignedUserId: vendedor2.id,
            currentStageId: negociacao.id,
        },
        {
            name: 'Distribuidora Norte',
            cnpj: '33.444.555/0001-66',
            phone: '11954321098',
            email: 'contato@distinorte.com',
            potentialValue: 32000,
            assignedUserId: vendedor1.id,
            currentStageId: prospeccao.id,
        },
        {
            name: 'Varejo Plus',
            cnpj: '55.666.777/0001-88',
            phone: '11943210987',
            email: 'vendas@varejoplus.com',
            potentialValue: 22000,
            assignedUserId: vendedor2.id,
            currentStageId: proposta.id,
        },
    ];

    for (const clienteData of clientes) {
        const cliente = await prisma.client.create({ data: clienteData });

        // Criar interação inicial
        await prisma.interaction.create({
            data: {
                type: 'NOTE',
                description: 'Cliente cadastrado no sistema',
                clientId: cliente.id,
                userId: clienteData.assignedUserId,
            },
        });
    }

    console.log('✅ Clientes criados');

    // Criar tarefas
    const hoje = new Date();
    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);
    const semanaPassada = new Date(hoje);
    semanaPassada.setDate(semanaPassada.getDate() - 7);

    const clientesList = await prisma.client.findMany();

    await prisma.task.create({
        data: {
            title: 'Ligar para apresentar proposta',
            description: 'Apresentar linha de produtos e condições especiais',
            dueDate: amanha,
            status: 'PENDENTE',
            clientId: clientesList[0].id,
            userId: vendedor1.id,
        },
    });

    await prisma.task.create({
        data: {
            title: 'Visita técnica agendada',
            description: 'Reunião com gerente de compras às 14h',
            dueDate: semanaPassada,
            status: 'ATRASADA',
            clientId: clientesList[1].id,
            userId: vendedor1.id,
        },
    });

    await prisma.task.create({
        data: {
            title: 'Enviar proposta comercial',
            description: 'Enviar proposta atualizada com novos preços',
            dueDate: semanaPassada,
            status: 'ATRASADA',
            clientId: clientesList[3].id,
            userId: vendedor2.id,
        },
    });

    console.log('✅ Tarefas criadas');

    // Criar produtos
    const produto1 = await prisma.product.create({
        data: {
            name: 'Café Premium 1kg',
            stockCode: 'CAF-001',
        },
    });

    const produto2 = await prisma.product.create({
        data: {
            name: 'Açúcar Cristal 5kg',
            stockCode: 'ACU-002',
        },
    });

    const produto3 = await prisma.product.create({
        data: {
            name: 'Arroz Tipo 1 5kg',
            stockCode: 'ARR-003',
        },
    });

    const produto4 = await prisma.product.create({
        data: {
            name: 'Feijão Preto 1kg',
            stockCode: 'FEI-004',
        },
    });

    const produto5 = await prisma.product.create({
        data: {
            name: 'Óleo de Soja 900ml',
            stockCode: 'OLE-005',
        },
    });

    console.log('✅ Produtos criados');

    // Vincular produtos a alguns clientes
    const primeirosClientes = await prisma.client.findMany({ take: 3 });

    // Cliente 1 - Supermercado Bom Preço
    await prisma.clientProduct.createMany({
        data: [
            { clientId: primeirosClientes[0].id, productId: produto1.id, quantity: 50 },
            { clientId: primeirosClientes[0].id, productId: produto2.id, quantity: 30 },
            { clientId: primeirosClientes[0].id, productId: produto5.id, quantity: 80 },
        ],
    });

    // Cliente 2 - Distribuidora Centro
    await prisma.clientProduct.createMany({
        data: [
            { clientId: primeirosClientes[1].id, productId: produto1.id, quantity: 100 },
            { clientId: primeirosClientes[1].id, productId: produto3.id, quantity: 75 },
            { clientId: primeirosClientes[1].id, productId: produto4.id, quantity: 60 },
        ],
    });

    // Cliente 3 - Atacado São Paulo
    await prisma.clientProduct.createMany({
        data: [
            { clientId: primeirosClientes[2].id, productId: produto2.id, quantity: 120 },
            { clientId: primeirosClientes[2].id, productId: produto3.id, quantity: 150 },
            { clientId: primeirosClientes[2].id, productId: produto4.id, quantity: 90 },
            { clientId: primeirosClientes[2].id, productId: produto5.id, quantity: 200 },
        ],
    });

    console.log('✅ Produtos vinculados a clientes');

    // Criar campos customizados
    const campo1 = await prisma.customField.create({
        data: {
            name: 'Nome do Responsável',
            fieldType: 'text',
            order: 1,
            required: false,
            entityType: 'CLIENT',
        },
    });

    const campo2 = await prisma.customField.create({
        data: {
            name: 'Número de Funcionários',
            fieldType: 'number',
            order: 2,
            required: false,
            entityType: 'CLIENT',
        },
    });

    const campo3 = await prisma.customField.create({
        data: {
            name: 'Segmento',
            fieldType: 'select',
            options: JSON.stringify(['Varejo', 'Atacado', 'E-commerce', 'Distribuição']),
            order: 3,
            required: false,
            entityType: 'CLIENT',
        },
    });

    const campo4 = await prisma.customField.create({
        data: {
            name: 'Data de Fundação',
            fieldType: 'date',
            order: 4,
            required: false,
            entityType: 'CLIENT',
        },
    });

    console.log('✅ Campos customizados criados');

    // Adicionar valores aos campos customizados para alguns clientes
    await prisma.customFieldValue.createMany({
        data: [
            // Cliente 1 - Supermercado Bom Preço
            { customFieldId: campo1.id, clientId: primeirosClientes[0].id, value: 'Roberto Silva' },
            { customFieldId: campo2.id, clientId: primeirosClientes[0].id, value: '45' },
            { customFieldId: campo3.id, clientId: primeirosClientes[0].id, value: 'Varejo' },

            // Cliente 2 - Distribuidora Centro
            { customFieldId: campo1.id, clientId: primeirosClientes[1].id, value: 'Ana Costa' },
            { customFieldId: campo2.id, clientId: primeirosClientes[1].id, value: '120' },
            { customFieldId: campo3.id, clientId: primeirosClientes[1].id, value: 'Distribuição' },
            { customFieldId: campo4.id, clientId: primeirosClientes[1].id, value: '2015-03-15' },

            // Cliente 3 - Atacado São Paulo
            { customFieldId: campo1.id, clientId: primeirosClientes[2].id, value: 'Carlos Mendes' },
            { customFieldId: campo2.id, clientId: primeirosClientes[2].id, value: '250' },
            { customFieldId: campo3.id, clientId: primeirosClientes[2].id, value: 'Atacado' },
        ],
    });

    console.log('✅ Valores de campos customizados adicionados');

    console.log('\n🎉 Seed concluído com sucesso!');
    console.log('\nCredenciais de acesso:');
    console.log('  Gestor: admin@sunset.com / 123456');
    console.log('  Vendedor 1: joao@sunset.com / 123456');
    console.log('  Vendedor 2: maria@sunset.com / 123456');
}

main()
    .then(async () => {
        await prisma.$disconnect();
    })
    .catch(async (e) => {
        console.error('❌ Erro no seed:', e);
        await prisma.$disconnect();
        process.exit(1);
    });
