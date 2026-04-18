import { AlignLeft, ChevronDown, GripVertical } from 'lucide-react';
import { useState, useRef } from 'react';
import '../styles.css';

interface OutlineItem {
    id: string;
    level: 1 | 2;
    text: string;
}

interface OutlinePanelProps {
    items?: OutlineItem[];
    onItemClick: (id: string) => void;
    onItemMove?: (sourceId: string, targetId: string) => void;
}

export function OutlinePanel({ items, onItemClick, onItemMove }: OutlinePanelProps) {
    const displayItems = items || [];
    const [draggedId, setDraggedId] = useState<string | null>(null);
    const [dropTargetId, setDropTargetId] = useState<string | null>(null);
    const draggedIdRef = useRef<string | null>(null);

    const handleDragStart = (e: React.DragEvent, id: string) => {
        draggedIdRef.current = id;
        setDraggedId(id);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', id);
    };

    const handleDragOver = (e: React.DragEvent, id: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        if (draggedIdRef.current && draggedIdRef.current !== id) {
            setDropTargetId(id);
        }
    };

    const handleDragEnd = () => {
        draggedIdRef.current = null;
        setDraggedId(null);
        setDropTargetId(null);
    };

    const handleDrop = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        e.stopPropagation();
        const sourceId = draggedIdRef.current;
        if (sourceId && sourceId !== targetId && onItemMove) {
            onItemMove(sourceId, targetId);
        }
        draggedIdRef.current = null;
        setDraggedId(null);
        setDropTargetId(null);
    };

    return (
        <div className="outline-panel">
            <div className="outline-header">
                <AlignLeft size={16} />
                <span>개요 편집기</span>
            </div>
            
            <div className="outline-tree">
                {displayItems.length === 0 ? (
                    <div style={{ padding: '20px', color: '#888', fontSize: '13px', textAlign: 'center', lineHeight: '1.6' }}>
                        작성중인 문서의<br/>개요가 없습니다.<br/><br/>에디터에서 H1/H2 버튼으로<br/>개요 스타일을 적용해보세요.
                    </div>
                ) : (
                    displayItems.map((item, idx) => {
                        const isDragging = draggedId === item.id;
                        const isDropTarget = dropTargetId === item.id && draggedId !== item.id;
                        
                        return (
                            <div 
                                key={item.id || idx}
                                draggable
                                onDragStart={(e) => handleDragStart(e, item.id)}
                                onDragOver={(e) => handleDragOver(e, item.id)}
                                onDragEnd={handleDragEnd}
                                onDrop={(e) => handleDrop(e, item.id)}
                                className={`outline-node level-${item.level}`}
                                style={{
                                    opacity: isDragging ? 0.35 : 1,
                                    background: isDropTarget ? 'rgba(11, 102, 195, 0.08)' : undefined,
                                    borderLeft: isDropTarget ? '3px solid #0b66c3' : '3px solid transparent',
                                    transition: 'all 0.15s ease',
                                    cursor: 'grab',
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '4px' }}>
                                    <GripVertical size={12} style={{ color: '#bbb', flexShrink: 0 }} />
                                    {item.level === 1 && <ChevronDown size={14} className="node-icon" />}
                                    {item.level === 2 && <div className="node-bullet" />}
                                    <span 
                                        className="node-text" 
                                        onClick={(e) => { e.stopPropagation(); onItemClick(item.id); }}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        {item.text}
                                    </span>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}
