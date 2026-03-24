"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { SaleModal } from "@/components/pipeline/SaleModal";

const interactionSchema = z.object({
    description: z.string().optional(),
});

type InteractionFormData = z.infer<typeof interactionSchema>;

interface InteractionType {
    id: string;
    name: string;
    emoji: string;
    isSaleType: boolean;
    color: string;
}

interface SaleData {
    productId: string;
    productName: string;
    quantity: number;
    saleValue: number;
    notes: string;
}

interface InteractionModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    clientId: string;
    clientName: string;
    onRequestTask?: () => void;
}

export function InteractionModal({
    open,
    onClose,
    onSuccess,
    clientId,
    clientName,
    onRequestTask,
}: InteractionModalProps) {
    const [loading, setLoading] = useState(false);
    const [interactionTypes, setInteractionTypes] = useState<InteractionType[]>([]);
    const [selectedType, setSelectedType] = useState<InteractionType | null>(null);
    const [saleModalOpen, setSaleModalOpen] = useState(false);
    const [pendingSaleData, setPendingSaleData] = useState<SaleData | null>(null);
    const [promptTask, setPromptTask] = useState(false);

    const { register, handleSubmit, reset, formState: { errors } } = useForm<InteractionFormData>({
        resolver: zodResolver(interactionSchema),
    });

    useEffect(() => {
        if (open) {
            fetchInteractionTypes();
            reset();
            setSelectedType(null);
            setPendingSaleData(null);
            setPromptTask(false);
        }
    }, [open, reset]);

    const fetchInteractionTypes = async () => {
        try {
            const res = await fetch("/api/admin/interaction-types");
            const data = await res.json();
            setInteractionTypes(data.types || []);
        } catch {
            setInteractionTypes([
                { id: "itc_call", name: "Ligação", emoji: "📞", isSaleType: false, color: "blue" },
                { id: "itc_visit", name: "Visita", emoji: "🏢", isSaleType: false, color: "purple" },
                { id: "itc_email", name: "Email", emoji: "📧", isSaleType: false, color: "green" },
                { id: "itc_note", name: "Nota", emoji: "📝", isSaleType: false, color: "gray" },
                { id: "itc_sale", name: "Venda", emoji: "💰", isSaleType: true, color: "amber" },
            ]);
        }
    };

    const handleTypeSelect = (type: InteractionType) => {
        setSelectedType(type);
        setPendingSaleData(null);
        if (type.isSaleType) {
            setSaleModalOpen(true);
        }
    };

    const handleSaleConfirm = (saleData: SaleData) => {
        setPendingSaleData(saleData);
        setSaleModalOpen(false);
    };

    const handleSaleCancel = () => {
        setSaleModalOpen(false);
        if (selectedType?.isSaleType) setSelectedType(null);
    };

    const onSubmit = async (data: InteractionFormData) => {
        if (!selectedType) {
            toast({ variant: "destructive", title: "Selecione um tipo de interação" });
            return;
        }
        if (selectedType.isSaleType && !pendingSaleData) {
            setSaleModalOpen(true);
            return;
        }

        setLoading(true);
        try {
            const metadata = pendingSaleData
                ? JSON.stringify({
                    saleValue: pendingSaleData.saleValue,
                    productId: pendingSaleData.productId,
                    productName: pendingSaleData.productName,
                    quantity: pendingSaleData.quantity,
                    notes: pendingSaleData.notes,
                })
                : undefined;

            const res = await fetch(`/api/clients/${clientId}/interactions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    clientId,
                    type: selectedType.name,
                    description: data.description,
                    metadata,
                }),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Erro ao registrar interação");
            }

            toast({ title: "✅ Interação registrada!", description: `${selectedType.emoji} ${selectedType.name} com ${clientName}` });
            onSuccess();
            setPromptTask(true);
        } catch (error: any) {
            toast({ variant: "destructive", title: "Erro ao salvar", description: error.message });
        } finally {
            setLoading(false);
        }
    };

    const handleTaskYes = () => {
        setPromptTask(false);
        onClose();
        if (onRequestTask) onRequestTask();
    };

    const handleTaskNo = () => {
        setPromptTask(false);
        onClose();
    };

    const colorMap: Record<string, string> = {
        blue: "border-blue-400 text-blue-700 bg-blue-50 hover:bg-blue-100",
        purple: "border-purple-400 text-purple-700 bg-purple-50 hover:bg-purple-100",
        green: "border-green-400 text-green-700 bg-green-50 hover:bg-green-100",
        gray: "border-gray-300 text-gray-700 bg-gray-50 hover:bg-gray-100",
        amber: "border-amber-400 text-amber-700 bg-amber-50 hover:bg-amber-100",
        red: "border-red-400 text-red-700 bg-red-50 hover:bg-red-100",
        indigo: "border-indigo-400 text-indigo-700 bg-indigo-50 hover:bg-indigo-100",
    };

    return (
        <>
            <Dialog open={open && !saleModalOpen} onOpenChange={(o) => !loading && !o && onClose()}>
                <DialogContent className="max-w-md">
                    <DialogHeader>
                        <DialogTitle>Nova Interação</DialogTitle>
                        <DialogDescription>Registre uma nova atividade realizada com o cliente.</DialogDescription>
                    </DialogHeader>

                    {promptTask ? (
                        <div className="space-y-4 py-2">
                            <p className="text-sm text-muted-foreground text-center">
                                Deseja agendar uma tarefa de acompanhamento para <strong>{clientName}</strong>?
                            </p>
                            <div className="flex gap-3">
                                <Button className="flex-1" onClick={handleTaskYes}>📅 Sim, agendar</Button>
                                <Button variant="outline" className="flex-1" onClick={handleTaskNo}>Não, obrigado</Button>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                            <div>
                                <Label>Tipo de Interação *</Label>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    {interactionTypes.map((type) => {
                                        const colorClass = colorMap[type.color] || colorMap.gray;
                                        const isSelected = selectedType?.id === type.id;
                                        return (
                                            <button
                                                key={type.id}
                                                type="button"
                                                onClick={() => handleTypeSelect(type)}
                                                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 text-sm font-medium transition-all ${isSelected ? "ring-2 ring-offset-1 ring-primary " + colorClass : colorClass + " border-opacity-60"}`}
                                            >
                                                <span className="text-base">{type.emoji}</span>
                                                <span className="flex-1 text-left">{type.name}</span>
                                                {type.isSaleType && (
                                                    <span className="text-[10px] font-bold uppercase tracking-wide bg-amber-500 text-white px-1.5 py-0.5 rounded">
                                                        VENDA
                                                    </span>
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                                {selectedType?.isSaleType && pendingSaleData && (
                                    <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded-md text-xs text-green-700 flex items-center justify-between">
                                        <span>💰 Venda: {pendingSaleData.productName} × {pendingSaleData.quantity} — R$ {pendingSaleData.saleValue.toFixed(2)}</span>
                                        <button type="button" onClick={() => setSaleModalOpen(true)} className="underline ml-2">editar</button>
                                    </div>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="description">Descrição *</Label>
                                <Textarea
                                    id="description"
                                    {...register("description")}
                                    placeholder="Descreva o que foi discutido ou realizado..."
                                    rows={3}
                                    className="mt-1"
                                />
                                {errors.description && (
                                    <p className="text-sm text-red-500 mt-1">{errors.description.message}</p>
                                )}
                            </div>

                            <div className="flex gap-2 pt-2">
                                <Button type="submit" disabled={loading || !selectedType} className="flex-1">
                                    {loading ? "Registrando..." : "Registrar"}
                                </Button>
                                <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
                                    Cancelar
                                </Button>
                            </div>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            <SaleModal
                open={saleModalOpen}
                clientName={clientName}
                stageName="Interação de Venda"
                onConfirm={handleSaleConfirm}
                onCancel={handleSaleCancel}
            />
        </>
    );
}
