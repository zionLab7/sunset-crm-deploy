"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Search, MessageCircle, FileSpreadsheet, Trash2, CheckSquare, ExternalLink, UserCheck } from "lucide-react";
import { formatCurrency, formatCNPJ, getWhatsAppLink } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { ImportClientsModal } from "@/components/clients/import-clients-modal";

interface Client {
    id: string;
    name: string;
    cnpj: string;
    phone: string | null;
    potentialValue: number;
    currentStage: {
        id: string;
        name: string;
        color: string;
    };
    assignedUser: {
        name: string;
    };
}

interface PipelineStage {
    id: string;
    name: string;
    color: string;
}

export default function ClientsPage() {
    const router = useRouter();
    const { data: session } = useSession();
    const isGestor = (session?.user as any)?.role === "GESTOR";
    const [clients, setClients] = useState<Client[]>([]);
    const [stages, setStages] = useState<PipelineStage[]>([]);
    const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedStage, setSelectedStage] = useState<string>("all");
    const [importModalOpen, setImportModalOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [onlyMine, setOnlyMine] = useState(false);
    const [bulkTransferModalOpen, setBulkTransferModalOpen] = useState(false);
    const [transferUserId, setTransferUserId] = useState<string>("");
    const [transferring, setTransferring] = useState(false);


    const [selectedUser, setSelectedUser] = useState<string>("all");

    useEffect(() => {
        fetchData();
    }, [selectedStage, selectedUser]);

    const fetchData = async () => {
        try {
            // Buscar estágios
            const stagesRes = await fetch("/api/pipeline");
            const stagesData = await stagesRes.json();
            const allStages = stagesData.columns.map((col: any) => ({
                id: col.id,
                name: col.name,
                color: col.color,
            }));
            setStages(allStages);

            // Buscar clientes
            const params = new URLSearchParams();
            if (selectedStage !== "all") {
                params.append("stageId", selectedStage);
            }
            if (selectedUser !== "all") {
                params.append("assignedUserId", selectedUser);
            }

            const clientsRes = await fetch(`/api/clients?${params}`);
            const clientsData = await clientsRes.json();
            setClients(clientsData.clients || []);

            // Buscar vendedores para o modal de importação (apenas gestores)
            try {
                const usersRes = await fetch("/api/users");
                if (usersRes.ok) {
                    const usersData = await usersRes.json();
                    setUsers(usersData.users || []);
                }
            } catch {
                // Vendedores não têm acesso à lista de usuários
            }
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro ao carregar dados",
                description: "Tente novamente mais tarde.",
            });
        } finally {
            setLoading(false);
        }
    };

    const filteredClients = clients.filter((client) => {
        // Filtro "Meus Clientes"
        if (onlyMine && client.assignedUser.name !== session?.user?.name) return false;

        if (!searchTerm || searchTerm.trim() === "") return true;

        const searchNormalized = searchTerm.toLowerCase().trim();
        const searchOnlyNumbers = searchTerm.replace(/\D/g, "");

        const nameMatch = client.name.toLowerCase().includes(searchNormalized);
        const clientCNPJNumbers = (client.cnpj || "").replace(/\D/g, "");
        const cnpjMatch = searchOnlyNumbers.length > 0 && clientCNPJNumbers.includes(searchOnlyNumbers);

        // Busca por Código Interno (campo customizado)
        const internalCodeMatch = (client as any).customFieldValues?.some(
            (cfv: any) => cfv.value?.toLowerCase().includes(searchNormalized)
        ) || false;

        return nameMatch || cnpjMatch || internalCodeMatch;
    });

    const handleDeleteClient = async (client: Client, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent row navigation
        const confirmed = window.confirm(
            `⚠️ EXCLUIR PERMANENTEMENTE\n\nEsta ação NÃO pode ser desfeita.\n\nTem certeza que deseja excluir o cliente "${client.name}" e todos os seus dados (interações, tarefas, histórico)?`
        );
        if (!confirmed) return;

        try {
            const res = await fetch(`/api/clients/${client.id}`, { method: "DELETE" });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Erro ao excluir");

            toast({
                title: "✅ Cliente excluído",
                description: `"${client.name}" foi removido permanentemente.`,
            });
            fetchData(); // Refresh list
        } catch (err: any) {
            toast({
                variant: "destructive",
                title: "Erro ao excluir cliente",
                description: err.message,
            });
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.size === 0) return;
        const confirmed = window.confirm(
            `⚠️ EXCLUSÃO EM LOTE\n\nVocê está prestes a excluir ${selectedIds.size} cliente(s) permanentemente.\nEsta ação NÃO pode ser desfeita.\n\nDeseja continuar?`
        );
        if (!confirmed) return;

        let successCount = 0;
        let errorCount = 0;
        for (const id of selectedIds) {
            try {
                const res = await fetch(`/api/clients/${id}`, { method: "DELETE" });
                if (res.ok) successCount++;
                else errorCount++;
            } catch {
                errorCount++;
            }
        }

        setSelectedIds(new Set());
        fetchData();
        toast({
            title: `✅ ${successCount} cliente(s) excluído(s)`,
            description: errorCount > 0 ? `${errorCount} erro(s) durante a exclusão.` : undefined,
        });
    };

    const handleBulkTransfer = async () => {
        if (selectedIds.size === 0) return;
        if (!transferUserId) {
            toast({
                variant: "destructive",
                title: "Selecione um vendedor",
                description: "Você deve selecionar o vendedor de destino.",
            });
            return;
        }

        setTransferring(true);
        try {
            const res = await fetch("/api/clients/bulk-transfer", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    clientIds: Array.from(selectedIds),
                    newUserId: transferUserId,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Erro ao transferir clientes");
            }

            toast({
                title: "✅ Clientes transferidos!",
                description: data.message || `${selectedIds.size} cliente(s) transferido(s) com sucesso.`,
            });

            setBulkTransferModalOpen(false);
            setTransferUserId("");
            setSelectedIds(new Set());
            fetchData();
        } catch (err: any) {
            toast({
                variant: "destructive",
                title: "Erro ao transferir clientes",
                description: err.message,
            });
        } finally {
            setTransferring(false);
        }
    };

    const toggleSelectAll = () => {
        if (selectedIds.size === filteredClients.length && filteredClients.length > 0) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredClients.map((c) => c.id)));
        }
    };

    const toggleSelectOne = (id: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Clientes</h1>
                    <p className="text-muted-foreground mt-1">
                        Gerencie seus clientes e acompanhe o histórico
                    </p>
                </div>
                <div className="flex gap-2 flex-wrap">
                    {isGestor && selectedIds.size > 0 && (
                        <>
                            <Button
                                variant="outline"
                                onClick={() => setBulkTransferModalOpen(true)}
                                className="flex items-center gap-2 border-blue-200 text-blue-700 hover:bg-blue-50"
                            >
                                <UserCheck className="h-4 w-4" />
                                Transferir {selectedIds.size} cliente{selectedIds.size !== 1 ? "s" : ""}
                            </Button>
                            <Button
                                variant="destructive"
                                onClick={handleBulkDelete}
                                className="flex items-center gap-2"
                            >
                                <Trash2 className="h-4 w-4" />
                                Excluir {selectedIds.size} cliente{selectedIds.size !== 1 ? "s" : ""}
                            </Button>
                        </>
                    )}
                    <Button variant="outline" onClick={() => setImportModalOpen(true)}>
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Importar Planilha
                    </Button>
                    <Button onClick={() => router.push("/clients/new")}>
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Cliente
                    </Button>
                </div>
            </div>

            {/* Filtros */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Buscar por nome, CNPJ ou código interno..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
                {isGestor && (
                    <Select value={selectedUser} onValueChange={setSelectedUser}>
                        <SelectTrigger className="w-[200px]">
                            <SelectValue placeholder="Por Vendedor" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos os vendedores</SelectItem>
                            {users.map((u) => (
                                <SelectItem key={u.id} value={u.id}>
                                    {u.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                )}
                <Select value={selectedStage} onValueChange={setSelectedStage}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Status (Fases)" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os status (Fases)</SelectItem>
                        {stages.map((stage) => (
                            <SelectItem key={stage.id} value={stage.id}>
                                {stage.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
                {!isGestor && (
                    <Button
                        variant={onlyMine ? "default" : "outline"}
                        size="sm"
                        onClick={() => setOnlyMine(!onlyMine)}
                        className="whitespace-nowrap"
                    >
                        {onlyMine ? "✓ Meus Clientes" : "Meus Clientes"}
                    </Button>
                )}
            </div>

            {/* Tabela */}
            {filteredClients.length === 0 ? (
                <div className="text-center py-12 border rounded-lg">
                    <p className="text-muted-foreground">
                        {searchTerm || selectedStage !== "all"
                            ? "Nenhum cliente encontrado com os filtros aplicados."
                            : "Nenhum cliente cadastrado ainda."}
                    </p>
                    {!searchTerm && selectedStage === "all" && (
                        <Button
                            onClick={() => router.push("/clients/new")}
                            className="mt-4"
                            variant="outline"
                        >
                            <Plus className="h-4 w-4 mr-2" />
                            Adicionar Primeiro Cliente
                        </Button>
                    )}
                </div>
            ) : (
                <div className="border rounded-lg overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                {isGestor && (
                                    <TableHead className="w-10">
                                        <input
                                            type="checkbox"
                                            className="rounded border-gray-300 cursor-pointer"
                                            checked={selectedIds.size === filteredClients.length && filteredClients.length > 0}
                                            onChange={toggleSelectAll}
                                            title="Selecionar todos"
                                        />
                                    </TableHead>
                                )}
                                <TableHead>Nome</TableHead>
                                <TableHead>CNPJ</TableHead>
                                <TableHead>Estágio</TableHead>
                                <TableHead>Vendedor</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredClients.map((client) => (
                                <TableRow
                                    key={client.id}
                                    className={`cursor-pointer ${selectedIds.has(client.id) ? "bg-blue-50" : ""}`}
                                    onClick={() => router.push(`/clients/${client.id}`)}
                                >
                                    {isGestor && (
                                        <TableCell onClick={(e) => e.stopPropagation()}>
                                            <input
                                                type="checkbox"
                                                className="rounded border-gray-300 cursor-pointer"
                                                checked={selectedIds.has(client.id)}
                                                onChange={() => toggleSelectOne(client.id)}
                                            />
                                        </TableCell>
                                    )}
                                    <TableCell className="font-medium">
                                        <Link
                                            href={`/clients/${client.id}`}
                                            className="hover:underline font-semibold text-primary"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            {client.name}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {client.cnpj ? formatCNPJ(client.cnpj) : "—"}
                                    </TableCell>
                                    <TableCell>
                                        <Badge
                                            style={{
                                                backgroundColor: client.currentStage.color + "20",
                                                color: client.currentStage.color,
                                                borderColor: client.currentStage.color,
                                            }}
                                            className="border"
                                        >
                                            {client.currentStage.name}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {client.assignedUser.name}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-1">
                                            {client.phone && (isGestor || client.assignedUser.name === session?.user?.name) && (
                                                <a
                                                    href={getWhatsAppLink(client.phone)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                >
                                                    <Button size="sm" variant="ghost">
                                                        <MessageCircle className="h-4 w-4 text-green-600" />
                                                    </Button>
                                                </a>
                                            )}
                                            <Link
                                                href={`/clients/${client.id}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <Button size="sm" variant="ghost" title="Abrir em nova aba">
                                                    <ExternalLink className="h-4 w-4 text-blue-600" />
                                                </Button>
                                            </Link>
                                            {isGestor && (
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={(e) => handleDeleteClient(client, e)}
                                                    title="Excluir cliente permanentemente"
                                                    className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Contador */}
            <div className="text-sm text-muted-foreground">
                {filteredClients.length === 1
                    ? "1 cliente encontrado"
                    : `${filteredClients.length} clientes encontrados`}
            </div>

            {/* Modal de Importação */}
            <ImportClientsModal
                open={importModalOpen}
                onClose={() => setImportModalOpen(false)}
                onSuccess={fetchData}
                stages={stages}
                users={users}
            />

            {/* Modal de Transferência em Lote */}
            <Dialog open={bulkTransferModalOpen} onOpenChange={setBulkTransferModalOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Transferir Vendedor em Lote</DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <p className="text-sm text-muted-foreground">
                            Você selecionou <strong>{selectedIds.size}</strong> cliente(s) para transferir. Escolha o vendedor de destino abaixo:
                        </p>
                        <div className="grid gap-2">
                            <label className="text-sm font-medium">Novo Vendedor</label>
                            <Select value={transferUserId} onValueChange={setTransferUserId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Selecione um vendedor..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {users.map((u) => (
                                        <SelectItem key={u.id} value={u.id}>
                                            {u.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBulkTransferModalOpen(false)} disabled={transferring}>
                            Cancelar
                        </Button>
                        <Button onClick={handleBulkTransfer} disabled={transferring || !transferUserId} className="bg-blue-600 hover:bg-blue-700">
                            {transferring ? "Transferindo..." : "Confirmar Transferência"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
