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
import { ShoppingCart, DollarSign, Search, X, Check } from "lucide-react";

interface Product {
    id: string;
    name: string;
    stockCode: string;
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

export function SaleModal({
    open,
    clientName,
    stageName,
    onConfirm,
    onCancel,
}: SaleModalProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [productId, setProductId] = useState("");
    const [productSearch, setProductSearch] = useState("");
    const [showDropdown, setShowDropdown] = useState(false);
    const [quantity, setQuantity] = useState("1");
    const [saleValue, setSaleValue] = useState("");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (open) {
            fetchProducts();
            setProductId("");
            setProductSearch("");
            setShowDropdown(false);
            setQuantity("1");
            setSaleValue("");
            setNotes("");
            setErrors({});
        }
    }, [open]);

    // Close dropdown on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setShowDropdown(false);
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

    const selectedProduct = products.find((p) => p.id === productId);

    const handleSelectProduct = (p: Product) => {
        setProductId(p.id);
        setProductSearch("");
        setShowDropdown(false);
    };

    const handleClearProduct = () => {
        setProductId("");
        setProductSearch("");
    };

    const validate = () => {
        const newErrors: Record<string, string> = {};
        if (!productId) newErrors.productId = "Selecione um produto";
        if (!quantity || parseInt(quantity) < 1) newErrors.quantity = "Quantidade deve ser pelo menos 1";
        if (!saleValue || parseFloat(saleValue) <= 0) newErrors.saleValue = "Informe o valor da venda";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleConfirm = () => {
        if (!validate()) return;
        setLoading(true);
        onConfirm({
            productId,
            productName: selectedProduct?.name || "",
            quantity: parseInt(quantity),
            saleValue: parseFloat(saleValue),
            notes,
        });
        setLoading(false);
    };

    return (
        <Dialog open={open} onOpenChange={() => onCancel()}>
            <DialogContent className="max-w-md">
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
                    {/* Produto — busca com filtro */}
                    <div>
                        <Label>Produto vendido *</Label>

                        {selectedProduct ? (
                            /* Produto selecionado — badge verde com botão de remover */
                            <div className={`flex items-center justify-between mt-1 px-3 py-2 border rounded-md bg-green-50 ${errors.productId ? "border-destructive" : "border-green-300"}`}>
                                <div className="flex items-center gap-2 text-sm">
                                    <Check className="h-4 w-4 text-green-600 flex-shrink-0" />
                                    <span className="font-medium">{selectedProduct.name}</span>
                                    <span className="text-muted-foreground">— {selectedProduct.stockCode}</span>
                                </div>
                                <button type="button" onClick={handleClearProduct} className="text-muted-foreground hover:text-foreground ml-2 flex-shrink-0">
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ) : (
                            /* Campo de busca + dropdown */
                            <div ref={searchRef} className="relative mt-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar produto por nome ou código..."
                                        value={productSearch}
                                        onChange={(e) => { setProductSearch(e.target.value); setShowDropdown(true); }}
                                        onFocus={() => setShowDropdown(true)}
                                        className={`pl-9 ${errors.productId ? "border-destructive" : ""}`}
                                        autoComplete="off"
                                    />
                                </div>
                                {showDropdown && (
                                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-900 border rounded-md shadow-lg max-h-52 overflow-y-auto">
                                        {filteredProducts.length === 0 ? (
                                            <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum produto encontrado</div>
                                        ) : (
                                            filteredProducts.map((p) => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    className="w-full text-left px-3 py-2.5 text-sm hover:bg-muted transition-colors flex items-center gap-2 border-b last:border-0"
                                                    onClick={() => handleSelectProduct(p)}
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

                        {errors.productId && (
                            <p className="text-xs text-destructive mt-1">{errors.productId}</p>
                        )}
                    </div>

                    {/* Quantidade */}
                    <div>
                        <Label>Quantidade *</Label>
                        <Input
                            type="number"
                            min="1"
                            value={quantity}
                            onChange={(e) => setQuantity(e.target.value)}
                            placeholder="Ex: 10"
                            className={errors.quantity ? "border-destructive" : ""}
                        />
                        {errors.quantity && (
                            <p className="text-xs text-destructive mt-1">{errors.quantity}</p>
                        )}
                    </div>

                    {/* Valor da venda */}
                    <div>
                        <Label className="flex items-center gap-1">
                            <DollarSign className="h-3.5 w-3.5" />
                            Valor total da venda (U$) *
                        </Label>
                        <div className="relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">
                                U$
                            </span>
                            <Input
                                type="number"
                                step="0.01"
                                min="0"
                                value={saleValue}
                                onChange={(e) => setSaleValue(e.target.value)}
                                placeholder="0.00"
                                className={`pl-10 ${errors.saleValue ? "border-destructive" : ""}`}
                            />
                        </div>
                        {errors.saleValue && (
                            <p className="text-xs text-destructive mt-1">{errors.saleValue}</p>
                        )}
                    </div>

                    {/* Observações */}
                    <div>
                        <Label>Observações (opcional)</Label>
                        <Textarea
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ex: cliente pediu entrega parcelada..."
                            rows={2}
                        />
                    </div>
                </div>

                <div className="flex gap-2 justify-end pt-2 border-t">
                    <Button type="button" variant="outline" onClick={onCancel}>
                        Cancelar
                    </Button>
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
