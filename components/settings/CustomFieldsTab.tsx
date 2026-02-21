"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, FileText, Package } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import { CustomFieldModal } from "./CustomFieldModal";

interface CustomField {
    id: string;
    name: string;
    fieldType: string;
    entityType: string;
    options: string | null;
    formula: string | null;
    required: boolean;
    order: number;
    values?: Array<any>;
}

export function CustomFieldsTab() {
    const { confirm, ConfirmDialog } = useConfirm();
    const [selectedEntityType, setSelectedEntityType] = useState<"CLIENT" | "PRODUCT">("CLIENT");
    const [clientFields, setClientFields] = useState<CustomField[]>([]);
    const [productFields, setProductFields] = useState<CustomField[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedField, setSelectedField] = useState<CustomField | null>(null);

    useEffect(() => {
        fetchCustomFields();
    }, []);

    const fetchCustomFields = async () => {
        setLoading(true);
        try {
            // Buscar campos de clientes
            const clientRes = await fetch("/api/custom-fields?entityType=CLIENT");
            const clientData = await clientRes.json();
            setClientFields(clientData.customFields || []);

            // Buscar campos de produtos
            const productRes = await fetch("/api/custom-fields?entityType=PRODUCT");
            const productData = await productRes.json();
            setProductFields(productData.customFields || []);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro ao carregar campos",
                description: "Tente novamente mais tarde.",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleNewField = (entityType: "CLIENT" | "PRODUCT") => {
        setSelectedField(null);
        setSelectedEntityType(entityType);
        setModalOpen(true);
    };

    const handleEditField = (field: CustomField) => {
        setSelectedField(field);
        setSelectedEntityType(field.entityType as "CLIENT" | "PRODUCT");
        setModalOpen(true);
    };

    const handleDeleteField = async (field: CustomField) => {
        const confirmed = await confirm({
            title: "Excluir Campo Customizado",
            description: `Tem certeza que deseja excluir o campo "${field.name}"? Esta ação não pode ser desfeita.`,
            confirmText: "Excluir",
        });

        if (!confirmed) {
            return;
        }

        try {
            const res = await fetch(`/api/admin/custom-fields/${field.id}`, {
                method: "DELETE",
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Erro ao excluir campo");
            }

            toast({
                title: "✅ Campo excluído!",
                description: `${field.name} foi removido com sucesso.`,
            });

            fetchCustomFields();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro ao excluir campo",
                description: error.message,
            });
        }
    };

    const getFieldTypeLabel = (type: string) => {
        const types: Record<string, string> = {
            text: "Texto",
            number: "Número",
            date: "Data",
            select: "Seleção",
            calculated: "📊 Calculado",
        };
        return types[type] || type;
    };

    const getFormulaDescription = (formula: string | null) => {
        if (!formula) return null;
        try {
            const f = JSON.parse(formula);
            const ops: Record<string, string> = {
                percentage_discount: `Desconto de ${f.value}%`,
                percentage_add: `Acréscimo de ${f.value}%`,
                fixed_discount: `Desconto de R$ ${f.value}`,
                fixed_add: `Acréscimo de R$ ${f.value}`,
                multiply: `Multiplicar por ${f.value}`,
            };
            return ops[f.operation] || "Fórmula configurada";
        } catch {
            return null;
        }
    };

    const renderFieldsList = (fields: CustomField[], entityType: "CLIENT" | "PRODUCT") => {
        const Icon = entityType === "CLIENT" ? FileText : Package;
        const title = entityType === "CLIENT" ? "Campos de Clientes" : "Campos de Produtos";

        return (
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-2">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <CardTitle>{title}</CardTitle>
                    </div>
                    <Button size="sm" onClick={() => handleNewField(entityType)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Campo
                    </Button>
                </CardHeader>
                <CardContent>
                    {fields.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>Nenhum campo customizado criado</p>
                            <Button
                                variant="outline"
                                size="sm"
                                className="mt-4"
                                onClick={() => handleNewField(entityType)}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Criar Primeiro Campo
                            </Button>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {fields.map((field) => (
                                <div
                                    key={field.id}
                                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <h4 className="font-medium">{field.name}</h4>
                                            {field.required && (
                                                <Badge variant="destructive" className="text-xs">
                                                    Obrigatório
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 mt-1">
                                            <Badge variant="secondary" className="text-xs">
                                                {getFieldTypeLabel(field.fieldType)}
                                            </Badge>
                                            {field.fieldType === "select" && field.options && (
                                                <p className="text-xs text-muted-foreground">
                                                    Opções: {(() => {
                                                        try {
                                                            return JSON.parse(field.options).join(", ");
                                                        } catch {
                                                            return field.options;
                                                        }
                                                    })()}
                                                </p>
                                            )}
                                            {field.fieldType === "calculated" && (
                                                <Badge variant="outline" className="text-xs text-purple-600 border-purple-300">
                                                    {getFormulaDescription(field.formula) || "Fórmula configurada"}
                                                </Badge>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => handleEditField(field)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => handleDeleteField(field)}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        );
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
            {renderFieldsList(clientFields, "CLIENT")}
            {renderFieldsList(productFields, "PRODUCT")}

            <CustomFieldModal
                open={modalOpen}
                onClose={() => {
                    setModalOpen(false);
                    setSelectedField(null);
                }}
                onSuccess={fetchCustomFields}
                initialData={selectedField || undefined}
                entityType={selectedEntityType}
            />
            <ConfirmDialog />
        </div>
    );
}
