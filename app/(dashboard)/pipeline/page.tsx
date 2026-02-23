"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { KanbanBoard } from "@/components/kanban/board";
import { toast } from "@/hooks/use-toast";
import { DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Plus, Settings } from "lucide-react";
import { SaleModal } from "@/components/pipeline/SaleModal";

interface Client {
    id: string;
    name: string;
    potentialValue: number;
    phone: string | null;
    currentStageId: string;
}

interface Column {
    id: string;
    name: string;
    color: string;
    isClosedStage: boolean;
    clients: Client[];
}

// Pending move — held until SaleModal is confirmed/cancelled
interface PendingMove {
    clientId: string;
    clientName: string;
    newStageId: string;
    stageName: string;
    result: DropResult;
}

export default function PipelinePage() {
    const router = useRouter();
    const [columns, setColumns] = useState<Column[]>([]);
    const [loading, setLoading] = useState(true);
    const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
    const [saleModalOpen, setSaleModalOpen] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const response = await fetch("/api/pipeline");
            const data = await response.json();
            setColumns(data.columns || []);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro ao carregar pipeline",
                description: "Tente novamente mais tarde.",
            });
        } finally {
            setLoading(false);
        }
    };

    const executeMove = async (
        result: DropResult,
        saleData?: {
            productId: string;
            productName: string;
            quantity: number;
            saleValue: number;
            notes: string;
        }
    ) => {
        const { destination, source, draggableId } = result;
        if (!destination) return;

        // Find the moved client name
        const sourceCol = columns.find((c) => c.id === source.droppableId);
        const destCol = columns.find((c) => c.id === destination.droppableId);
        if (!sourceCol || !destCol) return;

        const movedClient = sourceCol.clients[source.index];

        // Optimistic UI update
        const newColumns = columns.map((col) => ({ ...col, clients: [...col.clients] }));
        const newSrc = newColumns.find((c) => c.id === source.droppableId)!;
        const newDest = newColumns.find((c) => c.id === destination.droppableId)!;
        const [removed] = newSrc.clients.splice(source.index, 1);
        newDest.clients.splice(destination.index, 0, removed);
        setColumns(newColumns);

        try {
            const response = await fetch("/api/pipeline/move", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clientId: draggableId,
                    newStageId: destination.droppableId,
                    saleData: saleData || null,
                }),
            });

            if (!response.ok) throw new Error();

            if (saleData) {
                toast({
                    title: "🎉 Venda registrada!",
                    description: `${movedClient.name} — U$ ${saleData.saleValue.toFixed(2)} em ${destCol.name}`,
                });
            } else {
                toast({
                    title: "✅ Cliente movido!",
                    description: `${movedClient.name} agora está em ${destCol.name}`,
                });
            }
        } catch (error) {
            fetchData();
            toast({
                variant: "destructive",
                title: "Erro ao mover cliente",
                description: "A mudança foi revertida.",
            });
        }
    };

    const handleDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result;

        if (!destination) return;
        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) return;

        const destColumn = columns.find((c) => c.id === destination.droppableId);
        const sourceColumn = columns.find((c) => c.id === source.droppableId);
        if (!destColumn || !sourceColumn) return;

        const movedClient = sourceColumn.clients[source.index];

        // If moving to a closed stage, intercept and show sale modal
        if (destColumn.isClosedStage) {
            setPendingMove({
                clientId: draggableId,
                clientName: movedClient.name,
                newStageId: destination.droppableId,
                stageName: destColumn.name,
                result,
            });
            setSaleModalOpen(true);
            return;
        }

        // Otherwise, execute move directly
        await executeMove(result);
    };

    const handleSaleConfirm = async (saleData: {
        productId: string;
        productName: string;
        quantity: number;
        saleValue: number;
        notes: string;
    }) => {
        if (!pendingMove) return;
        setSaleModalOpen(false);
        await executeMove(pendingMove.result, saleData);
        setPendingMove(null);
    };

    const handleSaleCancel = () => {
        setSaleModalOpen(false);
        setPendingMove(null);
        // No move, no state change needed (optimistic update not done for closed stage)
    };

    const handleArchive = async (clientId: string, clientName: string) => {
        try {
            const response = await fetch(`/api/clients/${clientId}/archive`, {
                method: "PATCH",
            });

            if (!response.ok) throw new Error();

            setColumns((prev) =>
                prev.map((col) => ({
                    ...col,
                    clients: col.clients.filter((c) => c.id !== clientId),
                }))
            );

            toast({
                title: "📦 Cliente arquivado",
                description: `${clientName} foi removido do pipeline. O histórico permanece na ficha do cliente.`,
            });
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro ao arquivar",
                description: "Tente novamente.",
            });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Pipeline de Vendas</h1>
                    <p className="text-muted-foreground mt-1">
                        Arraste os cards para mover clientes entre os estágios
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => router.push("/settings?tab=pipeline")}>
                        <Settings className="h-4 w-4 mr-2" />
                        Configurar Funil
                    </Button>
                    <Button onClick={() => router.push("/clients/new")}>
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Cliente
                    </Button>
                </div>
            </div>

            {/* Kanban Board */}
            {columns.length === 0 ? (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">
                        Nenhum estágio configurado. Configure seu funil primeiro.
                    </p>
                </div>
            ) : (
                <KanbanBoard columns={columns} onDragEnd={handleDragEnd} onArchive={handleArchive} />
            )}

            {/* Sale Modal — aparece ao mover para estágio fechado */}
            {pendingMove && (
                <SaleModal
                    open={saleModalOpen}
                    clientName={pendingMove.clientName}
                    stageName={pendingMove.stageName}
                    onConfirm={handleSaleConfirm}
                    onCancel={handleSaleCancel}
                />
            )}
        </div>
    );
}
