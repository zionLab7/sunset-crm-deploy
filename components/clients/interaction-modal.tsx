"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import *  as z from "zod";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const interactionSchema = z.object({
    type: z.enum(["CALL", "VISIT", "EMAIL", "NOTE"]),
    description: z.string().min(3, "Descrição deve ter pelo menos 3 caracteres"),
});

type InteractionFormData = z.infer<typeof interactionSchema>;

interface InteractionModalProps {
    clientId: string;
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const INTERACTION_TYPES = [
    { value: "CALL", label: "📞 Ligação" },
    { value: "VISIT", label: "🏢 Visita" },
    { value: "EMAIL", label: "📧 Email" },
    { value: "NOTE", label: "📝 Nota" },
];

export function InteractionModal({
    clientId,
    open,
    onClose,
    onSuccess,
}: InteractionModalProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        reset,
        formState: { errors },
    } = useForm<InteractionFormData>({
        resolver: zodResolver(interactionSchema),
        defaultValues: {
            type: "NOTE",
            description: "",
        },
    });

    const selectedType = watch("type");

    const onSubmit = async (data: InteractionFormData) => {
        setLoading(true);
        try {
            const response = await fetch(`/api/clients/${clientId}/interactions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Erro ao criar interação");
            }

            toast({
                title: "✅ Interação registrada!",
                description: "A interação foi adicionada à timeline do cliente.",
            });

            reset();
            onSuccess();
            onClose();
            router.refresh();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro ao registrar interação",
                description: error.message,
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={(open) => !loading && !open && onClose()}>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Nova Interação</DialogTitle>
                    <DialogDescription>
                        Registre uma nova atividade realizada com o cliente.
                    </DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Tipo */}
                    <div>
                        <Label>Tipo de Interação *</Label>
                        <Select
                            value={selectedType}
                            onValueChange={(value) =>
                                setValue("type", value as InteractionFormData["type"])
                            }
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {INTERACTION_TYPES.map((type) => (
                                    <SelectItem key={type.value} value={type.value}>
                                        {type.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Descrição */}
                    <div>
                        <Label htmlFor="description">Descrição *</Label>
                        <Textarea
                            id="description"
                            {...register("description")}
                            placeholder="Descreva o que foi discutido ou realizado..."
                            rows={4}
                        />
                        {errors.description && (
                            <p className="text-sm text-red-500 mt-1">
                                {errors.description.message}
                            </p>
                        )}
                    </div>

                    {/* Botões */}
                    <div className="flex gap-2 pt-4">
                        <Button type="submit" disabled={loading} className="flex-1">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Registrar
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={onClose}
                            disabled={loading}
                        >
                            Cancelar
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
