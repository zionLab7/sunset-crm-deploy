"use client";

import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, ExternalLink } from "lucide-react";
import { getWhatsAppLink } from "@/lib/utils";
import Link from "next/link";

interface Client {
    id: string;
    name: string;
    phone: string | null;
}

interface Column {
    id: string;
    name: string;
    color: string;
    clients: Client[];
}

interface KanbanBoardProps {
    columns: Column[];
    onDragEnd: (result: DropResult) => void;
}

export function KanbanBoard({ columns, onDragEnd }: KanbanBoardProps) {
    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-4">
                {columns.map((column) => (
                    <KanbanColumn key={column.id} column={column} />
                ))}
            </div>
        </DragDropContext>
    );
}

function KanbanColumn({ column }: { column: Column }) {
    return (
        <div className="flex-shrink-0 w-80" style={{ height: "calc(100vh - 200px)" }}>
            <Card className="h-full flex flex-col">
                <CardHeader className="pb-3 flex-shrink-0 border-b">
                    <div className="flex items-center gap-2">
                        <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: column.color }}
                        />
                        <CardTitle className="text-base">{column.name}</CardTitle>
                        <Badge variant="secondary" className="ml-auto">
                            {column.clients.length}
                        </Badge>
                    </div>
                </CardHeader>
                <Droppable droppableId={column.id}>
                    {(provided, snapshot) => (
                        <CardContent
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className={`space-y-2 min-h-[200px] overflow-y-auto flex-1 ${snapshot.isDraggingOver ? "bg-gray-50" : ""
                                }`}
                        >
                            {column.clients.map((client, index) => (
                                <ClientCard key={client.id} client={client} index={index} />
                            ))}
                            {provided.placeholder}
                        </CardContent>
                    )}
                </Droppable>
            </Card>
        </div>
    );
}

function ClientCard({ client, index }: { client: Client; index: number }) {
    return (
        <Draggable draggableId={client.id} index={index}>
            {(provided, snapshot) => (
                <Card
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`cursor-grab active:cursor-grabbing ${snapshot.isDragging ? "shadow-lg rotate-2" : ""
                        } transition-all hover:shadow-md`}
                >
                    <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                                <h4 className="font-semibold text-sm truncate">{client.name}</h4>
                            </div>
                            <div className="flex items-center gap-1 ml-2 flex-shrink-0">
                                <Link
                                    href={`/clients/${client.id}`}
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-7 w-7 text-muted-foreground hover:text-primary"
                                        title="Abrir dossiê"
                                    >
                                        <ExternalLink className="h-3.5 w-3.5" />
                                    </Button>
                                </Link>
                                {client.phone && (
                                    <a
                                        href={getWhatsAppLink(client.phone)}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                    >
                                        <Button
                                            size="icon"
                                            variant="ghost"
                                            className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-50"
                                        >
                                            <MessageCircle className="h-3.5 w-3.5" />
                                        </Button>
                                    </a>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}
        </Draggable>
    );
}
