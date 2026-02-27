import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ClientDossier } from "@/components/clients/client-dossier";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default async function ClientPage({
    params,
}: {
    params: { id: string };
}) {
    const user = await requireAuth();
    const userId = (user as any).id;
    const userRole = (user as any).role;

    // Buscar cliente
    const client = await prisma.client.findUnique({
        where: { id: params.id },
        include: {
            currentStage: true,
            assignedUser: {
                select: {
                    id: true,
                    name: true,
                    email: true,
                },
            },
            interactions: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: "desc",
                },
            },
            tasks: {
                include: {
                    user: {
                        select: {
                            id: true,
                            name: true,
                        },
                    },
                },
                orderBy: {
                    dueDate: "asc",
                },
            },
            products: {
                include: {
                    product: true,
                },
            },
            customFieldValues: {
                include: {
                    customField: true,
                },
            },
        },
    });

    if (!client) {
        notFound();
    }

    // Verificar permissão (vendedor só vê seus clientes)
    if (userRole !== "GESTOR" && client.assignedUserId !== userId) {
        notFound();
    }

    return (
        <div className="p-4 md:p-8">
            {/* Botão Voltar */}
            <Link href="/clients">
                <Button variant="ghost" className="mb-6">
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Voltar para Clientes
                </Button>
            </Link>

            {/* Dossiê */}
            <ClientDossier client={client} />
        </div>
    );
}
