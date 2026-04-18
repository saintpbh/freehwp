import { Search, Folder, Star, Tag, Plus, LayoutGrid, List } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { useState, useEffect, useMemo } from 'react';
import '../styles.css';

interface DashboardProps {
    onOpenFile: () => void;
    onNewFile: () => void;
    onOpenDbFile: (id: string, title: string) => void;
}

export function Dashboard({ onOpenFile, onNewFile, onOpenDbFile }: DashboardProps) {
    const [dbDocs, setDbDocs] = useState<any[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
    const [sortOption, setSortOption] = useState<'recent' | 'name' | 'size'>('recent');

    useEffect(() => {
        invoke('get_all_documents').then((docs: any) => {
            setDbDocs(docs);
        }).catch(err => {
            console.error('Failed to load db documents', err);
        });
    }, []);

    // 태그 클라우드 추출
    const allTags = useMemo(() => {
        const tagMap = new Map<string, number>();
        dbDocs.forEach(doc => {
            try {
                const outline = JSON.parse(doc.outline_json || '[]');
                outline.slice(0, 5).forEach((o: any) => {
                    const t = `#${o.title.substring(0, 8).trim()}`;
                    if (t.length > 2) tagMap.set(t, (tagMap.get(t) || 0) + 1);
                });
            } catch (e) {}
        });
        // 빈도수 높은 순, 최대 12개
        return Array.from(tagMap.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 12)
            .map(e => e[0]);
    }, [dbDocs]);

    // 필터링 및 정렬
    const filteredDocs = useMemo(() => {
        let result = dbDocs.filter(doc => {
            if (!searchQuery) return true;
            const q = searchQuery.toLowerCase();
            return doc.title.toLowerCase().includes(q) || 
                   (doc.outline_json && doc.outline_json.toLowerCase().includes(q));
        });

        result.sort((a, b) => {
            if (sortOption === 'recent') {
                return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
            } else if (sortOption === 'name') {
                return a.title.localeCompare(b.title);
            } else if (sortOption === 'size') {
                return b.char_count - a.char_count;
            }
            return 0;
        });
        
        return result;
    }, [dbDocs, searchQuery, sortOption]);

    const [activeTab, setActiveTab] = useState<'home' | 'all' | 'favorites' | 'tags'>('home');

    // ... existing ...

    return (
        <div className="dashboard-container">
            {/* Sidebar */}
            <div className="dashboard-sidebar">
                <h2 className="dashboard-brand">SERMON NOTES</h2>
                <nav className="dashboard-nav">
                    <button className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
                        <Folder size={16} /> 홈 (안내 및 시작)
                    </button>
                    <button className={`nav-item ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
                        <List size={16} /> 모든 문서
                    </button>
                    <button className={`nav-item ${activeTab === 'favorites' ? 'active' : ''}`} onClick={() => setActiveTab('favorites')}>
                        <Star size={16} /> 즐겨찾기
                    </button>
                    <button className={`nav-item ${activeTab === 'tags' ? 'active' : ''}`} onClick={() => setActiveTab('tags')}>
                        <Tag size={16} /> 태그
                    </button>
                </nav>
                <div className="sidebar-divider" />
                <nav className="dashboard-nav">
                    <button className="nav-item" onClick={onNewFile}><Plus size={16} /> New Sermon</button>
                    <button className="nav-item" onClick={onOpenFile}><Folder size={16} /> Open Local File</button>
                </nav>
            </div>

            {/* Main Content Area */}
            <div className="dashboard-main">
                {activeTab === 'home' ? (
                    <div className="dashboard-content dashboard-welcome-content">
                        <div className="welcome-hero">
                            <h1 className="welcome-title">맘편한설교노트</h1>
                            <p className="welcome-subtitle">간편하고 강력한 HWP 호환 목회 및 설교 작성 도구에 오신 것을 환영합니다.</p>
                            <div className="welcome-action-buttons">
                                <button className="hero-btn primary" onClick={onNewFile}>
                                    <Plus size={18} /> 새 문서 작성하기
                                </button>
                                <button className="hero-btn secondary" onClick={onOpenFile}>
                                    <Folder size={18} /> 기존 파일 열기
                                </button>
                            </div>
                        </div>

                        <div className="manual-grid">
                            <div className="manual-card">
                                <h3>💡 기본 사용법</h3>
                                <ul>
                                    <li>좌측 상단 패널을 통해 문서를 저장하거나 HWPX 형식으로 외부로 내보낼 수 있습니다.</li>
                                    <li>작성된 문서는 로컬 내장 데이터베이스(SQLite)에 자동으로 안전하게 보관됩니다.</li>
                                    <li>우측 개요 패널은 문서의 <b>제목1~제목6</b> 스타일을 감지하여 클릭 시 해당 문단으로 바로 이동시켜 줍니다.</li>
                                </ul>
                            </div>
                            <div className="manual-card">
                                <h3>⌨️ 유용한 단축키</h3>
                                <ul className="shortcut-list">
                                    <li><kbd>Cmd</kbd> + <kbd>S</kbd> <span>문서 저장하기</span></li>
                                    <li><kbd>Cmd</kbd> + <kbd>P</kbd> <span>문서 인쇄하기</span></li>
                                    <li><kbd>Cmd</kbd> + <kbd>O</kbd> <span>파일 열기</span></li>
                                    <li><kbd>Esc</kbd> <span>집중 모드 토글 (사이드바 숨기기)</span></li>
                                    <li><kbd>Cmd</kbd> + <kbd>B</kbd> <span>글자 굵게</span></li>
                                </ul>
                            </div>
                            <div className="manual-card">
                                <h3>📖 성경 바로 삽입</h3>
                                <ul>
                                    <li>문서를 작성하다가 언제든 본문에 성경 구절을 넣을 수 있습니다.</li>
                                    <li>본문에 <code>마 1:1-5</code> 또는 정식으로 <code>마태복음 1장 1-5절</code>과 같이 입력하고 잠시 기다리거나 <b>Space</b>를 누르면 구절 자동 완성 창이 뜹니다.</li>
                                    <li>상단의 성경책 아이콘을 클릭하여 직접 검색 후 본문에 넣을 수도 있습니다.</li>
                                </ul>
                            </div>
                        </div>

                        <div className="ad-placeholder-container">
                            <div className="ad-placeholder">
                                <span>[ 광고 배너 자리 (728x90) ]</span>
                                <small>향후 Google AdSense 등 광고가 표시될 영역입니다.</small>
                            </div>
                        </div>
                    </div>
                ) : (
                    <>
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
                            {allTags.length > 0 && (
                                <div className="search-tags">
                                    {allTags.map(tag => (
                                        <button 
                                            key={tag} 
                                            className="filter-tag" 
                                            onClick={() => setSearchQuery(prev => prev === tag ? '' : tag)}
                                            style={{
                                                background: searchQuery.includes(tag) ? '#0b66c3' : undefined,
                                                color: searchQuery.includes(tag) ? '#fff' : undefined,
                                            }}
                                        >
                                            {tag}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Grid Content */}
                        <div className="dashboard-content">
                            <div className="content-header-row">
                                <h1 className="content-title">
                                    Sermon Database <span className="subtitle">{filteredDocs.length} Sermons found</span>
                                </h1>
                                <div className="dashboard-controls">
                                    <select 
                                        className="sort-select" 
                                        value={sortOption} 
                                        onChange={(e) => setSortOption(e.target.value as any)}
                                    >
                                        <option value="recent">최근 수정순</option>
                                        <option value="name">이름순 (가나다)</option>
                                        <option value="size">분량순 (글자수)</option>
                                    </select>
                                    <div className="view-toggle">
                                        <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')} title="리스트 뷰"><List size={18} /></button>
                                        <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')} title="그리드 뷰"><LayoutGrid size={18} /></button>
                                    </div>
                                </div>
                            </div>

                            <div className={viewMode === 'grid' ? "sermon-grid" : "sermon-list"}>
                                {filteredDocs.map(sermon => {
                                    const date = new Date(sermon.updated_at).toLocaleDateString();
                                    let tags: string[] = [];
                                    try {
                                        const outline = JSON.parse(sermon.outline_json || '[]');
                                        tags = outline.slice(0, 3).map((o: any) => `#${o.title.substring(0, 8).trim()}`);
                                    } catch (e) {}

                                    if (viewMode === 'list') {
                                        return (
                                            <div key={sermon.id} className="list-item" onClick={() => onOpenDbFile(sermon.id, sermon.title)}>
                                                <div className="list-title">{sermon.title}</div>
                                                <div className="list-tags">
                                                    {tags.map((t, idx) => <span key={idx} className="card-tag">{t}</span>)}
                                                </div>
                                                <div className="list-meta">{sermon.char_count}자</div>
                                                <div className="list-date">{date}</div>
                                            </div>
                                        );
                                    }

                                    // Grid View elements
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
                    </>
                )}
            </div>
        </div>
    );
}
