import { useState, useCallback, useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { open, save, message } from '@tauri-apps/plugin-dialog';
import { FileText } from 'lucide-react';
import { Editor } from './components/Editor';
import { StatusBar } from './components/StatusBar';
import { ScriptureModal } from './components/ScriptureModal';
import { Dashboard } from './components/Dashboard';
import { PresenterMode } from './components/PresenterMode';
import { OutlinePanel } from './components/OutlinePanel';
import { MonitorPlay, Maximize2 } from 'lucide-react';
import './styles.css';

interface DocumentState {
    file_path: string | null;
    file_name: string;
    is_modified: boolean;
    char_count: number;
    paragraph_count: number;
    file_data: Uint8Array | null;
}

interface BibleVerse {
    id: number;
    book: string;
    chapter: number;
    verse: number;
    text: string;
}

function App() {
    const [doc, setDoc] = useState<DocumentState | null>(null);
    const [charCount, setCharCount] = useState(0);
    const [paragraphCount, setParagraphCount] = useState(0);
    const [isScriptureOpen, setIsScriptureOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // New UI Modes
    const [viewMode, setViewMode] = useState<'dashboard' | 'editor' | 'presenter'>('dashboard');
    const [isFocusMode, setIsFocusMode] = useState(false);
    const [showOutline] = useState(true);

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

            if (path.endsWith('.txt') || path.endsWith('.html')) {
                const { readTextFile } = await import('@tauri-apps/plugin-fs');
                const content = await readTextFile(path);
                const fileName = path.split('/').pop() || '파일';
                setDoc({
                    file_path: path, file_name: fileName, is_modified: false,
                    char_count: content.length, paragraph_count: 0, file_data: null,
                });
                setViewMode('editor');
            } else {
                const { readFile } = await import('@tauri-apps/plugin-fs');
                const bytes = await readFile(path);
                const fileName = path.split('/').pop() || '파일';
                
                setDoc({
                    file_path: path, file_name: fileName, is_modified: false,
                    char_count: 0, paragraph_count: 0, file_data: bytes,
                });
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
        setDoc({
            file_path: null, file_name: '새 문서', is_modified: false,
            char_count: 0, paragraph_count: 0, file_data: null,
        });
        setCharCount(0);
        setParagraphCount(0);
        setViewMode('editor');
    }, []);

    const getIframeWindow = () => {
        const iframe = document.querySelector('iframe.hwp-studio-frame') as HTMLIFrameElement;
        return iframe?.contentWindow;
    };

    const handleSaveHwpx = useCallback(async () => {
        try {
            const filePath = await save({
                filters: [{ name: 'HWPX 문서', extensions: ['hwpx'] }],
                defaultPath: (doc?.file_name || '문서').replace(/\.\w+$/, '') + '.hwpx',
            });
            if (!filePath) return;
            // TODO: HWPX Save using rhwp-studio export or wasm directly (feature expansion)
            await message(`HWPX 저장 기능은 로컬 연동 후 지원 예정입니다.\n${filePath}`, { title: '안내', kind: 'info' });
            setDoc(prev => prev ? { ...prev, is_modified: false, file_path: filePath, file_name: filePath.split('/').pop() || '문서' } : null);
        } catch (err) {
            console.error('HWPX 저장 실패:', err);
            await message(`파일 저장에 실패했습니다:\n${err}`, { title: '저장 오류', kind: 'error' });
        }
    }, [doc]);



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
    }, []);

    // const handleContentChange = useCallback((_html: string, stats: { chars: number; paragraphs: number }) => {
    //     setCharCount(stats.chars);
    //     setParagraphCount(stats.paragraphs);
    //     if (doc) setDoc(prev => prev ? { ...prev, is_modified: true } : null);
    // }, [doc]);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.metaKey || e.ctrlKey) {
            if (e.key === 'o') { e.preventDefault(); handleOpenFile(); }
            else if (e.key === 'n') { e.preventDefault(); handleNewFile(); }
            else if (e.key === 's') { e.preventDefault(); handleSaveHwpx(); }
            else if (e.key === 'j' || e.key === 'l') { e.preventDefault(); setIsScriptureOpen(true); }
        }
    }, [handleOpenFile, handleNewFile, handleSaveHwpx]);

    useEffect(() => {
        const unlisteners = [
            listen('menu-new', () => handleNewFile()),
            listen('menu-open', () => handleOpenFile()),
            listen('menu-save', () => handleSaveHwpx()),
            listen('menu-bible', () => setIsScriptureOpen(true))
        ];
        return () => {
            unlisteners.forEach(p => p.then(unlisten => unlisten()));
        };
    }, [handleNewFile, handleOpenFile, handleSaveHwpx]);

    // Listen to iframe pseudo-commands (e.g. from the new icon tray)
    useEffect(() => {
        const handleMessage = (e: MessageEvent) => {
            if (e.data?.type === 'CMD_NATIVE_NEW_FILE') {
                handleNewFile();
            }
        };
        window.addEventListener('message', handleMessage);
        return () => window.removeEventListener('message', handleMessage);
    }, [handleNewFile]);


    // Database Dashboard View
    if (viewMode === 'dashboard' || !doc) {
        return (
            <div className="welcome" onKeyDown={handleKeyDown} tabIndex={0}>
                <Dashboard onOpenFile={handleOpenFile} onNewFile={handleNewFile} />
            </div>
        );
    }

    // Presenter View
    if (viewMode === 'presenter') {
        // Fetch raw HTML from iframe or state (simulated here)
        return (
            <PresenterMode 
                htmlContent={`<h1 style="color:white; font-size:4em;">하나님의 사랑을 깨달으십시오</h1><p style="color:#aaa; font-size:2em;">요한1서 설교말씀...</p>`} 
                onClose={() => setViewMode('editor')} 
            />
        );
    }

    // Editor View
    return (
        <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }} onKeyDown={handleKeyDown} tabIndex={0}>
            {/* Title Bar - Hides in Focus Mode */}
            {!isFocusMode && (
                <div className="titlebar" data-tauri-drag-region>
                    <div className="titlebar-left">
                        <span className="window-controls-placeholder"></span>
                    </div>
                    
                    <div className="titlebar-center" data-tauri-drag-region>
                        <FileText size={14} style={{ marginRight: 6, opacity: 0.5 }} />
                        <span className="titlebar-title">
                            {doc.file_name} <span className="titlebar-modified">{doc.is_modified ? '— 수정됨' : ''}</span>
                        </span>
                    </div>

                    <div className="titlebar-right">
                        <button className="titlebar-btn" onClick={() => setViewMode('presenter')} title="프리젠터 모드">
                            <MonitorPlay size={15} />
                        </button>
                        <button className={`titlebar-btn ${isFocusMode ? 'primary' : ''}`} onClick={() => setIsFocusMode(!isFocusMode)} title="포커스 모드 (몰입)">
                            <Maximize2 size={15} />
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
            <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                    <Editor fileData={doc.file_data} fileName={doc.file_name} />
                </div>
                
                {/* Outline Panel - Hides in Focus Mode */}
                {!isFocusMode && showOutline && (
                    <OutlinePanel onItemClick={(id) => console.log('scroll to', id)} />
                )}
            </div>

            {/* Status Bar - Hides in Focus Mode */}
            {!isFocusMode && (
                <StatusBar
                    fileName={doc.file_name}
                    isModified={doc.is_modified}
                    charCount={charCount}
                    paragraphCount={paragraphCount}
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
