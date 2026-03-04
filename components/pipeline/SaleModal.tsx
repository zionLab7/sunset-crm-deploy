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
}

interface SaleItem {
    productId: string;
    productName: string;
    stockCode: string;
    quantity: string;
    unitPrice: string;
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
    }) => void;
    onCancel: () => void;
}

const EMPTY_ITEM = (): SaleItem => ({
    productId: "",
    productName: "",
    stockCode: "",
    quantity: "1",
    unitPrice: "",
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
        setItems((prev) => prev.map((item, i) =>
            i === index
                ? { ...item, productId: p.id, productName: p.name, stockCode: p.stockCode }
                : item
        ));
        setActiveSearchIndex(null);
        setProductSearch("");
    };

    const handleClearProduct = (index: number) => {
        setItems((prev) => prev.map((item, i) =>
            i === index ? { ...item, productId: "", productName: "", stockCode: "" } : item
        ));
    };

    const handleUpdateItem = (index: number, field: keyof SaleItem, value: string) => {
        setItems((prev) => prev.map((item, i) =>
            i === index ? { ...item, [field]: value } : item
        ));
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

    const validate = () => {
        const errs: string[] = [];
        items.forEach((item, i) => {
            if (!item.productId) errs.push(`Item ${i + 1}: selecione um produto`);
            if (!item.quantity || parseFloat(item.quantity) < 1) errs.push(`Item ${i + 1}: quantidade inválida`);
            if (!item.unitPrice || parseFloat(item.unitPrice) <= 0) errs.push(`Item ${i + 1}: informe o valor unitário`);
        });
        setErrors(errs);
        return errs.length === 0;
    };

    const handleConfirm = () => {
        if (!validate()) return;
        setLoading(true);

        // Build a combined summary for notes
        const itemsSummary = items
            .map((it) => `${it.productName} (x${it.quantity} × U$${parseFloat(it.unitPrice).toFixed(2)})`)
            .join(", ");

        // Call onConfirm for each item (or combined if single)
        // Use first product as primary + append others in notes
        const firstItem = items[0];
        const combinedNotes = [
            items.length > 1 ? `Itens: ${itemsSummary}` : "",
            notes,
        ].filter(Boolean).join("\n");

        onConfirm({
            productId: firstItem.productId,
            productName: items.length === 1 ? firstItem.productName : `${items.length} produtos`,
            quantity: parseInt(firstItem.quantity),
            saleValue: totalValue,
            notes: combinedNotes,
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

                            {/* Quantidade e valor unitário */}
                            <div className="grid grid-cols-2 gap-2">
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
                                    <Label className="text-xs">Valor unitário (U$) *</Label>
                                    <div className="relative mt-1">
                                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">U$</span>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={item.unitPrice}
                                            onChange={(e) => handleUpdateItem(index, "unitPrice", e.target.value)}
                                            placeholder="0.00"
                                            className="pl-8 text-sm"
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
                    {items.length > 1 && (
                        <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border rounded-md">
                            <span className="text-sm font-medium flex items-center gap-1">
                                <DollarSign className="h-4 w-4" />
                                Total da venda
                            </span>
                            <span className="font-bold text-green-700">U$ {totalValue.toFixed(2)}</span>
                        </div>
                    )}

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
