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
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";

const customFieldSchema = z.object({
    name: z.string().min(1, "Nome é obrigatório"),
    fieldType: z.string(),
    options: z.string().optional(),
    required: z.boolean(),
    order: z.string(),
    formulaSourceField: z.string().optional(),
    formulaOperation: z.string().optional(),
    formulaValue: z.string().optional(),
});

type CustomFieldFormData = z.infer<typeof customFieldSchema>;

interface CustomFieldModalProps {
    open: boolean;
    onClose: () => void;
    onSuccess: () => void;
    entityType: "CLIENT" | "PRODUCT";
    initialData?: {
        id?: string;
        name: string;
        fieldType: string;
        options?: string | null;
        formula?: string | null;
        required: boolean;
        order: number;
    };
}

export function CustomFieldModal({
    open,
    onClose,
    onSuccess,
    entityType,
    initialData,
}: CustomFieldModalProps) {
    const [loading, setLoading] = useState(false);
    const [fieldType, setFieldType] = useState("text");
    const [required, setRequired] = useState(false);
    const [sourceFields, setSourceFields] = useState<Array<{ id: string; name: string }>>([]);
    const [formulaSourceField, setFormulaSourceField] = useState("");
    const [formulaOperation, setFormulaOperation] = useState("percentage_discount");
    const [formulaValue, setFormulaValue] = useState("");

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        formState: { errors },
    } = useForm<CustomFieldFormData>({
        resolver: zodResolver(customFieldSchema),
        defaultValues: {
            name: "",
            fieldType: "text",
            options: "",
            required: false,
            order: "0",
        },
    });

    useEffect(() => {
        if (open) {
            if (initialData) {
                const parsedFormula = initialData.formula ? JSON.parse(initialData.formula) : null;
                reset({
                    name: initialData.name,
                    fieldType: initialData.fieldType,
                    options: initialData.options || "",
                    required: initialData.required,
                    order: initialData.order.toString(),
                    formulaSourceField: parsedFormula?.sourceField || "",
                    formulaOperation: parsedFormula?.operation || "percentage_discount",
                    formulaValue: parsedFormula?.value?.toString() || "",
                });
                setFieldType(initialData.fieldType);
                setRequired(initialData.required);
                if (parsedFormula) {
                    setFormulaSourceField(parsedFormula.sourceField || "");
                    setFormulaOperation(parsedFormula.operation || "percentage_discount");
                    setFormulaValue(parsedFormula.value?.toString() || "");
                }
            } else {
                reset({
                    name: "",
                    fieldType: "text",
                    options: "",
                    required: false,
                    order: "0",
                    formulaSourceField: "",
                    formulaOperation: "percentage_discount",
                    formulaValue: "",
                });
                setFieldType("text");
                setRequired(false);
                setFormulaSourceField("");
                setFormulaOperation("percentage_discount");
                setFormulaValue("");
            }

            // Fetch available number fields for formula source
            if (entityType === "PRODUCT") {
                fetch(`/api/custom-fields?entityType=PRODUCT`)
                    .then((r) => r.json())
                    .then((data) => {
                        const numberFields = (data.customFields || []).filter(
                            (f: any) => f.fieldType === "number" && f.id !== initialData?.id
                        );
                        // Prepe÷o o campo nativo costPrice como opção com sentinel especial
                        setSourceFields([
                            { id: "__costPrice__", name: "🔒 Preço de Custo (nativo)" },
                            ...numberFields,
                        ]);
                    })
                    .catch(() => { });
            }
        }
    }, [open, initialData, reset, entityType]);

    const onSubmit = async (data: CustomFieldFormData) => {
        setLoading(true);
        try {
            // Processar opções para tipo select
            let processedOptions = null;
            if (fieldType === "select" && data.options) {
                const optionsArray = data.options
                    .split(",")
                    .map((opt) => opt.trim())
                    .filter((opt) => opt.length > 0);
                processedOptions = JSON.stringify(optionsArray);
            }

            // Processar fórmula para tipo calculated
            let processedFormula = null;
            if (fieldType === "calculated") {
                processedFormula = JSON.stringify({
                    sourceField: formulaSourceField,
                    operation: formulaOperation,
                    value: parseFloat(formulaValue) || 0,
                });
            }

            const payload: any = {
                name: data.name,
                fieldType: fieldType,
                required: fieldType === "calculated" ? false : required,
                order: parseInt(data.order) || 0,
            };

            // Só incluir options/formula quando relevante
            if (processedOptions) {
                payload.options = processedOptions;
            }
            if (processedFormula) {
                payload.formula = processedFormula;
            }

            // Adicionar entityType apenas ao criar (POST), não ao editar (PATCH)
            if (!initialData?.id) {
                payload.entityType = entityType;
            }

            const url = initialData?.id
                ? `/api/admin/custom-fields/${initialData.id}`
                : "/api/admin/custom-fields";

            const method = initialData?.id ? "PATCH" : "POST";

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const responseData = await res.json();

            if (!res.ok) {
                throw new Error(responseData.error || "Erro ao salvar campo");
            }

            toast({
                title: initialData?.id ? "✅ Campo atualizado!" : "✅ Campo criado!",
                description: `${data.name} foi salvo com sucesso.`,
            });

            onSuccess();
            onClose();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro ao salvar campo",
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
                        {initialData?.id ? "Editar Campo" : "Novo Campo Customizado"}
                    </DialogTitle>
                    <p className="text-sm text-muted-foreground">
                        Para: {entityType === "CLIENT" ? "Clientes" : "Produtos"}
                    </p>
                </DialogHeader>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    {/* Nome */}
                    <div>
                        <Label htmlFor="name">Nome do Campo *</Label>
                        <Input
                            id="name"
                            {...register("name")}
                            placeholder="Ex: Fornecedor, Categoria, etc."
                        />
                        {errors.name && (
                            <p className="text-sm text-destructive mt-1">
                                {errors.name.message}
                            </p>
                        )}
                    </div>

                    {/* Tipo */}
                    <div>
                        <Label htmlFor="fieldType">Tipo do Campo *</Label>
                        <Select
                            value={fieldType}
                            onValueChange={(value) => {
                                setFieldType(value);
                                setValue("fieldType", value);
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="text">Texto</SelectItem>
                                <SelectItem value="number">Número</SelectItem>
                                <SelectItem value="date">Data</SelectItem>
                                <SelectItem value="select">Seleção (dropdown)</SelectItem>
                                {entityType === "PRODUCT" && (
                                    <SelectItem value="calculated">📊 Calculado (automático)</SelectItem>
                                )}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Opções (apenas para select) */}
                    {fieldType === "select" && (
                        <div>
                            <Label htmlFor="options">Opções (separadas por vírgula) *</Label>
                            <Textarea
                                id="options"
                                {...register("options")}
                                placeholder="Ex: Opção 1, Opção 2, Opção 3"
                                rows={3}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                                Separe cada opção com vírgula
                            </p>
                        </div>
                    )}

                    {/* Fórmula (apenas para calculated) */}
                    {fieldType === "calculated" && (
                        <div className="space-y-3 p-3 bg-purple-50 border border-purple-200 rounded-lg">
                            <p className="text-xs font-semibold text-purple-700">
                                📊 Configuração da Fórmula
                            </p>
                            <div>
                                <Label className="text-xs">Campo Fonte</Label>
                                <Select
                                    value={formulaSourceField}
                                    onValueChange={setFormulaSourceField}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue placeholder="Selecione o campo..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {sourceFields.map((f) => (
                                            <SelectItem key={f.id} value={f.id}>
                                                {f.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs">Operação</Label>
                                <Select
                                    value={formulaOperation}
                                    onValueChange={setFormulaOperation}
                                >
                                    <SelectTrigger className="mt-1">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="percentage_discount">Desconto (%)</SelectItem>
                                        <SelectItem value="percentage_add">Acréscimo (%)</SelectItem>
                                        <SelectItem value="fixed_discount">Desconto Fixo (U$)</SelectItem>
                                        <SelectItem value="fixed_add">Acréscimo Fixo (U$)</SelectItem>
                                        <SelectItem value="multiply">Multiplicar</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div>
                                <Label className="text-xs">Valor</Label>
                                <Input
                                    type="number"
                                    step="any"
                                    value={formulaValue}
                                    onChange={(e) => setFormulaValue(e.target.value)}
                                    placeholder="Ex: 10 para 10%, ou 1.15 para multiplicador"
                                    className="mt-1"
                                />
                            </div>
                            <p className="text-xs text-purple-600">
                                Este campo será calculado automaticamente e não poderá ser editado manualmente.
                            </p>
                        </div>
                    )}

                    {/* Ordem */}
                    <div>
                        <Label htmlFor="order">Ordem de Exibição</Label>
                        <Input
                            id="order"
                            type="number"
                            {...register("order")}
                            placeholder="0"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                            Campos serão exibidos em ordem crescente
                        </p>
                    </div>

                    {/* Obrigatório */}
                    <div className="flex items-center space-x-2">
                        <Checkbox
                            id="required"
                            checked={required}
                            onCheckedChange={(checked) => {
                                setRequired(checked as boolean);
                                setValue("required", checked as boolean);
                            }}
                        />
                        <Label
                            htmlFor="required"
                            className="text-sm font-normal cursor-pointer"
                        >
                            Campo obrigatório
                        </Label>
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
                                    : "Criar Campo"}
                        </Button>
                    </div>
                </form>
            </DialogContent>
        </Dialog>
    );
}
