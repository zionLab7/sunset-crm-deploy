"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings } from "lucide-react";
import { CustomFieldsTab } from "@/components/settings/CustomFieldsTab";
import { UsersTab } from "@/components/settings/UsersTab";
import { PipelineStagesTab } from "@/components/settings/PipelineStagesTab";
import { IntegrationsTab } from "@/components/settings/IntegrationsTab";
import { GoalConfigCard } from "@/components/settings/GoalConfigCard";

function SettingsContent() {
    const searchParams = useSearchParams();
    const initialTab = searchParams.get("tab") || "custom-fields";
    const [activeTab, setActiveTab] = useState(initialTab);
    const { data: session } = useSession();
    const isGestor = (session?.user as any)?.role === "GESTOR";

    return (
        <div className="flex flex-col gap-6 p-4 md:p-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Configurações</h1>
                    <p className="text-muted-foreground mt-1">
                        Gerencie campos customizados, usuários, fases do funil e integrações
                    </p>
                </div>
                <Settings className="h-8 w-8 text-muted-foreground" />
            </div>

            {/* Meta Mensal — somente gestor */}
            {isGestor && <GoalConfigCard />}

            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full max-w-3xl grid-cols-4">
                    <TabsTrigger value="custom-fields">Campos</TabsTrigger>
                    <TabsTrigger value="users">Usuários</TabsTrigger>
                    <TabsTrigger value="pipeline">Funil</TabsTrigger>
                    <TabsTrigger value="integrations">Integrações</TabsTrigger>
                </TabsList>

                <TabsContent value="custom-fields" className="mt-6">
                    <CustomFieldsTab />
                </TabsContent>

                <TabsContent value="users" className="mt-6">
                    <UsersTab />
                </TabsContent>

                <TabsContent value="pipeline" className="mt-6">
                    <PipelineStagesTab />
                </TabsContent>

                <TabsContent value="integrations" className="mt-6">
                    <IntegrationsTab />
                </TabsContent>
            </Tabs>
        </div>
    );
}

export default function SettingsPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
        }>
            <SettingsContent />
        </Suspense>
    );
}
