"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "@/hooks/use-toast";
import { formatCNPJ, formatPhone } from "@/lib/utils";
import { Loader2 } from "lucide-react";

const clientSchema = z.object({
    name: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
    cnpj: z.string().min(14, "CNPJ inválido"),
    phone: z.string().optional(),
    email: z.string().email("Email inválido").optional().or(z.literal("")),
    potentialValue: z.number().min(0, "Valor deve ser positivo").optional(),
    currentStageId: z.string().min(1, "Selecione um estágio"),
    assignedUserId: z.string().optional(),
});

type ClientFormData = z.infer<typeof clientSchema>;

interface CustomField {
    id: string;
    name: string;
    fieldType: string;
    options: string | null;
    required: boolean;
}

interface Product {
    id: string;
    name: string;
    stockCode: string;
}

interface ClientFormProps {
    stages: Array<{ id: string; name: string; color: string }>;
    users?: Array<{ id: string; name: string }>;
    products?: Product[];
    initialData?: Partial<ClientFormData> & { id?: string; productIds?: string[] };
    isGestor: boolean;
    customFields?: CustomField[];
    onSuccess?: () => void;
}

export function ClientForm({
    stages,
    users = [],
    products = [],
    initialData,
    isGestor,
    customFields = [],
    onSuccess,
}: ClientFormProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const [selectedProducts, setSelectedProducts] = useState<string[]>(
        initialData?.productIds || []
    );
    const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
    const [cnpjValue, setCnpjValue] = useState(
        initialData?.cnpj ? formatCNPJ(initialData.cnpj) : ""
    );
    const [phoneValue, setPhoneValue] = useState(
        initialData?.phone ? formatPhone(initialData.phone) : ""
    );

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<ClientFormData>({
        resolver: zodResolver(clientSchema),
        defaultValues: {
            name: initialData?.name || "",
            cnpj: initialData?.cnpj || "",
            phone: initialData?.phone || "",
            email: initialData?.email || "",
            potentialValue: initialData?.potentialValue || 0,
            currentStageId: initialData?.currentStageId || stages[0]?.id || "",
            assignedUserId: initialData?.assignedUserId || "",
        },
    });

    const selectedStageId = watch("currentStageId");
    const selectedUserId = watch("assignedUserId");

    const onSubmit = async (data: ClientFormData) => {
        setLoading(true);
        try {
            const url = initialData?.id
                ? `/api/clients/${initialData.id}`
                : "/api/clients";
            const method = initialData?.id ? "PATCH" : "POST";

            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...data,
                    cnpj: data.cnpj.replace(/\D/g, ""),
                    phone: data.phone?.replace(/\D/g, "") || null,
                    customFields: customFieldValues,
                    productIds: selectedProducts,
                }),
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || "Erro ao salvar cliente");
            }

            toast({
                title: initialData?.id ? "✅ Cliente atualizado!" : "✅ Cliente criado!",
                description: `${data.name} foi salvo com sucesso.`,
            });

            if (onSuccess) {
                onSuccess();
            } else {
                router.push("/clients");
                router.refresh();
            }
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro ao salvar cliente",
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
                        placeholder="0"
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
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Nome */}
            <div>
                <Label htmlFor="name">Nome *</Label>
                <Input
                    id="name"
                    {...register("name")}
                    placeholder="Ex: Distribuidora ABC"
                />
                {errors.name && (
                    <p className="text-sm text-red-500 mt-1">{errors.name.message}</p>
                )}
            </div>

            {/* CNPJ */}
            <div>
                <Label htmlFor="cnpj">CNPJ *</Label>
                <Input
                    id="cnpj"
                    value={cnpjValue}
                    onChange={(e) => {
                        const formatted = formatCNPJ(e.target.value);
                        setCnpjValue(formatted);
                        setValue("cnpj", formatted.replace(/\D/g, ""));
                    }}
                    placeholder="00.000.000/0000-00"
                    maxLength={18}
                    disabled={!!initialData?.id} // Não permite editar CNPJ
                />
                {errors.cnpj && (
                    <p className="text-sm text-red-500 mt-1">{errors.cnpj.message}</p>
                )}
            </div>

            {/* Telefone */}
            <div>
                <Label htmlFor="phone">Telefone</Label>
                <Input
                    id="phone"
                    value={phoneValue}
                    onChange={(e) => {
                        const formatted = formatPhone(e.target.value);
                        setPhoneValue(formatted);
                        setValue("phone", formatted.replace(/\D/g, ""));
                    }}
                    placeholder="(00) 00000-0000"
                    maxLength={15}
                />
            </div>

            {/* Email */}
            <div>
                <Label htmlFor="email">Email</Label>
                <Input
                    id="email"
                    type="email"
                    {...register("email")}
                    placeholder="contato@empresa.com"
                />
                {errors.email && (
                    <p className="text-sm text-red-500 mt-1">{errors.email.message}</p>
                )}
            </div>

            {/* Valor Potencial */}
            <div>
                <Label htmlFor="potentialValue">Valor Potencial (R$)</Label>
                <Input
                    id="potentialValue"
                    type="number"
                    step="0.01"
                    {...register("potentialValue", { valueAsNumber: true })}
                    placeholder="0.00"
                />
                {errors.potentialValue && (
                    <p className="text-sm text-red-500 mt-1">
                        {errors.potentialValue.message}
                    </p>
                )}
            </div>

            {/* Estágio */}
            <div>
                <Label>Estágio Atual *</Label>
                <Select
                    value={selectedStageId}
                    onValueChange={(value) => setValue("currentStageId", value)}
                >
                    <SelectTrigger>
                        <SelectValue placeholder="Selecione um estágio" />
                    </SelectTrigger>
                    <SelectContent>
                        {stages.map((stage) => (
                            <SelectItem key={stage.id} value={stage.id}>
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-3 h-3 rounded-full"
                                        style={{ backgroundColor: stage.color }}
                                    />
                                    {stage.name}
                                </div>
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {errors.currentStageId && (
                    <p className="text-sm text-red-500 mt-1">
                        {errors.currentStageId.message}
                    </p>
                )}
            </div>

            {/* Vendedor Responsável (apenas para Gestor) */}
            {isGestor && users.length > 0 && (
                <div>
                    <Label>Vendedor Responsável</Label>
                    <Select
                        value={selectedUserId}
                        onValueChange={(value) => setValue("assignedUserId", value)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder="Selecione um vendedor" />
                        </SelectTrigger>
                        <SelectContent>
                            {users.map((user) => (
                                <SelectItem key={user.id} value={user.id}>
                                    {user.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            )}

            {/* Campos Customizados */}
            {customFields.length > 0 && (
                <div className="pt-4 border-t">
                    <h3 className="text-sm font-medium mb-3">Campos Adicionais</h3>
                    <div className="space-y-4">
                        {customFields.map((field) => (
                            <div key={field.id}>
                                <Label htmlFor={`custom-${field.id}`}>
                                    {field.name} {field.required && "*"}
                                </Label>
                                {renderCustomField(field)}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Produtos Vinculados */}
            {products.length > 0 && (
                <div className="pt-4 border-t">
                    <Label className="text-sm font-medium mb-3">Produtos de Interesse</Label>
                    <p className="text-xs text-muted-foreground mb-3">
                        Selecione os produtos que o cliente tem interesse
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                        {products.map((product) => (
                            <div key={product.id} className="flex items-center space-x-2">
                                <Checkbox
                                    id={`product-${product.id}`}
                                    checked={selectedProducts.includes(product.id)}
                                    onCheckedChange={(checked) => {
                                        if (checked) {
                                            setSelectedProducts([...selectedProducts, product.id]);
                                        } else {
                                            setSelectedProducts(selectedProducts.filter(id => id !== product.id));
                                        }
                                    }}
                                />
                                <label
                                    htmlFor={`product-${product.id}`}
                                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                    {product.name} <span className="text-muted-foreground text-xs">({product.stockCode})</span>
                                </label>
                            </div>
                        ))}
                    </div>
                    {selectedProducts.length > 0 && (
                        <p className="text-xs text-muted-foreground mt-2">
                            {selectedProducts.length} produto(s) selecionado(s)
                        </p>
                    )}
                </div>
            )}

            {/* Botões */}
            <div className="flex gap-2 pt-4">
                <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1"
                >
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {initialData?.id ? "Salvar Alterações" : "Criar Cliente"}
                </Button>
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={loading}
                >
                    Cancelar
                </Button>
            </div>
        </form>
    );
}
