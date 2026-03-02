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
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { EyeOff, Lock, Settings } from "lucide-react";

const productSchema = z.object({
    name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
    stockCode: z.string().min(1, "Código do estoque é obrigatório"),
    costPrice: z.string().optional(),
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
    userRole?: string;
    initialData?: {
        id?: string;
        name: string;
        stockCode: string;
        costPrice?: number | null;
        customFieldValues?: Array<{
            customFieldId: string;
            value: string;
            customField: { id: string; name: string };
        }>;
    };
}

export function ProductModal({ open, onClose, onSuccess, userRole, initialData }: ProductModalProps) {
    const [loading, setLoading] = useState(false);
    const [customFields, setCustomFields] = useState<CustomField[]>([]);
    const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
    // Per-product field visibility (GESTOR only)
    const [hiddenFields, setHiddenFields] = useState<string[]>([]);
    const [loadingVisibility, setLoadingVisibility] = useState(false);
    const [showVisibilitySection, setShowVisibilitySection] = useState(false);

    const isGestor = userRole === "GESTOR";

    const { register, handleSubmit, reset, formState: { errors } } = useForm<ProductFormData>({
        resolver: zodResolver(productSchema),
        defaultValues: {
            name: initialData?.name || "",
            stockCode: initialData?.stockCode || "",
            costPrice: initialData?.costPrice?.toString() || "",
        },
    });

    useEffect(() => {
        if (!open) return;
        fetch("/api/custom-fields?entityType=PRODUCT")
            .then(r => r.json())
            .then(d => setCustomFields(d.customFields || []))
            .catch(() => { });
    }, [open]);

    // Fetch existing visibility config when editing an existing product
    useEffect(() => {
        if (open && isGestor && initialData?.id) {
            setLoadingVisibility(true);
            fetch(`/api/admin/product-visibility/${initialData.id}`)
                .then(r => r.json())
                .then(d => {
                    // API returns { visibilities: [{ fieldKey, hiddenForRole, ... }] }
                    const keys = (d.visibilities || []).map((v: any) => v.fieldKey as string);
                    setHiddenFields(keys);
                })
                .catch(() => setHiddenFields([]))
                .finally(() => setLoadingVisibility(false));
        } else if (open) {
            setHiddenFields([]);
        }
    }, [open, initialData?.id, isGestor]);

    useEffect(() => {
        if (open) {
            reset({
                name: initialData?.name || "",
                stockCode: initialData?.stockCode || "",
                costPrice: initialData?.costPrice?.toString() || "",
            });
            const vals: Record<string, string> = {};
            initialData?.customFieldValues?.forEach(cfv => { vals[cfv.customFieldId] = cfv.value; });
            setCustomFieldValues(vals);
            setShowVisibilitySection(false);
        }
    }, [open, initialData, reset]);

    const onSubmit = async (data: ProductFormData) => {
        setLoading(true);
        try {
            const payload: any = {
                name: data.name,
                stockCode: data.stockCode,
                customFields: customFieldValues,
            };
            if (isGestor) {
                payload.costPrice = data.costPrice ? parseFloat(data.costPrice) : null;
            }

            const url = initialData?.id ? `/api/products/${initialData.id}` : "/api/products";
            const method = initialData?.id ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const responseData = await res.json();
            if (!res.ok) throw new Error(responseData.error || "Erro ao salvar produto");

            // Save visibility settings if changed (GESTOR editing existing product)
            const productId = initialData?.id || responseData.product?.id;
            if (isGestor && productId) {
                await fetch(`/api/admin/product-visibility/${productId}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ hiddenFields }),
                }).catch(() => { });
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
            toast({ variant: "destructive", title: "Erro ao salvar produto", description: error.message });
        } finally {
            setLoading(false);
        }
    };

    const toggleHiddenField = (key: string) => {
        setHiddenFields(prev =>
            prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]
        );
    };

    const renderCustomField = (field: CustomField) => {
        const value = customFieldValues[field.id] || "";
        const handleChange = (v: string) => setCustomFieldValues(prev => ({ ...prev, [field.id]: v }));

        switch (field.fieldType) {
            case "number":
                return <Input type="number" value={value} onChange={e => handleChange(e.target.value)} placeholder="0" step="0.01" />;
            case "date":
                return <Input type="date" value={value} onChange={e => handleChange(e.target.value)} />;
            case "select":
                let opts: string[] = [];
                try { opts = JSON.parse(field.options || "[]"); } catch { opts = (field.options || "").split(",").map(o => o.trim()); }
                return (
                    <Select value={value} onValueChange={handleChange}>
                        <SelectTrigger><SelectValue placeholder="Selecione..." /></SelectTrigger>
                        <SelectContent>{opts.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                    </Select>
                );
            default:
                if (field.name === "Descrição") {
                    return <Textarea value={value} onChange={e => handleChange(e.target.value)} placeholder="Descreva o produto..." rows={3} />;
                }
                return <Input value={value} onChange={e => handleChange(e.target.value)} placeholder={`Digite ${field.name.toLowerCase()}...`} />;
        }
    };

    const visibleCustomFields = customFields.filter(f => f.fieldType !== "calculated");
    // For visibility control, we include ALL fields (including calculated) so gestor can hide them
    const allCustomFieldsForVisibility = customFields;

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>{initialData?.id ? "Editar Produto" : "Novo Produto"}</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Campos fixos */}
                    <div>
                        <Label htmlFor="name">Nome do Produto *</Label>
                        <Input id="name" {...register("name")} placeholder="Ex: Café Premium 1kg" />
                        {errors.name && <p className="text-sm text-destructive mt-1">{errors.name.message}</p>}
                    </div>

                    <div>
                        <Label htmlFor="stockCode">Código do Estoque *</Label>
                        <Input id="stockCode" {...register("stockCode")} placeholder="Ex: CAF-001" />
                        {errors.stockCode && <p className="text-sm text-destructive mt-1">{errors.stockCode.message}</p>}
                        <p className="text-xs text-muted-foreground mt-1">Mesmo código do sistema de estoque da empresa</p>
                    </div>



                    {/* Campos Customizados */}
                    {visibleCustomFields.length > 0 && (
                        <>
                            <div className="border-t pt-4">
                                <h4 className="text-sm font-medium mb-3">Informações Adicionais</h4>
                            </div>
                            {visibleCustomFields.map(field => (
                                <div key={field.id}>
                                    <Label htmlFor={`custom-${field.id}`}>
                                        {field.name}{field.required && " *"}
                                    </Label>
                                    {renderCustomField(field)}
                                </div>
                            ))}
                        </>
                    )}

                    {/* Visibilidade para Vendedores — GESTOR ONLY, edit mode */}
                    {isGestor && initialData?.id && (
                        <div className="border-t pt-4">
                            <button
                                type="button"
                                className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground w-full mb-3"
                                onClick={() => setShowVisibilitySection(!showVisibilitySection)}
                            >
                                <Settings className="h-4 w-4" />
                                Visibilidade para Vendedores
                                <span className="text-xs ml-auto">{showVisibilitySection ? "▲" : "▼"}</span>
                            </button>

                            {showVisibilitySection && (
                                <div className="space-y-2 p-3 bg-slate-50 border rounded-lg">
                                    <p className="text-xs text-muted-foreground mb-3">
                                        Campos marcados ficarão ocultos para Vendedores neste produto.
                                    </p>
                                    {loadingVisibility ? (
                                        <div className="h-8 flex items-center justify-center">
                                            <div className="animate-spin h-4 w-4 border-b-2 border-primary rounded-full" />
                                        </div>
                                    ) : (
                                        <>
                                            {/* Custom fields — todos, incluindo calculados */}
                                            {allCustomFieldsForVisibility.map(field => (
                                                <div key={field.id} className="flex items-center justify-between py-1.5 border-b last:border-0">
                                                    <div className="flex items-center gap-2">
                                                        {hiddenFields.includes(field.id) && <EyeOff className="h-3.5 w-3.5 text-muted-foreground" />}
                                                        <span className="text-sm">{field.name}</span>
                                                        {field.fieldType === "calculated" && (
                                                            <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 rounded">calculado</span>
                                                        )}
                                                    </div>
                                                    <Switch
                                                        checked={hiddenFields.includes(field.id)}
                                                        onCheckedChange={() => toggleHiddenField(field.id)}
                                                    />
                                                </div>
                                            ))}
                                            <p className="text-xs text-muted-foreground pt-1">
                                                {hiddenFields.length === 0 ? "Nenhum campo oculto" : `${hiddenFields.length} campo(s) oculto(s) para vendedores`}
                                            </p>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Ações */}
                    <div className="flex gap-2 justify-end pt-4 border-t">
                        <Button type="button" variant="outline" onClick={onClose}>Cancelar</Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? "Salvando..." : initialData?.id ? "Atualizar" : "Criar Produto"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
