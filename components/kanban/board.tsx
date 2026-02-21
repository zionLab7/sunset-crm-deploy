"use client";

import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageCircle, Archive } from "lucide-react";
import { formatCurrency, getWhatsAppLink } from "@/lib/utils";

interface Client {
    id: string;
    name: string;
    potentialValue: number;
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
    onArchive?: (clientId: string, clientName: string) => void;
}

export function KanbanBoard({ columns, onDragEnd, onArchive }: KanbanBoardProps) {
    return (
        <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-4">
                {columns.map((column) => (
                    <KanbanColumn key={column.id} column={column} onArchive={onArchive} />
                ))}
            </div>
        </DragDropContext>
    );
}

function KanbanColumn({ column, onArchive }: { column: Column; onArchive?: (clientId: string, clientName: string) => void }) {
    return (
        <div className="flex-shrink-0 w-80">
            <Card>
                <CardHeader className="pb-3">
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
                            className={`space-y-2 min-h-[200px] ${snapshot.isDraggingOver ? "bg-gray-50" : ""
                                }`}
                        >
                            {column.clients.map((client, index) => (
                                <ClientCard key={client.id} client={client} index={index} onArchive={onArchive} />
                            ))}
                            {provided.placeholder}
                        </CardContent>
                    )}
                </Droppable>
            </Card>
        </div>
    );
}

function ClientCard({ client, index, onArchive }: { client: Client; index: number; onArchive?: (clientId: string, clientName: string) => void }) {
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
                        <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                                <h4 className="font-semibold text-sm">{client.name}</h4>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {formatCurrency(client.potentialValue)}
                                </p>
                            </div>
                            <div className="flex items-center gap-1 ml-2">
                                {onArchive && (
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8 text-muted-foreground hover:text-orange-600 hover:bg-orange-50"
                                        title="Arquivar do pipeline"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onArchive(client.id, client.name);
                                        }}
                                    >
                                        <Archive className="h-4 w-4" />
                                    </Button>
                                )}
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
                                            className="h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                                        >
                                            <MessageCircle className="h-4 w-4" />
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
