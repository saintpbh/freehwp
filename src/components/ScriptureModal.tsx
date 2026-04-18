import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';

interface BibleVerse {
    id: number;
    book: string;
    chapter: number;
    verse: number;
    text: string;
    title?: string;
}

interface ScriptureModalProps {
    isOpen: boolean;
    onClose: () => void;
    onInsert: (verses: BibleVerse[]) => void;
}

export function ScriptureModal({ isOpen, onClose, onInsert }: ScriptureModalProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<BibleVerse[]>([]);
    const [selectedIdx, setSelectedIdx] = useState(0);
    const [error, setError] = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) setTimeout(() => inputRef.current?.focus(), 100);
    }, [isOpen]);

    useEffect(() => {
        if (query.trim().length < 2) { setResults([]); setError(null); return; }
        const timer = setTimeout(async () => {
            try {
                const res = await invoke<{ verses: BibleVerse[] }>('search_bible', { query });
                setResults(res.verses || []);
                setSelectedIdx(0);
                setError(null);
            } catch (e) {
                setError('성경 DB 연결 실패');
                setResults([]);
            }
        }, 250);
        return () => clearTimeout(timer);
    }, [query]);

    const handleKey = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIdx(i => (i + 1) % Math.max(results.length, 1)); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIdx(i => (i - 1 + results.length) % Math.max(results.length, 1)); }
        else if (e.key === 'Enter') { e.preventDefault(); if (results.length > 0 && e.metaKey) { onInsert(results); onClose(); setQuery(''); } else if (results[selectedIdx]) { onInsert([results[selectedIdx]]); onClose(); setQuery(''); } }
        else if (e.key === 'Escape') { onClose(); }
    };

    if (!isOpen) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)',
            zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: isOpen ? 1 : 0, transition: 'opacity 0.2s ease',
        }}>
            <div style={{
                background: 'white', width: '100%', maxWidth: 640, borderRadius: 20,
                boxShadow: '0 25px 60px rgba(0,0,0,0.15), 0 4px 12px rgba(0,0,0,0.1)', overflow: 'hidden', maxHeight: '80vh', display: 'flex', flexDirection: 'column',
                transform: isOpen ? 'scale(1)' : 'scale(0.98)', transition: 'transform 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
            }}>
                <div style={{ padding: '16px', borderBottom: '1px solid #e5e5e5', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Search size={18} color="#888" />
                    <input
                        ref={inputRef}
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        onKeyDown={handleKey}
                        placeholder="성경 검색 (예: 창 1:1 또는 '사랑')"
                        style={{
                            flex: 1, border: 'none', outline: 'none', fontSize: 16,
                            fontFamily: "'KoPub Dotum', sans-serif",
                        }}
                    />
                    <button onClick={onClose} style={{ all: 'unset', cursor: 'pointer', opacity: 0.5 }}>
                        <X size={18} />
                    </button>
                </div>

                <div style={{ overflowY: 'auto', maxHeight: '60vh', background: '#fafafa' }}>
                    {results.length > 1 && (
                        <div style={{ padding: '8px 16px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'flex-end', background: 'white', position: 'sticky', top: 0, zIndex: 10, boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                            <button 
                                onClick={() => { onInsert(results); onClose(); setQuery(''); }}
                                style={{
                                    all: 'unset', background: '#3b82f6', color: 'white', padding: '6px 14px',
                                    borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer',
                                    boxShadow: '0 2px 8px rgba(59,130,246,0.3)'
                                }}
                            >
                               검색된 {results.length}절 전체 삽입
                            </button>
                        </div>
                    )}
                    {error && (
                        <div style={{ padding: 16, textAlign: 'center', color: '#e53e3e', fontSize: 14 }}>{error}</div>
                    )}
                    {results.length === 0 && query.length >= 2 && !error && (
                        <div style={{ padding: 16, textAlign: 'center', color: '#888', fontSize: 14 }}>검색 결과 없음</div>
                    )}
                    {results.map((v, i) => (
                        <div
                            key={v.id}
                            onClick={() => { onInsert([v]); onClose(); setQuery(''); }}
                            onMouseEnter={() => setSelectedIdx(i)}
                            style={{
                                padding: '12px 18px', cursor: 'pointer',
                                borderBottom: '1px solid #f0f0f0',
                                background: i === selectedIdx ? 'white' : 'transparent',
                                boxShadow: i === selectedIdx ? 'inset 4px 0 0 #3b82f6, 0 2px 8px rgba(0,0,0,0.02)' : 'none',
                                transition: 'all 0.1s',
                            }}
                        >
                            <div style={{ fontWeight: 600, fontSize: 13, color: '#2563eb', marginBottom: 2 }}>
                                {v.book} {v.chapter}:{v.verse}
                            </div>
                            <div style={{ fontSize: 14, color: '#333', lineHeight: 1.5 }}>{v.text}</div>
                        </div>
                    ))}

                    <div style={{
                        padding: '10px 16px', background: '#f5f5f5', fontSize: 11, color: '#888',
                        textAlign: 'center', borderTop: '1px solid #eee', fontWeight: 500
                    }}>
                        ↑↓ 이동 · Enter 개별 삽입 · ⌘+Enter 전체 삽입 · Esc 닫기
                    </div>
                </div>
            </div>
        </div>
    );
}
