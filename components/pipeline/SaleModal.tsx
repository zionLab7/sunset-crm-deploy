"use client";

import { useState, useEffect } from "react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ShoppingCart, DollarSign } from "lucide-react";

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
    const [quantity, setQuantity] = useState("1");
    const [saleValue, setSaleValue] = useState("");
    const [notes, setNotes] = useState("");
    const [loading, setLoading] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (open) {
            fetchProducts();
            // Reset form
            setProductId("");
            setQuantity("1");
            setSaleValue("");
            setNotes("");
            setErrors({});
        }
    }, [open]);

    const fetchProducts = async () => {
        try {
            const res = await fetch("/api/products");
            const data = await res.json();
            setProducts(data.products || []);
        } catch (err) {
            console.error("Erro ao buscar produtos:", err);
        }
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
        const selectedProduct = products.find((p) => p.id === productId);
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
                    {/* Produto */}
                    <div>
                        <Label>Produto vendido *</Label>
                        <Select value={productId} onValueChange={setProductId}>
                            <SelectTrigger className={errors.productId ? "border-destructive" : ""}>
                                <SelectValue placeholder="Selecione o produto..." />
                            </SelectTrigger>
                            <SelectContent>
                                {products.map((p) => (
                                    <SelectItem key={p.id} value={p.id}>
                                        {p.name} — {p.stockCode}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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
