import { useState, useCallback, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
import { open, save, message } from '@tauri-apps/plugin-dialog';
import { FileText, MonitorPlay, Maximize2, X, Plus } from 'lucide-react';
import { Editor } from './components/Editor';
import { StatusBar } from './components/StatusBar';
import { ScriptureModal } from './components/ScriptureModal';
import { Dashboard } from './components/Dashboard';
import { PresenterMode } from './components/PresenterMode';
import { OutlinePanel } from './components/OutlinePanel';
import './styles.css';

interface DocumentState {
    id: string;
    file_path: string | null;
    file_name: string;
    is_modified: boolean;
    char_count: number;
    paragraph_count: number;
    file_data: Uint8Array | null;
    outline: any[];
}

interface BibleVerse {
    id: number;
    book: string;
    chapter: number;
    verse: number;
    text: string;
}

function App() {
    const [docs, setDocs] = useState<DocumentState[]>([]);
    const [activeTabId, setActiveTabId] = useState<string | null>(null);
    const [isScriptureOpen, setIsScriptureOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [viewMode, setViewMode] = useState<'dashboard' | 'editor' | 'presenter'>('dashboard');
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [presenterData, setPresenterData] = useState<any>(null);
    const [showOutline] = useState(true);
    const [focusTheme, setFocusTheme] = useState('hacker');

    const activeDoc = docs.find(d => d.id === activeTabId) || null;

    const handleOpenFile = useCallback(async () => {
        try {
            const filePath = await open({
                filters: [{
                    name: '문서 파일',
                    extensions: ['hwp', 'hwpx', 'txt', 'html']
                }]
            });
            if (!filePath) return;
            
            setIsLoading(true);
            const path = typeof filePath === 'string' ? filePath : filePath;
            const fileName = path.split('/').pop() || '파일';
            const newId = Date.now().toString();

            if (path.endsWith('.txt') || path.endsWith('.html')) {
                const { readTextFile } = await import('@tauri-apps/plugin-fs');
                const content = await readTextFile(path);
                const newDoc: DocumentState = {
                    id: newId, file_path: path, file_name: fileName, is_modified: false,
                    char_count: content.length, paragraph_count: 0, file_data: null, outline: []
                };
                setDocs(prev => [...prev, newDoc]);
                setActiveTabId(newId);
                setViewMode('editor');
            } else {
                const { readFile } = await import('@tauri-apps/plugin-fs');
                const bytes = await readFile(path);
                const newDoc: DocumentState = {
                    id: newId, file_path: path, file_name: fileName, is_modified: false,
                    char_count: 0, paragraph_count: 0, file_data: bytes, outline: []
                };
                setDocs(prev => [...prev, newDoc]);
                setActiveTabId(newId);
                setViewMode('editor');
            }
        } catch (err) {
            console.error('파일 열기 실패:', err);
            await message(`파일을 열 수 없습니다:\n${err}`, { title: '오류', kind: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, []);

    const handleNewFile = useCallback(() => {
        const newId = Date.now().toString();
        const newDoc: DocumentState = {
            id: newId, file_path: null, file_name: '새 문서', is_modified: false,
            char_count: 0, paragraph_count: 0, file_data: null, outline: []
        };
        setDocs(prev => [...prev, newDoc]);
        setActiveTabId(newId);
        setViewMode('editor');
    }, []);

    const handleCloseTab = useCallback((idToClose: string, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setDocs(prev => {
            const newDocs = prev.filter(d => d.id !== idToClose);
            if (newDocs.length === 0) {
                setActiveTabId(null);
                setViewMode('dashboard');
            } else if (activeTabId === idToClose) {
                setActiveTabId(newDocs[newDocs.length - 1].id);
            }
            return newDocs;
        });
    }, [activeTabId]);

    const getIframeWindow = useCallback(() => {
        if (!activeTabId) return null;
        const iframe = document.querySelector(`iframe.hwp-studio-frame[data-id="${activeTabId}"]`) as HTMLIFrameElement;
        return iframe?.contentWindow;
    }, [activeTabId]);

    const handleEnterPresenter = useCallback(() => {
        const cw = getIframeWindow();
        if (cw) {
            cw.postMessage({ type: 'rhwp-request', id: 'GET_PRESENTER_DATA', method: 'getPresenterData' }, '*');
        } else {
            setViewMode('presenter'); // fallback
        }
    }, [getIframeWindow]);

    const handleSaveToDb = useCallback(async () => {
        if (!activeDoc) return;
        const cw = getIframeWindow();
        if (cw) {
            setIsLoading(true);
            cw.postMessage({ type: 'rhwp-request', id: 'SAVE_TO_DB', method: 'exportHwp' }, '*');
        }
    }, [activeDoc]);

    const handleExternalExport = useCallback(async () => {
        if (!activeDoc) return;
        const cw = getIframeWindow();
        if (cw) {
            setIsLoading(true);
            cw.postMessage({ type: 'rhwp-request', id: 'EXPORT_EXTERNAL', method: 'exportHwp' }, '*');
        }
    }, [activeDoc]);

    const handleBibleInsert = useCallback((verses: BibleVerse[]) => {
        const cw = getIframeWindow();
        if (cw && verses.length > 0) {
            let combinedText = verses.map(v => `${v.verse}. ${v.text}`).join('\n');
            const sourceText = verses.length > 1 
                ? `${verses[0].book} ${verses[0].chapter}:${verses[0].verse}-${verses[verses.length-1].verse}`
                : `${verses[0].book} ${verses[0].chapter}:${verses[0].verse}`;
            combinedText += `\n— ${sourceText}\n`;

            cw.postMessage({
                type: 'rhwp-request', id: Date.now(), method: 'insertText',
                params: { text: combinedText }
            }, '*');
        }
    }, [activeTabId]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.metaKey || e.ctrlKey) {
            if (e.key === 'o') { e.preventDefault(); setViewMode('dashboard'); }
            else if (e.key === 'n') { e.preventDefault(); handleNewFile(); }
            else if (e.key === 's') { e.preventDefault(); handleSaveToDb(); }
            else if (e.key === 'e') { e.preventDefault(); handleExternalExport(); }
            else if (e.key === 'j' || e.key === 'l') { e.preventDefault(); setIsScriptureOpen(true); }
            else if (e.key === 'w') { 
                e.preventDefault(); 
                if (activeTabId) handleCloseTab(activeTabId); 
            }
            else if (e.key === 'v') {
                // Try to intercept image paste using Tauri's clipboard. If no image, we let the default web paste handle text.
                import('@tauri-apps/plugin-clipboard-manager').then(async ({ readImage }) => {
                    try {
                        const image = await readImage();
                        if (image) {
                            const bytes = await image.rgba();
                            const cw = getIframeWindow();
                            if (cw && bytes) {
                                e.preventDefault();
                                cw.postMessage({
                                    type: 'rhwp-request',
                                    id: Date.now(),
                                    method: 'pasteTauriImage',
                                    params: { rgba: Array.from(bytes), width: image.size.width, height: image.size.height }
                                }, '*');
                            }
                        }
                    } catch (err) {
                        // Not an image or clipboard permission denied; fallback to browser default paste
                    }
                });
            }
        } else if (e.key === 'Escape') {
            setIsFocusMode(false);
            setViewMode(prev => prev === 'presenter' ? 'editor' : prev);
        }
    }, [handleOpenFile, handleNewFile, handleSaveToDb, handleExternalExport, activeTabId, handleCloseTab]);

    useEffect(() => {
        const unlisteners = [
            listen('menu-new', () => handleNewFile()),
            listen('menu-open', () => setViewMode('dashboard')),
            listen('menu-save', () => handleSaveToDb()),
            listen('menu-export', () => handleExternalExport()),
            listen('menu-bible', () => setIsScriptureOpen(true)),
            listen('menu-close_document', () => {
                if (activeTabId) handleCloseTab(activeTabId);
                else setViewMode('dashboard');
            })
        ];
        return () => {
            unlisteners.forEach(p => p.then(unlisten => unlisten()));
        };
    }, [handleNewFile, handleOpenFile, handleSaveToDb, handleExternalExport, activeTabId, handleCloseTab]);

    useEffect(() => {
        const handleMessage = (e: MessageEvent) => {
            // Find which iframe sent it by comparing e.source
            let sourceId: string | null = null;
            document.querySelectorAll('iframe.hwp-studio-frame').forEach((ifr) => {
                if ((ifr as HTMLIFrameElement).contentWindow === e.source) {
                    sourceId = ifr.getAttribute('data-id');
                }
            });

            // If we couldn't match, assume active
            if (!sourceId && activeTabId) sourceId = activeTabId;

            if (e.data?.type === 'CMD_NATIVE_NEW_FILE') {
                handleNewFile();
            } else if (e.data?.type === 'CMD_NATIVE_SAVE' || e.data?.type === 'CMD_NATIVE_SAVE_AUTO') {
                handleSaveToDb();
            } else if (e.data?.type === 'CMD_NATIVE_CLOSE_TAB') {
                if (sourceId) handleCloseTab(sourceId);
            } else if (e.data?.type === 'CMD_NATIVE_ESCAPE') {
                setIsFocusMode(false);
                setViewMode(prev => prev === 'presenter' ? 'editor' : prev);
            } else if (e.data?.type === 'CMD_NATIVE_INSERT_BIBLE') {
                setIsScriptureOpen(true);
            } else if (e.data?.type === 'CMD_INSERT_BIBLE_AUTO') {
                const query = e.data.query;
                const matchLen = e.data.matchLen;
                invoke<any>('search_bible', { query: query }).then(result => {
                    const cw = getIframeWindow();
                    if (cw && result.verses.length > 0) {
                        let combinedText = '\n  "' + result.verses.map(v => `${v.text}`).join(' ') + '"\n';
                        const sourceText = result.verses.length > 1 
                            ? `${result.verses[0].book} ${result.verses[0].chapter}:${result.verses[0].verse}-${result.verses[result.verses.length-1].verse}`
                            : `${result.verses[0].book} ${result.verses[0].chapter}:${result.verses[0].verse}`;
                        combinedText += `  — ${sourceText}\n\n`;

                        // First delete the abbreviation (matchLen chars)
                        cw.postMessage({ type: 'rhwp-request', id: Date.now(), method: 'deleteText', params: { count: matchLen } }, '*');
                        // Then insert the verses
                        setTimeout(() => {
                           cw.postMessage({ type: 'rhwp-request', id: Date.now()+1, method: 'insertText', params: { text: combinedText } }, '*');
                        }, 50);
                    } else {
                        message('해당하는 성경 구절을 찾을 수 없습니다.', { title: '검색 결과 없음' });
                    }
                }).catch(err => {
                    console.error(err);
                });
            } else if (e.data?.type === 'CMD_NATIVE_PASTE_TAURI_IMAGE') {
                import('@tauri-apps/plugin-clipboard-manager').then(async ({ readImage }) => {
                    try {
                        const image = await readImage();
                        if (image) {
                            const bytes = await image.rgba();
                            const cw = getIframeWindow();
                            if (cw && bytes) {
                                cw.postMessage({
                                    type: 'rhwp-request',
                                    id: Date.now(),
                                    method: 'pasteTauriImage',
                                    params: { rgba: Array.from(bytes), width: image.size.width, height: image.size.height } // Raw RGBA pixels
                                }, '*');
                            }
                        }
                    } catch (err) {
                        // ignore
                    }
                });
            } else if (e.data?.type === 'rhwp-outline' && sourceId) {
                setDocs(prev => prev.map(d => d.id === sourceId ? { ...d, outline: e.data.outline || [] } : d));
            } else if (e.data?.type === 'rhwp-response') {
                if (e.data.id === 'GET_PRESENTER_DATA') {
                    setPresenterData(e.data.result);
                    setViewMode('presenter');
                } else if (e.data.id === 'SAVE_TO_DB' || e.data.id === 'EXPORT_EXTERNAL') {
                    setIsLoading(false);
                    if (e.data.error || !e.data.result) {
                         message(`오류: ${e.data.error || 'result is undefined'}`, { title: '저장 오류', kind: 'error' });
                         return;
                    }
                    const { data, charCount, paragraphCount, outline } = e.data.result;
                    const docId = sourceId || activeTabId;
                    const d = docs.find(x => x.id === docId);
                    if (!d) return;

                    if (e.data.id === 'SAVE_TO_DB') {
                        let finalTitle = d.file_name;
                        const firstSentence = e.data.result.firstSentence;
                        if (finalTitle === '새 문서' && firstSentence && firstSentence.trim().length > 0) {
                            finalTitle = firstSentence.trim();
                        }
                        
                        invoke('save_document', {
                            id: docId,
                            title: finalTitle,
                            data: data, // Tauri natively maps Uint8Array
                            charCount: charCount || 0,
                            paragraphCount: paragraphCount || 0,
                            outlineJson: JSON.stringify(outline || [])
                        }).then(() => {
                            setDocs(prev => prev.map(x => x.id === docId ? { 
                                ...x, 
                                file_name: finalTitle,
                                is_modified: false, 
                                char_count: charCount || 0, 
                                paragraph_count: paragraphCount || 0, 
                                outline: outline || [],
                                file_data: data
                            } : x));
                            message('데이터베이스에 저장되었습니다.', { title: '저장 완료' });
                        }).catch(err => {
                            message(`저장 실패: ${err}`, { title: '오류', kind: 'error' });
                        });
                    } else if (e.data.id === 'EXPORT_EXTERNAL') {
                        save({
                            filters: [{ name: 'HWP 문서', extensions: ['hwp', 'hwpx'] }],
                            defaultPath: (d.file_name || '문서').replace(/\.\w+$/, '') + '.hwp',
                        }).then(async filePath => {
                            if (!filePath) return;
                            const { writeFile } = await import('@tauri-apps/plugin-fs');
                            await writeFile(filePath, new Uint8Array(data));
                            message(`파일이 외부로 추출되었습니다.\n${filePath}`, { title: '내보내기 완료' });
                        }).catch(err => {
                            message(`내보내기 실패: ${err}`, { title: '오류', kind: 'error' });
                        });
                    }
                }
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [handleNewFile, activeTabId, handleCloseTab, docs, handleSaveToDb]);

    useEffect(() => {
        const interval = setInterval(() => {
            if (activeTabId && docs.find(d => d.id === activeTabId)?.is_modified) {
                handleSaveToDb();
            }
        }, 60000);
        return () => clearInterval(interval);
    }, [activeTabId, docs, handleSaveToDb]);

    const handleLoadFromDb = useCallback(async (dbId: string, title: string) => {
        try {
            setIsLoading(true);
            const bytes: number[] = await invoke('load_document', { id: dbId });
            const u8 = new Uint8Array(bytes);
            
            setDocs(prev => {
                if (prev.some(d => d.id === dbId)) return prev;
                const newDoc: DocumentState = {
                    id: dbId, file_path: null, file_name: title, is_modified: false,
                    char_count: 0, paragraph_count: 0, file_data: u8, outline: []
                };
                return [...prev, newDoc];
            });
            setActiveTabId(dbId);
            setViewMode('editor');
        } catch (err) {
            console.error('DB 불러오기 실패:', err);
            await message(`문서를 불러올 수 없습니다:\n${err}`, { title: '오류', kind: 'error' });
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Database Dashboard View
    if (viewMode === 'dashboard' || docs.length === 0) {
        return (
            <div className="welcome" onKeyDown={handleKeyDown} tabIndex={0}>
                <Dashboard onOpenFile={handleOpenFile} onNewFile={handleNewFile} onOpenDbFile={handleLoadFromDb} />
            </div>
        );
    }

    // Presenter View
    // Presenter View is wrapped below, but if standalone:
    if (viewMode === 'presenter') {
        return (
            <PresenterMode 
                presenterData={presenterData} 
                onClose={() => setViewMode('editor')} 
            />
        );
    }

    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }} onKeyDown={handleKeyDown} tabIndex={0}>
            {/* Title Bar & Tabs - Hides in Focus Mode */}
            {!isFocusMode && (
                <div className="titlebar" data-tauri-drag-region style={{ height: 'auto', padding: 0, flexDirection: 'column' }}>
                    
                    {/* Top Row: OSX Controls Placeholder + Active Doc Title */}
                    <div style={{ display: 'flex', width: '100%', height: 38, alignItems: 'center', padding: '0 12px' }} data-tauri-drag-region>
                        <div className="titlebar-left" style={{ width: 70 }}>
                            <span className="window-controls-placeholder"></span>
                        </div>
                        
                        <div className="titlebar-center" style={{ flex: 1, justifyContent: 'center' }} data-tauri-drag-region>
                            {activeDoc && (
                                <>
                                    <FileText size={14} style={{ marginRight: 6, opacity: 0.5 }} />
                                    <span className="titlebar-title">
                                        {activeDoc.file_name} <span className="titlebar-modified">{activeDoc.is_modified ? '— 수정됨' : ''}</span>
                                    </span>
                                </>
                            )}
                        </div>

                        <div className="titlebar-right" style={{ width: 80, justifyContent: 'flex-end', paddingRight: 4 }}>
                            <button className="titlebar-btn" onClick={handleEnterPresenter} title="프리젠터 모드">
                                <MonitorPlay size={15} />
                            </button>
                            <button className={`titlebar-btn ${isFocusMode ? 'primary' : ''}`} onClick={() => setIsFocusMode(!isFocusMode)} title="포커스 모드 (몰입)">
                                <Maximize2 size={15} />
                            </button>
                        </div>
                    </div>

                    {/* Bottom Row: Tab Bar */}
                    <div className="app-tab-bar" style={{ display: 'flex', width: '100%', background: '#eaeaea', borderBottom: '1px solid #ccc', padding: '0 8px', overflowX: 'auto' }} data-tauri-drag-region>
                        {docs.map(d => (
                            <div 
                                key={d.id} 
                                className={`app-tab ${d.id === activeTabId ? 'active' : ''}`} 
                                onClick={() => setActiveTabId(d.id)}
                            >
                                <FileText size={13} className="tab-icon" />
                                <span className="tab-title" title={d.file_name}>{d.file_name}{d.is_modified ? '*' : ''}</span>
                                <button className="tab-close-btn" onClick={(e) => handleCloseTab(d.id, e)}><X size={12} /></button>
                            </div>
                        ))}
                        <button className="tab-new-btn" onClick={handleNewFile} title="새 문서 (Cmd+N)">
                            <Plus size={16} />
                        </button>
                    </div>
                </div>
            )}

            {isLoading && (
                <div style={{ 
                    position: 'absolute', inset: 0, zIndex: 50, background: 'rgba(255,255,255,0.7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', color: '#666'
                }}>문서를 불러오는 중입니다...</div>
            )}

            {/* Main Editing Area */}
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden', position: 'relative' }}>
                
                {/* Focus Mode Overlays */}
                {isFocusMode && (
                    <>
                        <div style={{ position: 'absolute', top: 12, left: 16, zIndex: 50, pointerEvents: 'none' }}>
                            <span style={{ 
                                background: 'rgba(0,0,0,0.6)', color: 'white', padding: '6px 14px', borderRadius: 20, 
                                fontSize: 13, boxShadow: '0 2px 10px rgba(0,0,0,0.1)' 
                            }}>
                                ESC 키를 눌러 빠져나가기
                            </span>
                        </div>
                        <div style={{ position: 'absolute', top: 12, right: 16, zIndex: 50 }}>
                            <select 
                                value={focusTheme} 
                                onChange={e => setFocusTheme(e.target.value)}
                                style={{ 
                                    background: 'rgba(0,0,0,0.6)', color: 'white', border: '1px solid rgba(255,255,255,0.2)', 
                                    borderRadius: 6, padding: '4px 10px', fontSize: 13, outline: 'none', cursor: 'pointer' 
                                }}
                            >
                                <option value="hacker">기본 (해커/안구보호)</option>
                                <option value="dark">다크 모드</option>
                                <option value="warm">웜톤 (독서 모드)</option>
                                <option value="contrast">고대비</option>
                                <option value="default">일반 테마</option>
                            </select>
                        </div>
                    </>
                )}

                <div style={{ flex: 1, position: 'relative', background: isFocusMode ? '#111' : '#e3e3e3' }}>
                    {docs.map(d => (
                        <div key={d.id} style={{ display: d.id === activeTabId ? 'flex' : 'none', width: '100%', height: '100%' }}>
                            <Editor id={d.id} fileData={d.file_data} fileName={d.file_name} theme={isFocusMode ? focusTheme : 'default'} />
                        </div>
                    ))}
                </div>
                
                {/* Outline Panel - Hides in Focus Mode */}
                {!isFocusMode && showOutline && activeDoc && (
                    <OutlinePanel 
                        items={activeDoc.outline} 
                        onItemClick={(_id) => {
                            const cw = getIframeWindow();
                            if (cw) {
                                // For scrolling to item
                                // cw.postMessage({ type: 'rhwp-scroll-to', payload: { id } }, '*');
                            }
                        }}
                        onItemMove={(sourceId, targetId) => {
                            const cw = getIframeWindow();
                            if (cw) {
                                cw.postMessage({
                                    type: 'rhwp-request',
                                    id: Date.now(),
                                    method: 'moveOutlineSection',
                                    params: { sourceId, targetId }
                                }, '*');
                            }
                        }}
                    />
                )}
            </div>

            {/* Status Bar - Hides in Focus Mode */}
            {!isFocusMode && activeDoc && (
                <StatusBar
                    fileName={activeDoc.file_name}
                    isModified={activeDoc.is_modified}
                    charCount={activeDoc.char_count}
                    paragraphCount={activeDoc.paragraph_count}
                />
            )}

            <ScriptureModal
                isOpen={isScriptureOpen}
                onClose={() => setIsScriptureOpen(false)}
                onInsert={handleBibleInsert}
            />
        </div>
    );
}

export default App;
