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
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";

const productSchema = z.object({
    name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
    stockCode: z.string().min(1, "Código do estoque é obrigatório"),
});

type ProductFormData = z.infer<typeof productSchema>;

interface CustomField {
    id: string;
    name: string;
    fieldType: string;
    options: string | null;
    required: boolean;
}

interface ProductModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData?: {
        id?: string;
        name: string;
        stockCode: string;
        customFieldValues?: Array<{
            customFieldId: string;
            value: string;
            customField: {
                id: string;
                name: string;
            };
        }>;
    };
}

export function ProductModal({
    open,
    onClose,
    onSuccess,
    initialData,
}: ProductModalProps) {
    const [loading, setLoading] = useState(false);
    const [customFields, setCustomFields] = useState<CustomField[]>([]);
    const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<ProductFormData>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            name: initialData?.name || "",
            stockCode: initialData?.stockCode || "",
        },
    });

    // Buscar campos customizados para produtos
    useEffect(() => {
        const fetchCustomFields = async () => {
            try {
                const res = await fetch("/api/custom-fields?entityType=PRODUCT");
                const data = await res.json();
                setCustomFields(data.customFields || []);
            } catch (error) {
                console.error("Erro ao buscar campos customizados:", error);
            }
        };

        if (open) {
            fetchCustomFields();
        }
    }, [open]);

    // Resetar formulário quando abrir/fechar ou mudar dados iniciais
    useEffect(() => {
        if (open) {
            reset({
                name: initialData?.name || "",
                stockCode: initialData?.stockCode || "",
            });

            // Preencher valores dos campos customizados
            const values: Record<string, string> = {};
            if (initialData?.customFieldValues) {
                initialData.customFieldValues.forEach((cfv) => {
                    values[cfv.customFieldId] = cfv.value;
                });
            }
            setCustomFieldValues(values);
        }
    }, [open, initialData, reset]);

    const onSubmit = async (data: ProductFormData) => {
        setLoading(true);
        try {
            const payload = {
                ...data,
                customFields: customFieldValues,
            };

            const url = initialData?.id
                ? `/api/products/${initialData.id}`
                : "/api/products";

            const method = initialData?.id ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const responseData = await res.json();

            if (!res.ok) {
                throw new Error(responseData.error || "Erro ao salvar produto");
            }

            toast({
                title: initialData?.id ? "✅ Produto atualizado!" : "✅ Produto criado!",
                description: `${data.name} foi salvo com sucesso.`,
            });

            onSuccess();
            onClose();
            reset();
            setCustomFieldValues({});
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro ao salvar produto",
                description: error.message,
            });
        } finally {
            setLoading(false);
        }
    };

    const renderCustomField = (field: CustomField) => {
        const value = customFieldValues[field.id] || "";

        const handleChange = (newValue: string) => {
            setCustomFieldValues((prev) => ({
                ...prev,
                [field.id]: newValue,
            }));
        };

        switch (field.fieldType) {
            case "number":
                return (
                    <Input
                        type="number"
                        value={value}
                        onChange={(e) => handleChange(e.target.value)}
                        placeholder={`Ex: ${field.name === "Preço" ? "25.90" : "0"}`}
                        step={field.name === "Preço" ? "0.01" : "1"}
                    />
                );

            case "date":
                return (
                    <Input
                        type="date"
                        value={value}
                        onChange={(e) => handleChange(e.target.value)}
                    />
                );

            case "select":
                let options: string[] = [];
                if (field.options) {
                    try {
                        options = JSON.parse(field.options);
                    } catch {
                        // Fallback para formato antigo (string separada por vírgula)
                        options = field.options.split(",").map(opt => opt.trim());
                    }
                }
                return (
                    <Select value={value} onValueChange={handleChange}>
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                        </SelectTrigger>
                        <SelectContent>
                            {options.map((option: string) => (
                                <SelectItem key={option} value={option}>
                                    {option}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                );

            default: // text
                if (field.name === "Descrição") {
                    return (
                        <Textarea
                            value={value}
                            onChange={(e) => handleChange(e.target.value)}
                            placeholder="Descreva o produto..."
                            rows={3}
                        />
                    );
                }
                return (
                    <Input
                        value={value}
                        onChange={(e) => handleChange(e.target.value)}
                        placeholder={`Digite ${field.name.toLowerCase()}...`}
                    />
                );
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>
                        {initialData?.id ? "Editar Produto" : "Novo Produto"}
                    </DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Campos Fixos */}
                    <div>
                        <Label htmlFor="name">Nome do Produto *</Label>
                        <Input
                            id="name"
                            {...register("name")}
                            placeholder="Ex: Café Premium 1kg"
                        />
                        {errors.name && (
                            <p className="text-sm text-destructive mt-1">
                                {errors.name.message}
                            </p>
                        )}
                    </div>

                    <div>
                        <Label htmlFor="stockCode">Código do Estoque *</Label>
                        <Input
                            id="stockCode"
                            {...register("stockCode")}
                            placeholder="Ex: CAF-001"
                        />
                        {errors.stockCode && (
                            <p className="text-sm text-destructive mt-1">
                                {errors.stockCode.message}
                            </p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                            Mesmo código do sistema de estoque da empresa
                        </p>
                    </div>

                    {/* Campos Customizados */}
                    {customFields.length > 0 && (
                        <>
                            <div className="border-t pt-4">
                                <h4 className="text-sm font-medium mb-3">
                                    Informações Adicionais
                                </h4>
                            </div>

                            {customFields
                                .filter((field) => field.fieldType !== "calculated")
                                .map((field) => (
                                    <div key={field.id}>
                                        <Label htmlFor={`custom-${field.id}`}>
                                            {field.name}
                                            {field.required && " *"}
                                        </Label>
                                        {renderCustomField(field)}
                                    </div>
                                ))}
                        </>
                    )}

                    {/* Ações */}
                    <div className="flex gap-2 justify-end pt-4 border-t">
                        <Button type="button" variant="outline" onClick={onClose}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading
                                ? "Salvando..."
                                : initialData?.id
                                    ? "Atualizar"
                                    : "Criar Produto"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
