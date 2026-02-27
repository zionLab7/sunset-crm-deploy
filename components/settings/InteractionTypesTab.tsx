"use client";

import { useState, useEffect } from "react";
import { Plus, Pencil, Trash2, Lock, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

interface InteractionType {
    id: string;
    name: string;
    emoji: string;
    isSaleType: boolean;
    isSystem: boolean;
    color: string;
    order: number;
}

const COLOR_OPTIONS = [
    { value: "blue", label: "Azul", bg: "bg-blue-500" },
    { value: "purple", label: "Roxo", bg: "bg-purple-500" },
    { value: "green", label: "Verde", bg: "bg-green-500" },
    { value: "amber", label: "Âmbar", bg: "bg-amber-500" },
    { value: "red", label: "Vermelho", bg: "bg-red-500" },
    { value: "indigo", label: "Índigo", bg: "bg-indigo-500" },
    { value: "gray", label: "Cinza", bg: "bg-gray-500" },
];

export function InteractionTypesTab() {
    const [types, setTypes] = useState<InteractionType[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [editingType, setEditingType] = useState<InteractionType | null>(null);
    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState<string | null>(null);

    // Form state
    const [name, setName] = useState("");
    const [emoji, setEmoji] = useState("📝");
    const [color, setColor] = useState("gray");
    const [isSaleType, setIsSaleType] = useState(false);

    useEffect(() => {
        fetchTypes();
    }, []);

    const fetchTypes = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/interaction-types");
            const data = await res.json();
            setTypes((data.types || []).sort((a: InteractionType, b: InteractionType) => a.order - b.order));
        } catch {
            toast({ variant: "destructive", title: "Erro ao carregar tipos" });
        } finally {
            setLoading(false);
        }
    };

    const openNew = () => {
        setEditingType(null);
        setName("");
        setEmoji("📝");
        setColor("gray");
        setIsSaleType(false);
        setModalOpen(true);
    };

    const openEdit = (type: InteractionType) => {
        setEditingType(type);
        setName(type.name);
        setEmoji(type.emoji);
        setColor(type.color);
        setIsSaleType(type.isSaleType);
        setModalOpen(true);
    };

    const handleSave = async () => {
        if (!name.trim()) {
            toast({ variant: "destructive", title: "Nome é obrigatório" });
            return;
        }
        setSaving(true);
        try {
            const payload = { name: name.trim(), emoji, color, isSaleType };
            let res;
            if (editingType) {
                res = await fetch(`/api/admin/interaction-types/${editingType.id}`, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload),
                });
            } else {
                res = await fetch("/api/admin/interaction-types", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ ...payload, order: types.length }),
                });
            }
            if (!res.ok) throw new Error((await res.json()).error);
            toast({ title: editingType ? "✅ Tipo atualizado!" : "✅ Tipo criado!" });
            setModalOpen(false);
            fetchTypes();
        } catch (err: any) {
            toast({ variant: "destructive", title: "Erro ao salvar", description: err.message });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (type: InteractionType) => {
        if (type.isSystem) {
            toast({ variant: "destructive", title: "Tipo do sistema não pode ser excluído" });
            return;
        }
        if (!confirm(`Excluir "${type.name}"? Esta ação não pode ser desfeita.`)) return;
        setDeleting(type.id);
        try {
            const res = await fetch(`/api/admin/interaction-types/${type.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error((await res.json()).error);
            toast({ title: "✅ Tipo excluído!" });
            fetchTypes();
        } catch (err: any) {
            toast({ variant: "destructive", title: "Erro ao excluir", description: err.message });
        } finally {
            setDeleting(null);
        }
    };

    const colorBg: Record<string, string> = {
        blue: "bg-blue-100 text-blue-700 border-blue-300",
        purple: "bg-purple-100 text-purple-700 border-purple-300",
        green: "bg-green-100 text-green-700 border-green-300",
        amber: "bg-amber-100 text-amber-700 border-amber-300",
        red: "bg-red-100 text-red-700 border-red-300",
        indigo: "bg-indigo-100 text-indigo-700 border-indigo-300",
        gray: "bg-gray-100 text-gray-700 border-gray-300",
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold">Tipos de Interação</h3>
                    <p className="text-sm text-muted-foreground">
                        Configure os tipos de interação disponíveis. Tipos de "Venda" abrem automaticamente o formulário de registro de venda.
                    </p>
                </div>
                <Button onClick={openNew} size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Novo Tipo
                </Button>
            </div>

            {loading ? (
                <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                </div>
            ) : (
                <div className="space-y-2">
                    {types.map((type) => (
                        <div
                            key={type.id}
                            className={`flex items-center gap-3 p-3 rounded-lg border-2 ${colorBg[type.color] || colorBg.gray}`}
                        >
                            <span className="text-xl w-8 text-center">{type.emoji}</span>
                            <div className="flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium">{type.name}</span>
                                    {type.isSaleType && (
                                        <Badge className="bg-amber-500 text-white text-[10px] h-4 px-1.5">
                                            <ShoppingCart className="h-2.5 w-2.5 mr-1" />
                                            VENDA
                                        </Badge>
                                    )}
                                    {type.isSystem && (
                                        <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                                            <Lock className="h-2.5 w-2.5 mr-1" />
                                            Sistema
                                        </Badge>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-1">
                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => openEdit(type)}>
                                    <Pencil className="h-3.5 w-3.5" />
                                </Button>
                                {!type.isSystem && (
                                    <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                                        onClick={() => handleDelete(type)}
                                        disabled={deleting === type.id}
                                    >
                                        <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                )}
                            </div>
                        </div>
                    ))}
                    {types.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-8">
                            Nenhum tipo criado ainda.
                        </p>
                    )}
                </div>
            )}

            {/* Add/Edit Modal */}
            <Dialog open={modalOpen} onOpenChange={(o) => !saving && setModalOpen(o)}>
                <DialogContent className="max-w-sm">
                    <DialogHeader>
                        <DialogTitle>{editingType ? "Editar Tipo" : "Novo Tipo de Interação"}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="grid grid-cols-[64px_1fr] gap-3 items-end">
                            <div>
                                <Label>Emoji</Label>
                                <Input
                                    value={emoji}
                                    onChange={(e) => setEmoji(e.target.value)}
                                    className="text-center text-lg mt-1"
                                    maxLength={2}
                                />
                            </div>
                            <div>
                                <Label>Nome *</Label>
                                <Input
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                    placeholder="Ex: Reunião"
                                    className="mt-1"
                                />
                            </div>
                        </div>

                        <div>
                            <Label>Cor</Label>
                            <div className="flex gap-2 mt-2 flex-wrap">
                                {COLOR_OPTIONS.map((c) => (
                                    <button
                                        key={c.value}
                                        type="button"
                                        title={c.label}
                                        className={`w-7 h-7 rounded-full ${c.bg} ring-2 ring-offset-2 transition-all ${color === c.value ? "ring-primary scale-110" : "ring-transparent"}`}
                                        onClick={() => setColor(c.value)}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-amber-50 border border-amber-200 rounded-lg">
                            <div>
                                <p className="text-sm font-medium">Tipo de Venda</p>
                                <p className="text-xs text-muted-foreground">
                                    Abre o formulário de registro de venda
                                </p>
                            </div>
                            <Switch checked={isSaleType} onCheckedChange={setIsSaleType} />
                        </div>

                        <div className="flex gap-2 pt-2">
                            <Button onClick={handleSave} disabled={saving} className="flex-1">
                                {saving ? "Salvando..." : editingType ? "Atualizar" : "Criar"}
                            </Button>
                            <Button variant="outline" onClick={() => setModalOpen(false)} disabled={saving}>
                                Cancelar
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
