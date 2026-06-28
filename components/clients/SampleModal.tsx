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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FlaskConical, Search, X, Check } from "lucide-react";

interface Product {
    id: string;
    name: string;
    stockCode: string;
}

export interface SampleData {
    productId: string;
    productName: string;
    quantity: number;
    unit: "kg" | "g";
    batchNumber: string;
    manufacturer: string;
}

interface SampleModalProps {
    open: boolean;
    clientName: string;
    onConfirm: (sampleData: SampleData) => void;
    onCancel: () => void;
}

export function SampleModal({
    open,
    clientName,
    onConfirm,
    onCancel,
}: SampleModalProps) {
    const [products, setProducts] = useState<Product[]>([]);
    const [productId, setProductId] = useState("");
    const [productName, setProductName] = useState("");
    const [stockCode, setStockCode] = useState("");
    const [quantity, setQuantity] = useState("1");
    const [unit, setUnit] = useState<"kg" | "g">("kg");
    const [batchNumber, setBatchNumber] = useState("");
    const [manufacturer, setManufacturer] = useState("");
    const [productSearch, setProductSearch] = useState("");
    const [searchActive, setSearchActive] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const searchRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (open) {
            fetchProducts();
            setProductId("");
            setProductName("");
            setStockCode("");
            setQuantity("1");
            setUnit("kg");
            setBatchNumber("");
            setManufacturer("");
            setProductSearch("");
            setSearchActive(false);
            setErrors([]);
        }
    }, [open]);

    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
                setSearchActive(false);
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

    const handleSelectProduct = (p: Product) => {
        setProductId(p.id);
        setProductName(p.name);
        setStockCode(p.stockCode);
        setSearchActive(false);
        setProductSearch("");
    };

    const handleClearProduct = () => {
        setProductId("");
        setProductName("");
        setStockCode("");
    };

    const validate = () => {
        const errs: string[] = [];
        if (!productId) errs.push("Selecione um produto");
        const qtyVal = parseFloat(quantity);
        if (!quantity || isNaN(qtyVal) || qtyVal <= 0) errs.push("Quantidade deve ser maior que zero");
        if (!batchNumber.trim()) errs.push("Lote de amostra é obrigatório");
        if (!manufacturer.trim()) errs.push("Fabricante é obrigatório");

        setErrors(errs);
        return errs.length === 0;
    };

    const handleConfirm = () => {
        if (!validate()) return;

        onConfirm({
            productId,
            productName,
            quantity: parseFloat(quantity),
            unit,
            batchNumber: batchNumber.trim(),
            manufacturer: manufacturer.trim(),
        });
    };

    return (
        <Dialog open={open} onOpenChange={() => onCancel()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-indigo-700">
                        <FlaskConical className="h-5 w-5" />
                        Registrar Envio de Amostra
                    </DialogTitle>
                    <DialogDescription>
                        Preencha as informações detalhadas da amostra enviada para <strong>{clientName}</strong>.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Seletor de produto */}
                    <div>
                        <Label className="text-xs">Produto *</Label>
                        {productId ? (
                            <div className="flex items-center justify-between mt-1 px-3 py-2 border rounded-md bg-indigo-50 border-indigo-200">
                                <div className="flex items-center gap-2 text-sm">
                                    <Check className="h-4 w-4 text-indigo-600 flex-shrink-0" />
                                    <span className="font-medium text-indigo-900">{productName}</span>
                                    <span className="text-indigo-500 text-xs">— {stockCode}</span>
                                </div>
                                <button type="button" onClick={handleClearProduct}>
                                    <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                                </button>
                            </div>
                        ) : (
                            <div ref={searchRef} className="relative mt-1">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Buscar produto por nome ou código..."
                                        value={productSearch}
                                        onChange={(e) => setProductSearch(e.target.value)}
                                        onFocus={() => { setSearchActive(true); setProductSearch(""); }}
                                        className="pl-9 text-sm"
                                        autoComplete="off"
                                    />
                                </div>
                                {searchActive && (
                                    <div className="absolute z-50 w-full mt-1 bg-white dark:bg-zinc-900 border rounded-md shadow-lg max-h-44 overflow-y-auto">
                                        {filteredProducts.length === 0 ? (
                                            <div className="px-3 py-2 text-sm text-muted-foreground">Nenhum produto encontrado</div>
                                        ) : (
                                            filteredProducts.map((p) => (
                                                <button
                                                    key={p.id}
                                                    type="button"
                                                    className="w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors flex items-center gap-2 border-b last:border-0"
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
                    </div>

                    {/* Quantidade e Unidade */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <Label className="text-xs">Quantidade *</Label>
                            <Input
                                type="number"
                                step="any"
                                min="0.001"
                                value={quantity}
                                onChange={(e) => setQuantity(e.target.value)}
                                className="mt-1 text-sm"
                            />
                        </div>
                        <div>
                            <Label className="text-xs">Unidade de Medida *</Label>
                            <Select value={unit} onValueChange={(val: "kg" | "g") => setUnit(val)}>
                                <SelectTrigger className="mt-1 text-sm">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="kg">kg (Quilograma)</SelectItem>
                                    <SelectItem value="g">g (Grama)</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Lote */}
                    <div>
                        <Label className="text-xs">Lote de Amostra *</Label>
                        <Input
                            placeholder="Ex: L-98234"
                            value={batchNumber}
                            onChange={(e) => setBatchNumber(e.target.value)}
                            className="mt-1 text-sm"
                        />
                    </div>

                    {/* Fabricante */}
                    <div>
                        <Label className="text-xs">Fabricante *</Label>
                        <Input
                            placeholder="Ex: Cargill, Basf..."
                            value={manufacturer}
                            onChange={(e) => setManufacturer(e.target.value)}
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
                        className="bg-indigo-600 hover:bg-indigo-700 text-white"
                    >
                        Salvar Detalhes
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
