"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { KanbanBoard } from "@/components/kanban/board";
import { toast } from "@/hooks/use-toast";
import { DropResult } from "@hello-pangea/dnd";
import { Button } from "@/components/ui/button";
import { Plus, Settings } from "lucide-react";

interface Client {
    id: string;
    name: string;
    potentialValue: number;
    phone: string | null;
    currentStageId: string;
}

interface PipelineStage {
    id: string;
    name: string;
    color: string;
    order: number;
}

interface Column {
    id: string;
    name: string;
    color: string;
    clients: Client[];
}

export default function PipelinePage() {
    const router = useRouter();
    const [columns, setColumns] = useState<Column[]>([]);
    const [loading, setLoading] = useState(true);

    // Buscar dados iniciais
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

    const handleDragEnd = async (result: DropResult) => {
        const { destination, source, draggableId } = result;

        // Não fez nada
        if (!destination) return;

        // Mesma posição
        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) {
            return;
        }

        // Atualizar UI otimisticamente
        const newColumns = [...columns];
        const sourceColumn = newColumns.find((c) => c.id === source.droppableId);
        const destColumn = newColumns.find((c) => c.id === destination.droppableId);

        if (!sourceColumn || !destColumn) return;

        const [movedClient] = sourceColumn.clients.splice(source.index, 1);
        destColumn.clients.splice(destination.index, 0, movedClient);

        setColumns(newColumns);

        // Atualizar no backend
        try {
            const response = await fetch("/api/pipeline/move", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clientId: draggableId,
                    newStageId: destination.droppableId,
                }),
            });

            if (!response.ok) throw new Error();

            toast({
                title: "✅ Cliente movido!",
                description: `${movedClient.name} agora está em ${destColumn.name}`,
            });
        } catch (error) {
            // Reverter mudança em caso de erro
            fetchData();
            toast({
                variant: "destructive",
                title: "Erro ao mover cliente",
                description: "A mudança foi revertida.",
            });
        }
    };

    const handleArchive = async (clientId: string, clientName: string) => {
        try {
            const response = await fetch(`/api/clients/${clientId}/archive`, {
                method: "PATCH",
            });

            if (!response.ok) throw new Error();

            // Remover cliente da UI
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
        </div>
    );
}
