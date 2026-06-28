"use client";

import { useState, useEffect, useRef } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ShoppingCart, DollarSign, Search, X, Check, Plus, Trash2 } from "lucide-react";

interface Product {
    id: string;
    name: string;
    stockCode: string;
    costPrice?: number | null;
}

interface SaleItem {
    productId: string;
    productName: string;
    stockCode: string;
    quantity: string;
    unitPrice: string;
    basePrice: string;
    markup: string;
}

interface SaleModalProps {
    open: boolean;
    clientName: string;
    stageName: string;
    onConfirm: (saleData: {
        productId: string;
        productName: string;
        quantity: number;
        saleValue: number;
        notes: string;
        items?: Array<{
            productId: string;
            productName: string;
            quantity: number;
            unitPrice: number;
            markup: number;
        }>;
        saleType: "MONTHLY" | "SCHEDULED";
        deliveries?: Array<{
            dueDate: string;
            value: number;
            markup: number;
        }>;
    }) => void;
    onCancel: () => void;
}

const EMPTY_ITEM = (): SaleItem => ({
    productId: "",
    productName: "",
    stockCode: "",
    quantity: "1",
    unitPrice: "",
    basePrice: "",
    markup: "0",
});

export function SaleModal({
    open,
    clientName,
    stageName,
    onConfirm,
    onCancel,
}: SaleModalProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [items, setItems] = useState<SaleItem[]>([EMPTY_ITEM()]);
    const [activeSearchIndex, setActiveSearchIndex] = useState<number | null>(null);
    const [productSearch, setProductSearch] = useState("");
    const [notes, setNotes] = useState("");
    const [saleType, setSaleType] = useState<"MONTHLY" | "SCHEDULED">("MONTHLY");
    const [deliveries, setDeliveries] = useState<Array<{ id: string; dueDate: string; value: string; markup: string }>>([]);
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (open) {
            fetchProducts();
            setItems([EMPTY_ITEM()]);
            setActiveSearchIndex(null);
            setProductSearch("");
            setNotes("");
            setSaleType("MONTHLY");
            setDeliveries([]);
            setErrors([]);
        }
    }, [open]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setActiveSearchIndex(null);
                setProductSearch("");
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const fetchProducts = async () => {
        try {
            const res = await fetch("/api/products");
            const data = await res.json();
            setProducts(data.products || []);
        } catch (err) {
            console.error("Erro ao buscar produtos:", err);
        }
    };

    const filteredProducts = products.filter((p) => {
        const q = productSearch.toLowerCase();
        return p.name.toLowerCase().includes(q) || p.stockCode.toLowerCase().includes(q);
    });

    const handleSelectProduct = (index: number, p: Product) => {
        setItems((prev) => prev.map((item, i) => {
            if (i !== index) return item;
            const base = p.costPrice != null ? p.costPrice.toString() : "";
            return {
                ...item,
                productId: p.id,
                productName: p.name,
                stockCode: p.stockCode,
                basePrice: base,
                unitPrice: base,
                markup: "0",
            };
        }));
        setActiveSearchIndex(null);
        setProductSearch("");
    };

    const handleClearProduct = (index: number) => {
        setItems((prev) => prev.map((item, i) =>
            i === index ? { ...item, productId: "", productName: "", stockCode: "", basePrice: "", unitPrice: "", markup: "0" } : item
        ));
    };

    const handleUpdateItem = (index: number, field: keyof SaleItem, value: string) => {
        setItems((prev) => prev.map((item, i) => {
            if (i !== index) return item;
            const updated = { ...item, [field]: value };
            if (field === "basePrice" || field === "markup") {
                const base = parseFloat(updated.basePrice) || 0;
                const mk = parseFloat(updated.markup) || 0;
                if (base > 0) {
                    updated.unitPrice = (base * (1 + mk / 100)).toFixed(2);
                } else if (updated.basePrice) {
                    updated.unitPrice = updated.basePrice;
                }
            }
            return updated;
        }));
    };

    const handleAddItem = () => {
        setItems((prev) => [...prev, EMPTY_ITEM()]);
    };

    const handleRemoveItem = (index: number) => {
        setItems((prev) => prev.filter((_, i) => i !== index));
    };

    const totalValue = items.reduce((sum, item) => {
        const qty = parseFloat(item.quantity) || 0;
        const price = parseFloat(item.unitPrice) || 0;
        return sum + qty * price;
    }, 0);

    const handleSaleTypeChange = (type: "MONTHLY" | "SCHEDULED") => {
        setSaleType(type);
        if (type === "SCHEDULED" && deliveries.length === 0) {
            setDeliveries([
                { id: Math.random().toString(), dueDate: "", value: "", markup: "0" },
            ]);
        }
    };

    const handleAddDelivery = () => {
        setDeliveries((prev) => [
            ...prev,
            { id: Math.random().toString(), dueDate: "", value: "", markup: "0" },
        ]);
    };

    const handleUpdateDelivery = (id: string, field: "dueDate" | "value" | "markup", val: string) => {
        setDeliveries((prev) =>
            prev.map((d) => (d.id === id ? { ...d, [field]: val } : d))
        );
    };

    const handleRemoveDelivery = (id: string) => {
        setDeliveries((prev) => prev.filter((d) => d.id !== id));
    };

    const validate = () => {
        const errs: string[] = [];
        items.forEach((item, i) => {
            if (!item.productId) errs.push(`Item ${i + 1}: selecione um produto`);
            if (!item.quantity || parseFloat(item.quantity) < 1) errs.push(`Item ${i + 1}: quantidade inválida`);
            if (!item.unitPrice || parseFloat(item.unitPrice) <= 0) errs.push(`Item ${i + 1}: informe o valor unitário`);
        });

        if (saleType === "SCHEDULED") {
            if (deliveries.length === 0) {
                errs.push("Programação: adicione pelo menos uma entrega");
            }
            let sumDeliveries = 0;
            deliveries.forEach((d, i) => {
                if (!d.dueDate) errs.push(`Entrega ${i + 1}: informe a data`);
                const val = parseFloat(d.value) || 0;
                if (val <= 0) errs.push(`Entrega ${i + 1}: valor deve ser maior que zero`);
                sumDeliveries += val;
            });
            if (Math.abs(sumDeliveries - totalValue) > 0.01) {
                errs.push(`A soma das entregas (U$ ${sumDeliveries.toFixed(2)}) deve ser igual ao total da venda (U$ ${totalValue.toFixed(2)})`);
            }
        }

        setErrors(errs);
        return errs.length === 0;
    };

    const handleConfirm = () => {
        if (!validate()) return;
        setLoading(true);

        // Build a combined summary for notes — always include detail regardless of item count
        const itemsSummary = items
            .map((it) => `${it.productName} (x${it.quantity} × U$${parseFloat(it.unitPrice).toFixed(2)}, Markup: ${it.markup}%)`)
            .join(", ");

        const combinedNotes = [
            `Itens: ${itemsSummary}`,
            saleType === "SCHEDULED" ? `Tipo: Programação (${deliveries.length} entregas)` : "Tipo: Pedido do Mês",
            notes,
        ].filter(Boolean).join("\n");

        const firstItem = items[0];

        onConfirm({
            productId: firstItem.productId,
            productName: items.length === 1 ? firstItem.productName : `${items.length} produtos`,
            quantity: items.reduce((acc, it) => acc + parseInt(it.quantity), 0),
            saleValue: totalValue,
            notes: combinedNotes,
            items: items.map((it) => ({
                productId: it.productId,
                productName: it.productName,
                quantity: parseInt(it.quantity),
                unitPrice: parseFloat(it.unitPrice),
                markup: parseFloat(it.markup) || 0,
            })),
            saleType,
            deliveries: saleType === "SCHEDULED" ? deliveries.map((d) => ({
                dueDate: d.dueDate,
                value: parseFloat(d.value) || 0,
                markup: parseFloat(d.markup) || 0,
            })) : [],
        });
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={() => onCancel()}>
            <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ShoppingCart className="h-5 w-5 text-green-600" />
                        Registrar Venda
                    </DialogTitle>
                    <DialogDescription>
                        Registre os detalhes da venda para <strong>{clientName}</strong> ao mover para <strong>{stageName}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Lista de produtos */}
                    {items.map((item, index) => (
                        <div key={index} className="border rounded-lg p-3 space-y-3 relative">
                            {items.length > 1 && (
                                <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Produto {index + 1}</span>
                                    <button
                                        type="button"
                                        onClick={() => handleRemoveItem(index)}
                                        className="text-destructive hover:text-destructive/80"
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            )}

                            {/* Seletor de produto */}
                            <div>
                                <Label className="text-xs">Produto *</Label>
                                {item.productId ? (
                                    <div className="flex items-center justify-between mt-1 px-3 py-2 border rounded-md bg-green-50 border-green-300">
                                        <div className="flex items-center gap-2 text-sm">
                                            <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                                            <span className="font-medium">{item.productName}</span>
                                            <span className="text-muted-foreground text-xs">— {item.stockCode}</span>
                                        </div>
                                        <button type="button" onClick={() => handleClearProduct(index)}>
                                            <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                        </button>
                                    </div>
                                ) : (
                                    <div
                                        ref={activeSearchIndex === index ? searchRef : undefined}
                                        className="relative mt-1"
                                    >
                                        <div className="relative">
                                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                            <Input
                                                placeholder="Buscar por nome ou código..."
                                                value={activeSearchIndex === index ? productSearch : ""}
                                                onChange={(e) => { setProductSearch(e.target.value); }}
                                                onFocus={() => { setActiveSearchIndex(index); setProductSearch(""); }}
                                                className="pl-9 text-sm"
                                                autoComplete="off"
                                            />
                                        </div>
                                        {activeSearchIndex === index && (
                                            <div className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-900 border rounded-md shadow-lg max-h-44 overflow-y-auto">
                                                {filteredProducts.length === 0 ? (
                                                    <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum produto encontrado</div>
                                                ) : (
                                                    filteredProducts.map((p) => (
                                                        <button
                                                            key={p.id}
                                                            type="button"
                                                            className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2 border-b last:border-0"
                                                            onClick={() => handleSelectProduct(index, p)}
                                                        >
                                                            <span className="font-medium">{p.name}</span>
                                                            <span className="text-muted-foreground text-xs">— {p.stockCode}</span>
                                                        </button>
                                                    ))
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Quantidade, Markup e Preço Final */}
                            <div className="grid grid-cols-3 gap-3 mt-2">
                                <div>
                                    <Label className="text-xs">Quantidade *</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) => handleUpdateItem(index, "quantity", e.target.value)}
                                        className="mt-1 text-sm"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs">Markup negociado (%)</Label>
                                    <Input
                                        type="number"
                                        value={item.markup}
                                        onChange={(e) => handleUpdateItem(index, "markup", e.target.value)}
                                        placeholder="Ex: 25"
                                        className="mt-1 text-sm"
                                    />
                                </div>
                                <div>
                                    <Label className="text-xs font-semibold text-green-700">Valor Unitário Final (U$) *</Label>
                                    <div className="relative mt-1">
                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">U$</span>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={item.unitPrice}
                                            onChange={(e) => handleUpdateItem(index, "unitPrice", e.target.value)}
                                            placeholder="0.00"
                                            className="pl-8 text-sm font-semibold border-green-300 focus:border-green-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Subtotal do item */}
                            {item.productId && item.unitPrice && (
                                <p className="text-xs text-right text-muted-foreground">
                                    Subtotal: <span className="font-semibold text-foreground">
                                        U$ {((parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)).toFixed(2)}
                                    </span>
                                </p>
                            )}
                        </div>
                    ))}

                    {/* Botão adicionar produto */}
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full border-dashed"
                        onClick={handleAddItem}
                    >
                        <Plus className="h-4 w-4 mr-1.5" />
                        Adicionar outro produto
                    </Button>

                    {/* Total geral */}
                    <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border rounded-md">
                        <span className="text-sm font-medium flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            Total da venda
                        </span>
                        <span className="font-bold text-green-700">U$ {totalValue.toFixed(2)}</span>
                    </div>

                    {/* Classificação Estratégica */}
                    <div className="space-y-2">
                        <Label className="text-xs">Classificação da Venda</Label>
                        <div className="grid grid-cols-2 gap-2">
                            <Button
                                type="button"
                                variant={saleType === "MONTHLY" ? "default" : "outline"}
                                onClick={() => handleSaleTypeChange("MONTHLY")}
                                className="text-xs py-1 h-8"
                            >
                                Pedido para o Mês
                            </Button>
                            <Button
                                type="button"
                                variant={saleType === "SCHEDULED" ? "default" : "outline"}
                                onClick={() => handleSaleTypeChange("SCHEDULED")}
                                className="text-xs py-1 h-8"
                            >
                                Programação
                            </Button>
                        </div>
                    </div>

                    {/* Entregas Parceladas (se Programação) */}
                    {saleType === "SCHEDULED" && (
                        <div className="border border-blue-200 rounded-lg p-3 bg-blue-50/50 space-y-3">
                            <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-blue-800 uppercase tracking-wide">Cronograma de Entregas</span>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleAddDelivery}
                                    className="text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-100/50 h-7 px-2"
                                >
                                    <Plus className="h-3.5 w-3.5 mr-1" />
                                    Adicionar Entrega
                                </Button>
                            </div>

                            <div className="space-y-2 max-h-44 overflow-y-auto pr-1">
                                {deliveries.map((del, dIdx) => (
                                    <div key={del.id} className="flex gap-2 items-end bg-white p-2 border rounded-md relative group">
                                        <div className="flex-1">
                                            <Label className="text-[10px]">Data *</Label>
                                            <Input
                                                type="date"
                                                value={del.dueDate}
                                                onChange={(e) => handleUpdateDelivery(del.id, "dueDate", e.target.value)}
                                                className="h-8 text-xs mt-0.5"
                                            />
                                        </div>
                                        <div className="w-24">
                                            <Label className="text-[10px]">Valor (U$) *</Label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                value={del.value}
                                                onChange={(e) => handleUpdateDelivery(del.id, "value", e.target.value)}
                                                placeholder="0.00"
                                                className="h-8 text-xs mt-0.5"
                                            />
                                        </div>
                                        <div className="w-16">
                                            <Label className="text-[10px]">Markup (%)</Label>
                                            <Input
                                                type="number"
                                                value={del.markup}
                                                onChange={(e) => handleUpdateDelivery(del.id, "markup", e.target.value)}
                                                placeholder="0"
                                                className="h-8 text-xs mt-0.5"
                                            />
                                        </div>
                                        {deliveries.length > 1 && (
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveDelivery(del.id)}
                                                className="text-destructive hover:text-destructive/80 mb-2"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Markup global removido (individual por produto) */}

                    {/* Observações */}
                    <div>
                        <Label className="text-xs">Observações (opcional)</Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ex: cliente pediu entrega parcelada..."
                            rows={2}
                            className="mt-1 text-sm"
                        />
                    </div>

                    {/* Erros */}
                    {errors.length > 0 && (
                        <div className="space-y-1">
                            {errors.map((err, i) => (
                                <p key={i} className="text-xs text-destructive">{err}</p>
                            ))}
                        </div>
                    )}
                </div>

                <div className="flex gap-2 justify-end pt-2 border-t">
                    <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
                    <Button
                        type="button"
                        onClick={handleConfirm}
                        disabled={loading}
                        className="bg-green-600 hover:bg-green-700 text-white"
                    >
                        {loading ? "Registrando..." : "✅ Confirmar Venda"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
