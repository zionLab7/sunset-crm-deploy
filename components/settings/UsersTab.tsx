"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Edit, Trash2, Users as UsersIcon } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useConfirm } from "@/hooks/use-confirm";
import { UserModal } from "./UserModal";

interface User {
    id: string;
    name: string;
    email: string;
    role: "VENDEDOR" | "GESTOR";
    createdAt: string;
    _count?: {
        clients: number;
        tasks: number;
    };
}

export function UsersTab() {
    const { confirm, ConfirmDialog } = useConfirm();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/admin/users");
            const data = await res.json();
            setUsers(data.users || []);
        } catch (error) {
            toast({
                variant: "destructive",
                title: "Erro ao carregar usuários",
                description: "Tente novamente mais tarde.",
            });
        } finally {
            setLoading(false);
        }
    };

    const handleNewUser = () => {
        setSelectedUser(null);
        setModalOpen(true);
    };

    const handleEditUser = (user: User) => {
        setSelectedUser(user);
        setModalOpen(true);
    };

    const handleDeleteUser = async (user: User) => {
        const confirmed = await confirm({
            title: "Excluir Usuário",
            description: `Tem certeza que deseja excluir "${user.name}"? Esta ação não pode ser desfeita.`,
            confirmText: "Excluir",
        });

        if (!confirmed) {
            return;
        }

        try {
            const res = await fetch(`/api/admin/users/${user.id}`, {
                method: "DELETE",
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Erro ao excluir usuário");
            }

            toast({
                title: "✅ Usuário excluído!",
                description: `${user.name} foi removido com sucesso.`,
            });

            fetchUsers();
        } catch (error: any) {
            toast({
                variant: "destructive",
                title: "Erro ao excluir usuário",
                description: error.message,
            });
        }
    };

    const getRoleBadge = (role: string) => {
        return role === "GESTOR" ? (
            <Badge variant="default">Gestor</Badge>
        ) : (
            <Badge variant="secondary">Vendedor</Badge>
        );
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                    <div className="flex items-center gap-2">
                        <UsersIcon className="h-5 w-5 text-muted-foreground" />
                        <CardTitle>Usuários do Sistema</CardTitle>
                    </div>
                    <Button size="sm" onClick={handleNewUser}>
                        <Plus className="h-4 w-4 mr-2" />
                        Novo Usuário
                    </Button>
                </CardHeader>
                <CardContent>
                    {users.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                            <p>Nenhum usuário encontrado</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {users.map((user) => (
                                <div
                                    key={user.id}
                                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <h4 className="font-medium">{user.name}</h4>
                                            {getRoleBadge(user.role)}
                                        </div>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {user.email}
                                        </p>
                                        {user._count && (
                                            <p className="text-xs text-muted-foreground mt-1">
                                                {user._count.clients} cliente(s) · {user._count.tasks} tarefa(s)
                                            </p>
                                        )}
                                    </div>
                                    <div className="flex gap-1">
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => handleEditUser(user)}
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            onClick={() => handleDeleteUser(user)}
                                        >
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            <UserModal
                open={modalOpen}
                onClose={() => {
                    setModalOpen(false);
                    setSelectedUser(null);
                }}
                onSuccess={fetchUsers}
                initialData={selectedUser || undefined}
            />

            <ConfirmDialog />
        </div >
    );
}
