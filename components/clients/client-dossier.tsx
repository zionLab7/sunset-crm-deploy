"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { InteractionModal } from "@/components/clients/interaction-modal";
import { TaskModal } from "@/components/calendar/task-modal";
import {
    MessageCircle,
    Mail,
    Phone,
    Edit,
    Plus,
    PhoneCall,
    Building,
    Send,
    FileText,
    ArrowRightLeft,
    Package,
    Copy,
    Check,
    Archive,
    ArchiveRestore,
    CalendarPlus,
    ExternalLink,
    ClipboardList,
} from "lucide-react";
import { formatCurrency, formatCNPJ, formatPhone, getWhatsAppLink, getRelativeTime } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

// Botão de copiar reutilizável
function CopyButton({ text, label }: { text: string; label?: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(text);
            setCopied(true);
            toast({ title: `✅ ${label || "Texto"} copiado!` });
            setTimeout(() => setCopied(false), 2000);
        } catch {
            toast({ variant: "destructive", title: "Erro ao copiar" });
        }
    };

    return (
        <Button
            size="sm"
            variant="ghost"
            onClick={handleCopy}
            className="h-7 w-7 p-0"
            title={`Copiar ${label || ""}`}
        >
            {copied ? (
                <Check className="h-3.5 w-3.5 text-green-600" />
            ) : (
                <Copy className="h-3.5 w-3.5 text-muted-foreground" />
            )}
        </Button>
    );
}

interface ClientDossierProps {
    client: {
        id: string;
        name: string;
        cnpj: string | null;
        phone: string | null;
        email: string | null;
        potentialValue: number;
        archivedFromPipeline?: boolean;
        assignedUserId: string;
        currentStage: { id: string; name: string; color: string };
        assignedUser: { id: string; name: string; email: string };
        interactions: Array<{
            id: string;
            type: string;
            description: string;
            metadata?: string | null;
            createdAt: string | Date;
            user: { id: string; name: string };
        }>;
        tasks: Array<{
            id: string;
            title: string;
            status: string;
            dueDate: string | Date;
            user: { id: string; name: string };
        }>;
        products: Array<{
            id: string;
            product: { id: string; name: string; stockCode: string };
        }>;
        customFieldValues?: Array<{
            id: string;
            value: string;
            customField: { id: string; name: string; fieldType: string };
        }>;
    };
}

const INTERACTION_ICONS: Record<string, { icon: any; label: string; color: string }> = {
    // Legacy uppercase keys
    CALL: { icon: PhoneCall, label: "Ligação", color: "text-blue-600" },
    VISIT: { icon: Building, label: "Visita", color: "text-purple-600" },
    EMAIL: { icon: Send, label: "Email", color: "text-green-600" },
    NOTE: { icon: FileText, label: "Nota", color: "text-gray-600" },
    STATUS_CHANGE: { icon: ArrowRightLeft, label: "Alteração de Status", color: "text-orange-600" },
    // Portuguese names from custom interaction types
    "Ligação": { icon: PhoneCall, label: "Ligação", color: "text-blue-600" },
    "Visita": { icon: Building, label: "Visita", color: "text-purple-600" },
    "Email": { icon: Send, label: "Email", color: "text-green-600" },
    "Nota": { icon: FileText, label: "Nota", color: "text-gray-600" },
    "Venda": { icon: Package, label: "Venda", color: "text-amber-600" },
};

function getInteractionConfig(type: string) {
    return INTERACTION_ICONS[type] || { icon: FileText, label: type, color: "text-gray-600" };
}

export function ClientDossier({ client }: ClientDossierProps) {
    const router = useRouter();
    const { data: session } = useSession();
    const currentUserId = (session?.user as any)?.id;
    const userRole = (session?.user as any)?.role;
    const isGestor = userRole === "GESTOR";
    // Contact buttons visible if gestor OR if this vendedor is the assigned user
    const canSeeContactButtons = isGestor || client.assignedUserId === currentUserId;

    const [interactionModalOpen, setInteractionModalOpen] = useState(false);
    const [taskModalOpen, setTaskModalOpen] = useState(false);
    const [pabxUrl, setPabxUrl] = useState<string | null>(null);
    const [emailUrl, setEmailUrl] = useState<string | null>(null);
    const [isArchived, setIsArchived] = useState(client.archivedFromPipeline || false);
    const [archiving, setArchiving] = useState(false);
    const [interactionFilter, setInteractionFilter] = useState<string>("all");
    const [editingInteractionId, setEditingInteractionId] = useState<string | null>(null);
    const [editingDescription, setEditingDescription] = useState("");
    const [editingSaleValue, setEditingSaleValue] = useState("");
    const [editingProductName, setEditingProductName] = useState("");
    const [editingQuantity, setEditingQuantity] = useState("");
    const [editingSaleNotes, setEditingSaleNotes] = useState("");
    const [savingEdit, setSavingEdit] = useState(false);
    // Clients and users for task modal
    const [taskClients, setTaskClients] = useState<Array<{ id: string; name: string }>>([]);
    const [taskUsers, setTaskUsers] = useState<Array<{ id: string; name: string }>>([]);

    useEffect(() => {
        Promise.all([
            fetch("/api/admin/system-config?key=pabxUrlTemplate").then((r) => r.json()),
            fetch("/api/admin/system-config?key=emailUrlTemplate").then((r) => r.json()),
            fetch("/api/clients").then((r) => r.json()),
            fetch("/api/users").then((r) => r.json()),
        ]).then(([pabx, email, clientsData, usersData]) => {
            if (pabx.config?.value) setPabxUrl(pabx.config.value);
            if (email.config?.value) setEmailUrl(email.config.value);
            setTaskClients(clientsData.clients?.map((c: any) => ({ id: c.id, name: c.name })) || []);
            setTaskUsers(usersData.users?.map((u: any) => ({ id: u.id, name: u.name })) || []);
        }).catch(() => { });
    }, []);

    const handleRequestTask = () => {
        setTaskModalOpen(true);
    };

    const handleToggleArchive = async () => {
        setArchiving(true);
        try {
            const res = await fetch(`/api/clients/${client.id}/archive`, { method: "PATCH" });
            if (!res.ok) throw new Error();
            const data = await res.json();
            setIsArchived(data.archived);
            toast({
                title: data.archived ? "📦 Cliente arquivado" : "✅ Cliente restaurado",
                description: data.archived
                    ? "Removido do pipeline de vendas"
                    : "Restaurado ao pipeline de vendas",
            });
            router.refresh();
        } catch {
            toast({ variant: "destructive", title: "Erro ao processar" });
        } finally {
            setArchiving(false);
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 min-h-screen">
            {/* Sidebar Esquerda - Dados Cadastrais */}
            <div className="md:col-span-1">
                <Card className="sticky top-6">
                    <CardContent className="p-6">
                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h2 className="text-2xl font-bold">{client.name}</h2>
                                {client.cnpj && (
                                    <div className="flex items-center gap-1 mt-1">
                                        <p className="text-sm text-muted-foreground">
                                            {formatCNPJ(client.cnpj)}
                                        </p>
                                        <CopyButton text={client.cnpj} label="CNPJ" />
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-1">
                                <Button
                                    size="sm"
                                    variant={isArchived ? "default" : "outline"}
                                    onClick={handleToggleArchive}
                                    disabled={archiving}
                                    title={isArchived ? "Restaurar ao pipeline" : "Arquivar do pipeline"}
                                    className={isArchived ? "bg-orange-500 hover:bg-orange-600" : ""}
                                >
                                    {isArchived ? (
                                        <ArchiveRestore className="h-4 w-4" />
                                    ) : (
                                        <Archive className="h-4 w-4" />
                                    )}
                                </Button>
                                <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => router.push(`/clients/${client.id}/edit`)}
                                >
                                    <Edit className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        {isArchived && (
                            <div className="bg-orange-50 border border-orange-200 rounded-lg px-3 py-2 mb-2">
                                <p className="text-xs text-orange-700 font-medium flex items-center gap-1">
                                    <Archive className="h-3 w-3" />
                                    Arquivado do pipeline
                                </p>
                            </div>
                        )}

                        <Separator className="my-4" />

                        {/* Estágio Atual */}
                        <div className="mb-4">
                            <p className="text-sm font-medium text-muted-foreground mb-2">
                                Estágio Atual
                            </p>
                            <Badge
                                style={{
                                    backgroundColor: client.currentStage.color + "20",
                                    color: client.currentStage.color,
                                    borderColor: client.currentStage.color,
                                }}
                                className="border text-sm px-3 py-1"
                            >
                                {client.currentStage.name}
                            </Badge>
                        </div>

                        {/* Valor Potencial */}
                        <div className="mb-4">
                            <p className="text-sm font-medium text-muted-foreground mb-2">
                                Valor Potencial
                            </p>
                            <p className="text-2xl font-bold text-green-600">
                            </p>
                        </div>

                        <Separator className="my-4" />

                        {/* Produtos que Compra */}
                        {client.products && client.products.length > 0 && (
                            <div className="mb-4">
                                <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                                    <Package className="h-4 w-4" />
                                    Produtos que Compra
                                </p>
                                <div className="flex flex-wrap gap-2">
                                    {client.products.map((cp) => (
                                        <Badge variant="outline" key={cp.id} className="text-xs">
                                            {cp.product.name}
                                        </Badge>
                                    ))}
                                </div>
                                <Separator className="my-4" />
                            </div>
                        )}

                        {/* Custom Field Values */}
                        {client.customFieldValues && client.customFieldValues.length > 0 && (
                            <div className="mb-4">
                                <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                                    <ClipboardList className="h-4 w-4" />
                                    Informações Adicionais
                                </p>
                                <div className="space-y-1.5">
                                    {client.customFieldValues.map((cfv) => (
                                        <div key={cfv.id} className="flex items-start justify-between gap-2">
                                            <span className="text-xs text-muted-foreground whitespace-nowrap">{cfv.customField.name}:</span>
                                            <span className="text-xs font-medium text-right break-words">{cfv.value}</span>
                                        </div>
                                    ))}
                                </div>
                                <Separator className="my-4" />
                            </div>
                        )}

                        {/* Contatos */}
                        <div className="space-y-3">
                            <p className="text-sm font-medium text-muted-foreground">Contatos</p>

                            {client.phone && (
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{formatPhone(client.phone)}</span>
                                    <div className="ml-auto flex items-center gap-0.5">
                                        <CopyButton text={client.phone} label="Telefone" />
                                        {canSeeContactButtons && pabxUrl && (
                                            <a
                                                href={pabxUrl.replace("{phone}", client.phone.replace(/\D/g, ""))}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Ligar via PABX">
                                                    <PhoneCall className="h-4 w-4 text-blue-600" />
                                                </Button>
                                            </a>
                                        )}
                                        {canSeeContactButtons && (
                                            <a
                                                href={getWhatsAppLink(client.phone)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="WhatsApp">
                                                    <MessageCircle className="h-4 w-4 text-green-600" />
                                                </Button>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}

                            {client.email && (
                                <div className="flex items-center gap-2">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <a
                                        href={`mailto:${client.email}`}
                                        className="text-sm hover:underline truncate"
                                    >
                                        {client.email}
                                    </a>
                                    <div className="ml-auto flex items-center gap-0.5">
                                        <CopyButton text={client.email} label="Email" />
                                        {canSeeContactButtons && emailUrl && (
                                            <a
                                                href={emailUrl.replace("{email}", encodeURIComponent(client.email))}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="Abrir email">
                                                    <ExternalLink className="h-4 w-4 text-indigo-600" />
                                                </Button>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <Separator className="my-4" />

                        {/* Vendedor Responsável */}
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-2">
                                Vendedor Responsável
                            </p>
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 bg-gradient-sunset rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                    {client.assignedUser.name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-sm font-medium">{client.assignedUser.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {client.assignedUser.email}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Campos Adicionais */}
                        {client.customFieldValues && client.customFieldValues.length > 0 && (
                            <>
                                <Separator className="my-4" />
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-2">
                                        Campos Adicionais
                                    </p>
                                    <div className="space-y-2">
                                        {client.customFieldValues.map((cfv) => (
                                            <div key={cfv.id} className="text-sm">
                                                <span className="font-medium">{cfv.customField.name}:</span>{" "}
                                                {cfv.customField.fieldType === "link" && cfv.value ? (
                                                    <a
                                                        href={cfv.value.startsWith("http") ? cfv.value : `https://${cfv.value}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-blue-600 hover:underline inline-flex items-center gap-1"
                                                    >
                                                        {cfv.value}
                                                        <ExternalLink className="h-3 w-3" />
                                                    </a>
                                                ) : (
                                                    <span className="text-muted-foreground">{cfv.value}</span>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>
            </div>

            {/* Conteúdo Principal - Timeline */}
            <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold">Timeline de Atividades</h3>
                    <div className="flex gap-2">
                        <select
                            value={interactionFilter}
                            onChange={(e) => setInteractionFilter(e.target.value)}
                            className="text-sm border rounded-md px-2 py-1.5 bg-background"
                        >
                            <option value="all">Todos os tipos</option>
                            {Object.entries(INTERACTION_ICONS).map(([key, val]) => (
                                <option key={key} value={key}>{val.label}</option>
                            ))}
                        </select>
                        <Button
                            variant="outline"
                            onClick={() => setTaskModalOpen(true)}
                            size="sm"
                        >
                            <CalendarPlus className="h-4 w-4 mr-2" />
                            Nova Tarefa
                        </Button>
                        <Button onClick={() => setInteractionModalOpen(true)} size="sm">
                            <Plus className="h-4 w-4 mr-2" />
                            Nova Interação
                        </Button>
                    </div>
                </div>

                {/* Tarefas Agendadas do Cliente */}
                {client.tasks.filter(t => t.status !== "CONCLUIDA").length > 0 && (
                    <div className="mb-6">
                        <h4 className="text-sm font-semibold text-muted-foreground mb-2 uppercase tracking-wide">Tarefas Agendadas</h4>
                        <div className="space-y-2">
                            {client.tasks.filter(t => t.status !== "CONCLUIDA").map(task => (
                                <div key={task.id} className={`flex items-center gap-3 px-3 py-2 rounded-lg border ${task.status === "ATRASADA" ? "bg-red-50 border-red-200" : "bg-blue-50 border-blue-200"
                                    }`}>
                                    <CalendarPlus className={`h-4 w-4 flex-shrink-0 ${task.status === "ATRASADA" ? "text-red-500" : "text-blue-500"}`} />
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium truncate">{task.title}</p>
                                        <p className="text-xs text-muted-foreground">
                                            {new Date(task.dueDate).toLocaleDateString("pt-BR")} — {task.user.name}
                                        </p>
                                    </div>
                                    <Badge variant={task.status === "ATRASADA" ? "destructive" : "default"} className="text-xs flex-shrink-0">
                                        {task.status === "ATRASADA" ? "Atrasada" : "Pendente"}
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Timeline */}
                <div className="space-y-4">
                    {client.interactions.filter(i => interactionFilter === "all" || i.type === interactionFilter).length === 0 ? (
                        <Card>
                            <CardContent className="p-12 text-center">
                                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                                <p className="text-muted-foreground">
                                    Nenhuma interação registrada ainda.
                                </p>
                                <Button
                                    onClick={() => setInteractionModalOpen(true)}
                                    className="mt-4"
                                    variant="outline"
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Registrar Primeira Interação
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        client.interactions.filter(i => interactionFilter === "all" || i.type === interactionFilter).map((interaction) => {
                            const config = getInteractionConfig(interaction.type);
                            const Icon = config.icon;

                            // Parse sale metadata if present
                            let saleMeta: { 
                                saleValue?: number; 
                                productName?: string; 
                                quantity?: number; 
                                notes?: string;
                                saleType?: "MONTHLY" | "SCHEDULED";
                                deliveries?: Array<{ dueDate: string; value: number; markup: number }>;
                            } | null = null;
                            if (interaction.metadata) {
                                try {
                                    const parsed = JSON.parse(interaction.metadata);
                                    if (parsed.saleValue != null && parseFloat(String(parsed.saleValue)) > 0) {
                                        saleMeta = parsed;
                                    }
                                } catch { /* ignore */ }
                            }

                            return (
                                <Card key={interaction.id} className="hover:shadow-md transition-shadow">
                                    <CardContent className="p-4">
                                        <div className="flex gap-3">
                                            {/* Avatar do Vendedor */}
                                            <div className="w-10 h-10 bg-gradient-sunset rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
                                                {interaction.user.name.charAt(0).toUpperCase()}
                                            </div>

                                            {/* Conteúdo */}
                                            <div className="flex-1">
                                                <div className="flex items-start justify-between mb-2">
                                                    <div>
                                                        <p className="font-medium">{interaction.user.name}</p>
                                                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                            <Icon className={`h-4 w-4 ${config.color}`} />
                                                            <span>{config.label}</span>
                                                            <span>•</span>
                                                            <span>{getRelativeTime(new Date(interaction.createdAt))}</span>
                                                        </div>
                                                    </div>
                                                    {/* Edit button — Gestor can edit all, vendedor can edit own */}
                                                    {(isGestor || interaction.user.id === currentUserId) && editingInteractionId !== interaction.id && (
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            className="h-7 w-7 flex-shrink-0"
                                                            onClick={() => {
                                                                setEditingInteractionId(interaction.id);
                                                                setEditingDescription(interaction.description);
                                                                if (saleMeta) {
                                                                    setEditingSaleValue(String(saleMeta.saleValue || ""));
                                                                    setEditingProductName(saleMeta.productName || "");
                                                                    setEditingQuantity(String(saleMeta.quantity || ""));
                                                                    setEditingSaleNotes(saleMeta.notes || "");
                                                                } else {
                                                                    setEditingSaleValue("");
                                                                    setEditingProductName("");
                                                                    setEditingQuantity("");
                                                                    setEditingSaleNotes("");
                                                                }
                                                            }}
                                                        >
                                                            <Edit className="h-3.5 w-3.5" />
                                                        </Button>
                                                    )}
                                                </div>
                                                {editingInteractionId === interaction.id ? (
                                                    <div className="space-y-3">
                                                        <div>
                                                            <label className="text-xs font-semibold text-muted-foreground">Descrição Geral</label>
                                                            <textarea
                                                                value={editingDescription}
                                                                onChange={(e) => setEditingDescription(e.target.value)}
                                                                className="w-full border rounded-md p-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary mt-1"
                                                                rows={3}
                                                            />
                                                        </div>

                                                        {interaction.metadata && (
                                                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-3">
                                                                <p className="text-xs font-bold text-amber-800">Editar Detalhes da Venda</p>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <div>
                                                                        <label className="text-xs font-medium text-amber-900">Nome do Produto</label>
                                                                        <input
                                                                            type="text"
                                                                            value={editingProductName}
                                                                            onChange={(e) => setEditingProductName(e.target.value)}
                                                                            className="w-full border rounded-md p-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary mt-1 bg-white"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-xs font-medium text-amber-900">Quantidade</label>
                                                                        <input
                                                                            type="number"
                                                                            value={editingQuantity}
                                                                            onChange={(e) => setEditingQuantity(e.target.value)}
                                                                            className="w-full border rounded-md p-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary mt-1 bg-white"
                                                                        />
                                                                    </div>
                                                                </div>
                                                                <div className="grid grid-cols-2 gap-2">
                                                                    <div>
                                                                        <label className="text-xs font-medium text-amber-900">Valor da Venda (U$)</label>
                                                                        <input
                                                                            type="number"
                                                                            step="0.01"
                                                                            value={editingSaleValue}
                                                                            onChange={(e) => setEditingSaleValue(e.target.value)}
                                                                            className="w-full border rounded-md p-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary mt-1 bg-white"
                                                                        />
                                                                    </div>
                                                                    <div>
                                                                        <label className="text-xs font-medium text-amber-900">Observações da Venda</label>
                                                                        <input
                                                                            type="text"
                                                                            value={editingSaleNotes}
                                                                            onChange={(e) => setEditingSaleNotes(e.target.value)}
                                                                            className="w-full border rounded-md p-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary mt-1 bg-white"
                                                                        />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        )}

                                                        <div className="flex gap-2">
                                                            <Button
                                                                size="sm"
                                                                disabled={savingEdit}
                                                                onClick={async () => {
                                                                    setSavingEdit(true);
                                                                    try {
                                                                        let newMetadata = undefined;
                                                                        if (interaction.metadata) {
                                                                            try {
                                                                                const parsed = JSON.parse(interaction.metadata);
                                                                                newMetadata = JSON.stringify({
                                                                                    ...parsed,
                                                                                    saleValue: parseFloat(editingSaleValue) || 0,
                                                                                    productName: editingProductName,
                                                                                    quantity: parseInt(editingQuantity) || 1,
                                                                                    notes: editingSaleNotes,
                                                                                });
                                                                            } catch {
                                                                                newMetadata = interaction.metadata;
                                                                            }
                                                                        }

                                                                        const res = await fetch(`/api/clients/${client.id}/interactions/${interaction.id}`, {
                                                                            method: "PATCH",
                                                                            headers: { "Content-Type": "application/json" },
                                                                            body: JSON.stringify({
                                                                                description: editingDescription,
                                                                                ...(newMetadata !== undefined ? { metadata: newMetadata } : {}),
                                                                            }),
                                                                        });
                                                                        if (!res.ok) throw new Error();
                                                                        toast({ title: "✅ Interação atualizada" });
                                                                        setEditingInteractionId(null);
                                                                        router.refresh();
                                                                    } catch {
                                                                        toast({ variant: "destructive", title: "Erro ao salvar" });
                                                                    } finally {
                                                                        setSavingEdit(false);
                                                                    }
                                                                }}
                                                            >
                                                                Salvar
                                                            </Button>
                                                            <Button
                                                                size="sm"
                                                                variant="outline"
                                                                onClick={() => setEditingInteractionId(null)}
                                                            >
                                                                Cancelar
                                                            </Button>
                                                        </div>
                                                    </div>
                                                ) : (
                                                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                                    {interaction.description.split(/(https?:\/\/[^\s]+)/g).map((part, idx) =>
                                                        /^https?:\/\//.test(part) ? (
                                                            <a key={idx} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline break-all">{part}</a>
                                                        ) : part
                                                    )}
                                                </p>
                                                )}
                                                {/* Sale metadata card */}
                                                {saleMeta && (
                                                    <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2 text-sm">
                                                        <div className="flex flex-wrap gap-3">
                                                            {saleMeta.productName && (
                                                                <span className="flex items-center gap-1">
                                                                    <Package className="h-3.5 w-3.5 text-amber-600" />
                                                                    <span className="font-medium">{saleMeta.productName}</span>
                                                                    {saleMeta.quantity && saleMeta.quantity > 1 && (
                                                                        <span className="text-muted-foreground">× {saleMeta.quantity}</span>
                                                                    )}
                                                                </span>
                                                            )}
                                                            {saleMeta.saleValue != null && (
                                                                <span className="flex items-center gap-1 font-semibold text-green-700">
                                                                    💰 {formatCurrency(saleMeta.saleValue)}
                                                                </span>
                                                            )}
                                                            <Badge variant="outline" className="border-amber-300 text-amber-800 bg-amber-100/50 text-[10px]">
                                                                {saleMeta.saleType === "SCHEDULED" ? "📅 Programação" : "💼 Pedido do Mês"}
                                                            </Badge>
                                                        </div>

                                                        {saleMeta.saleType === "SCHEDULED" && saleMeta.deliveries && saleMeta.deliveries.length > 0 && (
                                                            <div className="mt-2 pt-2 border-t border-amber-200 space-y-1">
                                                                <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Cronograma de Entregas:</p>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                                                                    {saleMeta.deliveries.map((del, dIdx) => (
                                                                        <div key={dIdx} className="bg-white dark:bg-zinc-900 border rounded p-1.5 text-xs flex justify-between items-center">
                                                                            <span>
                                                                                <strong>{dIdx + 1}ª:</strong> {new Date(del.dueDate + "T12:00:00").toLocaleDateString("pt-BR")}
                                                                            </span>
                                                                            <span className="font-semibold text-green-700">
                                                                                {formatCurrency(del.value)} <span className="text-[9px] text-muted-foreground font-normal">({del.markup}%)</span>
                                                                            </span>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}

                                                        {saleMeta.notes && (
                                                            <span className="w-full block text-xs text-muted-foreground italic pt-1">{saleMeta.notes}</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Modal de Nova Interação */}
            <InteractionModal
                clientId={client.id}
                clientName={client.name}
                open={interactionModalOpen}
                onClose={() => setInteractionModalOpen(false)}
                onSuccess={() => router.refresh()}
                onRequestTask={handleRequestTask}
            />

            {/* Modal de Nova Tarefa (pré-preenchido com este cliente) */}
            <TaskModal
                open={taskModalOpen}
                onClose={() => setTaskModalOpen(false)}
                clients={taskClients}
                users={taskUsers}
                userRole={userRole || "VENDEDOR"}
                currentUserId={currentUserId || ""}
                initialData={undefined}
                preselectedClientId={client.id}
            />
        </div>
    );
}
