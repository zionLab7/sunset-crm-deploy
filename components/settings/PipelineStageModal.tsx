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
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";

const stageSchema = z.object({
    name: z.string().min(1, "Nome é obrigatório"),
    color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Cor deve estar no formato hex (#RRGGBB)"),
});

type StageFormData = z.infer<typeof stageSchema>;

interface PipelineStageModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    currentMaxOrder: number;
    initialData?: {
        id: string;
        name: string;
        color: string;
        order: number;
    };
}

// Cores predefinidas para seleção rápida
const PRESET_COLORS = [
    "#ef4444", // red
    "#f59e0b", // amber
    "#10b981", // green
    "#3b82f6", // blue
    "#8b5cf6", // purple
    "#ec4899", // pink
    "#6366f1", // indigo
    "#14b8a6", // teal
];

export function PipelineStageModal({
    open,
    onClose,
    onSuccess,
    currentMaxOrder,
    initialData,
}: PipelineStageModalProps) {
    const [loading, setLoading] = useState(false);
    const [selectedColor, setSelectedColor] = useState("#3b82f6");

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        formState: { errors },
    } = useForm<StageFormData>({
        resolver: zodResolver(stageSchema),
        defaultValues: {
            name: "",
            color: "#3b82f6",
        },
    });

    useEffect(() => {
        if (open) {
            if (initialData) {
                reset({
                    name: initialData.name,
                    color: initialData.color,
                });
                setSelectedColor(initialData.color);
            } else {
                reset({
                    name: "",
                    color: "#3b82f6",
                });
                setSelectedColor("#3b82f6");
            }
        }
    }, [open, initialData, reset]);

    const onSubmit = async (data: StageFormData) => {
        setLoading(true);
        try {
            const payload: any = {
                name: data.name,
                color: data.color,
            };

            // Se for nova fase, adicionar order
            if (!initialData?.id) {
                payload.order = currentMaxOrder;
            }

            const url = initialData?.id
                ? `/api/admin/pipeline-stages/${initialData.id}`
                : "/api/admin/pipeline-stages";

            const method = initialData?.id ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const responseData = await res.json();

            if (!res.ok) {
                throw new Error(responseData.error || "Erro ao salvar fase");
            }

            toast({
                title: initialData?.id ? "✅ Fase atualizada!" : "✅ Fase criada!",
                description: `${data.name} foi salva com sucesso.`,
            });

            onSuccess();
            onClose();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro ao salvar fase",
                description: error.message,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {initialData?.id ? "Editar Fase" : "Nova Fase do Funil"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Nome */}
                    <div>
                        <Label htmlFor="name">Nome da Fase *</Label>
                        <Input
                            id="name"
                            {...register("name")}
                            placeholder="Ex: Primeiro Contato, Negociação..."
                        />
                        {errors.name && (
                            <p className="text-sm text-destructive mt-1">
                                {errors.name.message}
                            </p>
                        )}
                    </div>

                    {/* Cor */}
                    <div>
                        <Label>Cor *</Label>
                        <div className="grid grid-cols-8 gap-2 mt-2">
                            {PRESET_COLORS.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    className={`w-10 h-10 rounded-md border-2 transition-all ${selectedColor === color
                                            ? "border-primary scale-110"
                                            : "border-transparent hover:scale-105"
                                        }`}
                                    style={{ backgroundColor: color }}
                                    onClick={() => {
                                        setSelectedColor(color);
                                        setValue("color", color);
                                    }}
                                />
                            ))}
                        </div>

                        {/* Color Picker Customizado */}
                        <div className="mt-3 flex gap-2 items-center">
                            <input
                                type="color"
                                value={selectedColor}
                                onChange={(e) => {
                                    setSelectedColor(e.target.value);
                                    setValue("color", e.target.value);
                                }}
                                className="w-16 h-10 rounded cursor-pointer"
                            />
                            <Input
                                {...register("color")}
                                value={selectedColor}
                                onChange={(e) => {
                                    setSelectedColor(e.target.value);
                                    setValue("color", e.target.value);
                                }}
                                placeholder="#3b82f6"
                                maxLength={7}
                                className="flex-1"
                            />
                        </div>
                        {errors.color && (
                            <p className="text-sm text-destructive mt-1">
                                {errors.color.message}
                            </p>
                        )}
                    </div>

                    {/* Ações */}
                    <div className="flex gap-2 justify-end pt-4">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading
                                ? "Salvando..."
                                : initialData?.id
                                    ? "Atualizar"
                                    : "Criar Fase"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
