"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Plus, Search, MessageCircle, FileSpreadsheet } from "lucide-react";
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
    const [clients, setClients] = useState<Client[]>([]);
    const [stages, setStages] = useState<PipelineStage[]>([]);
    const [users, setUsers] = useState<Array<{ id: string; name: string }>>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedStage, setSelectedStage] = useState<string>("all");
    const [importModalOpen, setImportModalOpen] = useState(false);

    useEffect(() => {
        fetchData();
    }, [selectedStage]);

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
        if (!searchTerm || searchTerm.trim() === "") return true;

        const searchNormalized = searchTerm.toLowerCase().trim();
        const searchOnlyNumbers = searchTerm.replace(/\D/g, "");

        const nameMatch = client.name.toLowerCase().includes(searchNormalized);
        const clientCNPJNumbers = client.cnpj.replace(/\D/g, "");
        const cnpjMatch = searchOnlyNumbers.length > 0 && clientCNPJNumbers.includes(searchOnlyNumbers);

        return nameMatch || cnpjMatch;
    });

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
                <div className="flex gap-2">
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
                        placeholder="Buscar por nome ou CNPJ..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                    />
                </div>
                <Select value={selectedStage} onValueChange={setSelectedStage}>
                    <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="Todos os estágios" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="all">Todos os estágios</SelectItem>
                        {stages.map((stage) => (
                            <SelectItem key={stage.id} value={stage.id}>
                                {stage.name}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
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
                                <TableHead>Nome</TableHead>
                                <TableHead>CNPJ</TableHead>
                                <TableHead>Estágio</TableHead>
                                <TableHead>Valor Potencial</TableHead>
                                <TableHead>Vendedor</TableHead>
                                <TableHead className="text-right">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredClients.map((client) => (
                                <TableRow
                                    key={client.id}
                                    className="cursor-pointer"
                                    onClick={() => router.push(`/clients/${client.id}`)}
                                >
                                    <TableCell className="font-medium">{client.name}</TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {formatCNPJ(client.cnpj)}
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
                                    <TableCell>{formatCurrency(client.potentialValue)}</TableCell>
                                    <TableCell className="text-muted-foreground">
                                        {client.assignedUser.name}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {client.phone && (
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
        </div>
    );
}
