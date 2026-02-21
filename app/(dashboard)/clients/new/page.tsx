import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ClientForm } from "@/components/clients/client-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewClientPage() {
    const user = await requireAuth();
    const userRole = (user as any).role;

    // Buscar estágios
    const stages = await prisma.pipelineStage.findMany({
        orderBy: { order: "asc" },
        select: {
            id: true,
            name: true,
            color: true,
        },
    });

    // Buscar vendedores (apenas para gestor)
    let users: Array<{ id: string; name: string }> = [];
    if (userRole === "GESTOR") {
        users = await prisma.user.findMany({
            where: { role: "VENDEDOR" },
            select: {
                id: true,
                name: true,
            },
        });
    }

    // Buscar campos customizados para clientes
    const customFields = await prisma.customField.findMany({
        where: { entityType: "CLIENT" },
        orderBy: { order: "asc" },
    });

    // Buscar produtos
    const products = await prisma.product.findMany({
        orderBy: { name: "asc" },
        select: {
            id: true,
            name: true,
            stockCode: true,
        },
    });

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8 max-w-2xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Novo Cliente</h1>
                <p className="text-muted-foreground mt-1">
                    Preencha os dados para cadastrar um novo cliente
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Dados do Cliente</CardTitle>
                </CardHeader>
                <CardContent>
                    <ClientForm
                        stages={stages}
                        users={users}
                        products={products}
                        isGestor={userRole === "GESTOR"}
                        customFields={customFields}
                    />
                </CardContent>
            </Card>
        </div>
    );
}
