import { notFound } from "next/navigation";
import { requireAuth, requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ClientForm } from "@/components/clients/client-form";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function EditClientPage({
    params,
}: {
    params: { id: string };
}) {
    const user = await requireAuth();
    const userId = (user as any).id;
    const userRole = (user as any).role;

    // Buscar fases do funil
    const stages = await prisma.pipelineStage.findMany({
        orderBy: { order: "asc" },
        select: { id: true, name: true, color: true },
    });

    // Buscar todos os usuários (se for gestor)
    let users: Array<{ id: string; name: string }> = [];
    if (userRole === "GESTOR") {
        users = await prisma.user.findMany({
            select: { id: true, name: true },
            orderBy: { name: "asc" },
        });
    }

    // Buscar produtos disponíveis
    const products = await prisma.product.findMany({
        select: {
            id: true,
            name: true,
            stockCode: true,
        },
        orderBy: { name: "asc" },
    });

    // Buscar campos customizados de CLIENTE
    const customFields = await prisma.customField.findMany({
        where: { entityType: "CLIENT" },
        select: {
            id: true,
            name: true,
            fieldType: true,
            options: true,
            required: true,
        },
        orderBy: { order: "asc" },
    });

    // Buscar cliente com todos os dados
    const client = await prisma.client.findUnique({
        where: { id: params.id },
        include: {
            currentStage: true,
            assignedUser: true,
            customFieldValues: {
                include: {
                    customField: true,
                },
            },
            products: {
                include: {
                    product: true,
                },
            },
        },
    });

    if (!client) {
        notFound();
    }

    // Verificar permissão (vendedor só edita seus clientes)
    if (userRole !== "GESTOR" && client.assignedUserId !== userId) {
        notFound();
    }

    // Mapear dados do cliente para o formato do formulário
    const existingCustomFieldValues: Record<string, string> = {};
    (client as any).customFieldValues?.forEach((cfv: any) => {
        existingCustomFieldValues[cfv.customFieldId] = cfv.value;
    });

    const initialData = {
        name: client.name,
        cnpj: client.cnpj ?? undefined,
        email: client.email || "",
        phone: client.phone || "",
        potentialValue: client.potentialValue || 0,
        currentStageId: client.currentStageId,
        assignedUserId: client.assignedUserId || "",
        productIds: (client as any).products.map((cp: any) => cp.productId),
        customFieldValues: existingCustomFieldValues,
    };

    return (
        <div className="p-4 md:p-8">
            {/* Botão Voltar */}
            <Link href={`/clients/${client.id}`}>
                <Button variant="ghost" className="mb-6">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar para Dossiê
                </Button>
            </Link>

            {/* Header */}
            <div className="mb-6">
                <h1 className="text-3xl font-bold tracking-tight">Editar Cliente</h1>
                <p className="text-muted-foreground mt-1">
                    Atualize as informações do cliente {client.name}
                </p>
            </div>

            {/* Formulário */}
            <ClientForm
                stages={stages}
                users={users}
                initialData={{ ...initialData, id: client.id }}
                products={products}
                customFields={customFields}
                isGestor={userRole === "GESTOR"}
            />
        </div>
    );
}
