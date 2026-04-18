import { Search, Folder, Star, Tag, Plus } from 'lucide-react';
import '../styles.css';

interface DashboardProps {
    onOpenFile: () => void;
    onNewFile: () => void;
}

export function Dashboard({ onOpenFile, onNewFile }: DashboardProps) {
    // Dummy DB items for now to show the design
    const dummySermons = [
        { id: 1, title: '사랑은 행함과 진실함으로', date: 'May 14, 2023', tags: ['#사랑', '#요한1서'], snippet: '우리가 형제를 사랑함으로 사망에서 옮겨...' },
        { id: 2, title: '하나님의 본성: 사랑', date: 'Apr 30, 2023', tags: ['#은혜', '#사랑'], snippet: '하나님은 사랑이시라. 사랑 안에 거하는...' },
        { id: 3, title: '요한일서의 소망', date: 'Apr 16, 2023', tags: ['#믿음', '#교회'], snippet: '빛 가운데 행하며 형제를 사랑하라...' },
        { id: 4, title: '영원한 생명', date: 'Apr 02, 2023', tags: ['#복음', '#믿음'], snippet: '하나님이 세상을 이처럼 사랑하사 독생자를...' },
    ];

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
                        <input type="text" placeholder="Search sermons, tags, dates..." />
                        <Search className="search-icon" size={18} />
                    </div>
                    <div className="search-tags">
                        <span className="tag-chip">요한1서 &times;</span>
                        <span className="tag-chip">사랑 &times;</span>
                        <span className="tag-chip">2023년 &times;</span>
                    </div>
                </div>

                {/* Grid Content */}
                <div className="dashboard-content">
                    <h1 className="content-title">Sermon Database <span className="subtitle">8 Sermons found</span></h1>
                    <div className="sermon-grid">
                        {dummySermons.map(sermon => (
                            <div key={sermon.id} className="sermon-card" onClick={onNewFile}>
                                <div className="card-custom-date">{sermon.date}</div>
                                <h3 className="card-title">{sermon.title}</h3>
                                <p className="card-snippet">{sermon.snippet}</p>
                                <div className="card-tags">
                                    {sermon.tags.map(t => <span key={t} className="card-tag">{t}</span>)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
