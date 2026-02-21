"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, Edit, Trash2, Layers, GripVertical, CheckCircle2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import { PipelineStageModal } from "./PipelineStageModal";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";

interface PipelineStage {
    id: string;
    name: string;
    color: string;
    order: number;
    isClosedStage?: boolean;
    _count?: {
        clients: number;
    };
}

export function PipelineStagesTab() {
    const { confirm, ConfirmDialog } = useConfirm();
    const [stages, setStages] = useState<PipelineStage[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(null);

    useEffect(() => {
        fetchStages();
    }, []);

    const fetchStages = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/pipeline-stages");
            const data = await res.json();
            setStages(data.stages || []);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro ao carregar fases",
                description: "Tente novamente mais tarde.",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleNewStage = () => {
        setSelectedStage(null);
        setModalOpen(true);
    };

    const handleEditStage = (stage: PipelineStage) => {
        setSelectedStage(stage);
        setModalOpen(true);
    };

    const handleDeleteStage = async (stage: PipelineStage) => {
        const confirmed = await confirm({
            title: "Excluir Fase do Funil",
            description: `Tem certeza que deseja excluir a fase "${stage.name}"? Esta ação não pode ser desfeita.`,
            confirmText: "Excluir",
        });

        if (!confirmed) {
            return;
        }

        try {
            const res = await fetch(`/api/admin/pipeline-stages/${stage.id}`, {
                method: "DELETE",
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Erro ao excluir fase");
            }

            toast({
                title: "✅ Fase excluída!",
                description: `${stage.name} foi removida com sucesso.`,
            });

            fetchStages();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro ao excluir fase",
                description: error.message,
            });
        }
    };

    const handleDragEnd = async (result: DropResult) => {
        if (!result.destination) return;

        const items = Array.from(stages);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        // Atualizar ordem local imediatamente
        const updatedStages = items.map((item, index) => ({
            ...item,
            order: index,
        }));
        setStages(updatedStages);

        // Enviar para API
        try {
            const res = await fetch("/api/admin/pipeline-stages/reorder", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    stages: updatedStages.map((s) => ({ id: s.id, order: s.order })),
                }),
            });

            if (!res.ok) {
                throw new Error("Erro ao reordenar fases");
            }

            toast({
                title: "✅ Ordem atualizada!",
                description: "As fases foram reordenadas com sucesso.",
            });
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro ao reordenar",
                description: error.message,
            });
            // Reverter em caso de erro
            fetchStages();
        }
    };

    const handleToggleClosedStage = async (stage: PipelineStage) => {
        try {
            const newValue = !stage.isClosedStage;

            const res = await fetch(`/api/admin/pipeline-stages/${stage.id}/set-closed`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ isClosedStage: newValue }),
            });

            if (!res.ok) {
                throw new Error("Erro ao atualizar fase");
            }

            toast({
                title: newValue ? "✅ Fase marcada como Venda Fechada!" : "ℹ️ Fase desmarcada",
                description: newValue
                    ? `${stage.name} agora define vendas fechadas nos relatórios`
                    : `${stage.name} não é mais considerada venda fechada`,
            });

            fetchStages();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro ao atualizar fase",
                description: error.message,
            });
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-2">
                        <Layers className="h-5 w-5 text-muted-foreground" />
                        <CardTitle>Fases do Funil</CardTitle>
                    </div>
                    <Button size="sm" onClick={handleNewStage}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nova Fase
                    </Button>
                </CardHeader>
                <CardContent>
                    {stages.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>Nenhuma fase cadastrada</p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="mt-4"
                                onClick={handleNewStage}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Criar Primeira Fase
                            </Button>
                        </div>
                    ) : (
                        <DragDropContext onDragEnd={handleDragEnd}>
                            <Droppable droppableId="pipeline-stages">
                                {(provided) => (
                                    <div
                                        {...provided.droppableProps}
                                        ref={provided.innerRef}
                                        className="space-y-2"
                                    >
                                        {stages.map((stage, index) => (
                                            <Draggable
                                                key={stage.id}
                                                draggableId={stage.id}
                                                index={index}
                                            >
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        className={`flex items-center gap-3 p-4 border rounded-lg transition-colors ${snapshot.isDragging
                                                            ? "bg-muted/70 shadow-lg"
                                                            : "bg-background hover:bg-muted/50"
                                                            }`}
                                                    >
                                                        <div
                                                            {...provided.dragHandleProps}
                                                            className="cursor-grab active:cursor-grabbing"
                                                        >
                                                            <GripVertical className="h-5 w-5 text-muted-foreground" />
                                                        </div>
                                                        <div
                                                            className="w-4 h-4 rounded-full flex-shrink-0"
                                                            style={{ backgroundColor: stage.color }}
                                                        />
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-medium">{stage.name}</h4>
                                                                {stage.isClosedStage && (
                                                                    <Badge variant="default" className="bg-green-600">
                                                                        <CheckCircle2 className="h-3 w-3 mr-1" />
                                                                        Venda Fechada
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-3 mt-1">
                                                                {stage._count !== undefined && (
                                                                    <p className="text-xs text-muted-foreground">
                                                                        {stage._count.clients} cliente(s)
                                                                    </p>
                                                                )}
                                                                <div className="flex items-center gap-2">
                                                                    <Checkbox
                                                                        checked={stage.isClosedStage || false}
                                                                        onCheckedChange={() => handleToggleClosedStage(stage)}
                                                                        id={`closed-${stage.id}`}
                                                                    />
                                                                    <label
                                                                        htmlFor={`closed-${stage.id}`}
                                                                        className="text-xs text-muted-foreground cursor-pointer"
                                                                    >
                                                                        Marcar como Venda Fechada
                                                                    </label>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <div className="flex gap-1">
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() => handleEditStage(stage)}
                                                            >
                                                                <Edit className="h-4 w-4" />
                                                            </Button>
                                                            <Button
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() => handleDeleteStage(stage)}
                                                            >
                                                                <Trash2 className="h-4 w-4 text-destructive" />
                                                            </Button>
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        ))}
                                        {provided.placeholder}
                                    </div>
                                )}
                            </Droppable>
                        </DragDropContext>
                    )}
                </CardContent>
            </Card>

            <PipelineStageModal
                open={modalOpen}
                onClose={() => {
                    setModalOpen(false);
                    setSelectedStage(null);
                }}
                onSuccess={fetchStages}
                initialData={selectedStage || undefined}
                currentMaxOrder={stages.length}
            />

            <ConfirmDialog />
        </div>
    );
}
