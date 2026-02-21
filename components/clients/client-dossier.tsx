"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { InteractionModal } from "@/components/clients/interaction-modal";
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
        currentStage: {
            id: string;
            name: string;
            color: string;
        };
        assignedUser: {
            id: string;
            name: string;
            email: string;
        };
        interactions: Array<{
            id: string;
            type: string;
            description: string;
            createdAt: string | Date;
            user: {
                id: string;
                name: string;
            };
        }>;
        tasks: Array<{
            id: string;
            title: string;
            status: string;
            dueDate: string | Date;
            user: {
                id: string;
                name: string;
            };
        }>;
        products: Array<{
            id: string;
            product: {
                id: string;
                name: string;
                stockCode: string;
            };
        }>;
    };
}

const INTERACTION_ICONS: Record<string, { icon: any; label: string; color: string }> = {
    CALL: { icon: PhoneCall, label: "Ligação", color: "text-blue-600" },
    VISIT: { icon: Building, label: "Visita", color: "text-purple-600" },
    EMAIL: { icon: Send, label: "Email", color: "text-green-600" },
    NOTE: { icon: FileText, label: "Nota", color: "text-gray-600" },
    STATUS_CHANGE: { icon: ArrowRightLeft, label: "Status", color: "text-orange-600" },
};

export function ClientDossier({ client }: ClientDossierProps) {
    const router = useRouter();
    const [interactionModalOpen, setInteractionModalOpen] = useState(false);
    const [pabxUrl, setPabxUrl] = useState<string | null>(null);
    const [isArchived, setIsArchived] = useState(client.archivedFromPipeline || false);
    const [archiving, setArchiving] = useState(false);

    useEffect(() => {
        fetch("/api/admin/system-config?key=pabxUrlTemplate")
            .then((res) => res.json())
            .then((data) => {
                if (data.config?.value) setPabxUrl(data.config.value);
            })
            .catch(() => { });
    }, []);

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

                        {/* Produtos de Interesse */}
                        {client.products && client.products.length > 0 && (
                            <div className="mb-4">
                                <p className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-2">
                                    <Package className="h-4 w-4" />
                                    Produtos de Interesse
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

                        {/* Contatos */}
                        <div className="space-y-3">
                            <p className="text-sm font-medium text-muted-foreground">
                                Contatos
                            </p>

                            {client.phone && (
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-sm">{formatPhone(client.phone)}</span>
                                    <div className="ml-auto flex items-center gap-0.5">
                                        <CopyButton text={client.phone} label="Telefone" />
                                        {pabxUrl && (
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
                                        <a
                                            href={getWhatsAppLink(client.phone)}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                        >
                                            <Button size="sm" variant="ghost" className="h-7 w-7 p-0" title="WhatsApp">
                                                <MessageCircle className="h-4 w-4 text-green-600" />
                                            </Button>
                                        </a>
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
                                    <div className="ml-auto">
                                        <CopyButton text={client.email} label="Email" />
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
                    </CardContent>
                </Card>
            </div>

            {/* Conteúdo Principal - Timeline */}
            <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold">Timeline de Atividades</h3>
                    <Button onClick={() => setInteractionModalOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Nova Interação
                    </Button>
                </div>

                {/* Timeline */}
                <div className="space-y-4">
                    {client.interactions.length === 0 ? (
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
                        client.interactions.map((interaction) => {
                            const config = INTERACTION_ICONS[interaction.type] || INTERACTION_ICONS.NOTE;
                            const Icon = config.icon;

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
                                                </div>
                                                <p className="text-sm text-gray-700 whitespace-pre-wrap">
                                                    {interaction.description}
                                                </p>
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
                open={interactionModalOpen}
                onClose={() => setInteractionModalOpen(false)}
                onSuccess={() => router.refresh()}
            />
        </div>
    );
}
