import { Search, Folder, Star, Tag, Plus } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useState, useEffect } from 'react';
import '../styles.css';

interface DashboardProps {
    onOpenFile: () => void;
    onNewFile: () => void;
    onOpenDbFile: (id: string, title: string) => void;
}

export function Dashboard({ onOpenFile, onNewFile, onOpenDbFile }: DashboardProps) {
    const [dbDocs, setDbDocs] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        invoke('get_all_documents').then((docs: any) => {
            setDbDocs(docs);
        }).catch(err => {
            console.error('Failed to load db documents', err);
        });
    }, []);

    const filteredDocs = dbDocs.filter(doc => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return doc.title.toLowerCase().includes(q) || 
               (doc.outline_json && doc.outline_json.toLowerCase().includes(q));
    });

    return (
        <div className="dashboard-container">
            {/* Sidebar */}
            <div className="dashboard-sidebar">
                <h2 className="dashboard-brand">SERMON NOTES</h2>
                <nav className="dashboard-nav">
                    <button className="nav-item active"><Folder size={16} /> All Documents</button>
                    <button className="nav-item"><Star size={16} /> Favorites</button>
                    <button className="nav-item"><Tag size={16} /> Tags</button>
                </nav>
                <div className="sidebar-divider" />
                <nav className="dashboard-nav">
                    <button className="nav-item" onClick={onNewFile}><Plus size={16} /> New Sermon</button>
                    <button className="nav-item" onClick={onOpenFile}><Folder size={16} /> Open Local File</button>
                </nav>
            </div>

            {/* Main Content Area */}
            <div className="dashboard-main">
                {/* Search Header */}
                <div className="dashboard-header">
                    <div className="search-bar">
                        <input 
                            type="text" 
                            placeholder="Search sermons, tags, dates..." 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                        <Search className="search-icon" size={18} />
                    </div>
                    <div className="search-tags" style={{ opacity: 0.5 }}>
                        {/* Dynamic tags logic can be placed here in the future */}
                    </div>
                </div>

                {/* Grid Content */}
                <div className="dashboard-content">
                    <h1 className="content-title">Sermon Database <span className="subtitle">{filteredDocs.length} Sermons found</span></h1>
                    <div className="sermon-grid">
                        {filteredDocs.map(sermon => {
                            const date = new Date(sermon.updated_at).toLocaleDateString();
                            let tags: string[] = [];
                            try {
                                const outline = JSON.parse(sermon.outline_json);
                                tags = outline.slice(0, 3).map((o: any) => `#${o.title.substring(0, 8)}`);
                            } catch (e) {}

                            return (
                                <div key={sermon.id} className="sermon-card" onClick={() => onOpenDbFile(sermon.id, sermon.title)}>
                                    <div className="card-custom-date">{date}</div>
                                    <h3 className="card-title">{sermon.title}</h3>
                                    <p className="card-snippet">문단: {sermon.paragraph_count}개 / 글자: {sermon.char_count}자</p>
                                    <div className="card-tags">
                                        {tags.map((t, idx) => <span key={idx} className="card-tag">{t}</span>)}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
