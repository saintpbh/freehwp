import { AlignLeft, ChevronDown } from 'lucide-react';
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
    const [dragOverInfo, setDragOverInfo] = useState<{ id: string, position: 'top' | 'bottom' } | null>(null);
    const nodeRefs = useRef<{ [key: string]: HTMLDivElement | null }>({});

    const handleDragStart = (e: React.DragEvent, id: string) => {
        setDraggedId(id);
        e.dataTransfer.effectAllowed = 'move';
        // Need timeout for CSS class to apply properly without glitching the drag icon
        setTimeout(() => setDraggedId(id), 0); 
    };

    const handleDragOver = (e: React.DragEvent, id: string) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        const rect = nodeRefs.current[id]?.getBoundingClientRect();
        if (rect) {
            const mid = rect.top + rect.height / 2;
            const position = e.clientY < mid ? 'top' : 'bottom';
            if (dragOverInfo?.id !== id || dragOverInfo.position !== position) {
                setDragOverInfo({ id, position });
            }
        }
    };

    const handleDragEnd = () => {
        setDraggedId(null);
        setDragOverInfo(null);
    };

    const handleDrop = (e: React.DragEvent, targetId: string) => {
        e.preventDefault();
        if (draggedId && draggedId !== targetId && onItemMove) {
            let finalTargetId = targetId;
            if (dragOverInfo?.position === 'bottom') {
                const idx = displayItems.findIndex(i => i.id === targetId);
                if (idx !== -1 && idx + 1 < displayItems.length) {
                    finalTargetId = displayItems[idx + 1].id;
                } else {
                    // special flag if dropping at the absolute end, but for now we just use a pseudo-id
                    finalTargetId = 'end';
                }
            }
            // Allow backend to process pseudo ID or let it fail gracefully
            if (finalTargetId !== draggedId) {
                onItemMove(draggedId, finalTargetId);
            }
        }
        setDraggedId(null);
        setDragOverInfo(null);
    };

    return (
        <div className="outline-panel">
            <div className="outline-header">
                <AlignLeft size={16} />
                <span>개요 편집기</span>
            </div>
            
            <div className="outline-tree" onDragLeave={() => setDragOverInfo(null)}>
                {displayItems.length === 0 ? (
                    <div style={{ padding: '20px', color: '#888', fontSize: '13px', textAlign: 'center', lineHeight: '1.6' }}>
                        작성중인 문서의<br/>개요가 없습니다.<br/><br/>에디터에서 '개요' 스타일을<br/>적용해보세요.
                    </div>
                ) : (
                    displayItems.map((item, idx) => (
                        <div 
                            key={idx} 
                            ref={el => nodeRefs.current[item.id] = el}
                            draggable
                            onDragStart={(e) => handleDragStart(e, item.id)}
                            onDragOver={(e) => handleDragOver(e, item.id)}
                            onDragEnd={handleDragEnd}
                            onDrop={(e) => handleDrop(e, item.id)}
                            className={`outline-node level-${item.level} ${draggedId === item.id ? 'dragging' : ''} ${dragOverInfo?.id === item.id ? `drag-over-${dragOverInfo.position}` : ''}`}
                            onClick={() => onItemClick(item.id)}
                            style={{ 
                                transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)',
                                transform: draggedId && draggedId !== item.id && dragOverInfo?.id === item.id ? 
                                    dragOverInfo.position === 'top' ? 'translateY(4px)' : 'translateY(-4px)' : 'none'
                             }}
                        >
                            {/* Insert Indicator */}
                            {dragOverInfo?.id === item.id && dragOverInfo.position === 'top' && <div className="drag-indicator top" />}
                            
                            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                                {item.level === 1 && <ChevronDown size={14} className="node-icon" />}
                                {item.level === 2 && <div className="node-bullet" />}
                                <span className="node-text">{item.text}</span>
                            </div>

                            {/* Insert Indicator */}
                            {dragOverInfo?.id === item.id && dragOverInfo.position === 'bottom' && <div className="drag-indicator bottom" />}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
