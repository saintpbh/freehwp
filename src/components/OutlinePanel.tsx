import { AlignLeft, ChevronDown } from 'lucide-react';
import '../styles.css';

interface OutlineItem {
    id: string;
    level: 1 | 2;
    text: string;
}

interface OutlinePanelProps {
    items?: OutlineItem[];
    onItemClick: (id: string) => void;
}

export function OutlinePanel({ items, onItemClick }: OutlinePanelProps) {
    const defaultItems: OutlineItem[] = [
        { id: '1', level: 1, text: '1. 하나님의 사랑의 본질' },
        { id: '2', level: 2, text: '사랑은 하나님께 속한 것' },
        { id: '3', level: 2, text: '하나님을 아는 것과 사랑하는 것' },
        { id: '4', level: 1, text: '2. 하나님의 사랑의 증거' },
        { id: '5', level: 2, text: '독생자를 보내신 사랑' },
        { id: '6', level: 2, text: '화목 제물로 주신 아들' },
    ];

    const displayItems = items && items.length > 0 ? items : defaultItems;

    return (
        <div className="outline-panel">
            <div className="outline-header">
                <AlignLeft size={16} />
                <span>개요</span>
            </div>
            
            <div className="outline-tree">
                {displayItems.map((item, idx) => (
                    <div 
                        key={idx} 
                        className={`outline-node level-${item.level}`}
                        onClick={() => onItemClick(item.id)}
                    >
                        {item.level === 1 && <ChevronDown size={14} className="node-icon" />}
                        {item.level === 2 && <div className="node-bullet" />}
                        <span className="node-text">{item.text}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}
