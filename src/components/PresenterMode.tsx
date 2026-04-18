import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, X, Type, ChevronUp, ChevronDown } from 'lucide-react';
import '../styles.css';

interface PresenterModeProps {
    presenterData?: {
        paragraphs: { index: number, text: string }[];
        outline: any[];
    };
    onClose: () => void;
}

export function PresenterMode({ presenterData, onClose }: PresenterModeProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(() => Number(localStorage.getItem('presenter-speed') || 20));
    const [fontSize, setFontSize] = useState(() => Number(localStorage.getItem('presenter-font') || 3.5));
    const isPlayingRef = useRef(false);
    const isManuallyScrolling = useRef(false);
    const resumeTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const contentWrapperRef = useRef<HTMLDivElement>(null);
    const speedRef = useRef(speed);
    
    const [elapsedTime, setElapsedTime] = useState(0);
    const [estimatedTotal, setEstimatedTotal] = useState(0);

    // Sync refs with state
    useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
    useEffect(() => { speedRef.current = speed; }, [speed]);

    useEffect(() => {
        localStorage.setItem('presenter-speed', speed.toString());
        localStorage.setItem('presenter-font', fontSize.toString());
    }, [speed, fontSize]);

    // Auto-focus container on mount
    useEffect(() => {
        containerRef.current?.focus();
    }, []);

    const fractionalScroll = useRef(0);

    // Single RAF loop that reads from refs (never restarts)
    useEffect(() => {
        let animationFrameId: number;
        let lastTime = performance.now();

        const scrollLoop = (time: number) => {
            const dt = Math.min(time - lastTime, 100); // cap dt to avoid jumps
            lastTime = time;

            if (isPlayingRef.current && !isManuallyScrolling.current && scrollRef.current) {
                const pixels = (speedRef.current * dt) / 1000;
                fractionalScroll.current += pixels;
                
                // 1) Integer scroll for larger steps
                if (fractionalScroll.current >= 1) {
                    const step = Math.floor(fractionalScroll.current);
                    scrollRef.current.scrollBy({ top: step, left: 0, behavior: 'instant' });
                    fractionalScroll.current -= step;
                }

                // 2) GPU-accelerated Sub-pixel correction for ultra-smooth 60fps scrolling
                if (contentWrapperRef.current) {
                    contentWrapperRef.current.style.transform = `translateY(-${fractionalScroll.current}px)`;
                }
            }
            animationFrameId = requestAnimationFrame(scrollLoop);
        };

        animationFrameId = requestAnimationFrame(scrollLoop);
        return () => cancelAnimationFrame(animationFrameId);
    }, []); // Empty deps — loop never restarts, reads from refs

    // Elapsed timer
    useEffect(() => {
        let timer: ReturnType<typeof setInterval>;
        if (isPlaying) {
            timer = setInterval(() => setElapsedTime(p => p + 1), 1000);
        }
        return () => clearInterval(timer);
    }, [isPlaying]);

    // Estimated time
    useEffect(() => {
        const calculateTime = () => {
            if (!scrollRef.current) return;
            const remainingPixels = scrollRef.current.scrollHeight - scrollRef.current.scrollTop - scrollRef.current.clientHeight;
            if (remainingPixels <= 0) {
                setEstimatedTotal(elapsedTime);
                return;
            }
            const secondsLeft = Math.max(0, Math.floor(remainingPixels / speed));
            setEstimatedTotal(elapsedTime + secondsLeft);
        };
        const interval = setInterval(calculateTime, 1000);
        return () => clearInterval(interval);
    }, [speed, elapsedTime]);

    const togglePlay = useCallback(() => {
        setIsPlaying(p => !p);
    }, []);

    // Keyboard handler — attached to container div via onKeyDown
    const handleKeyDown = useCallback((e: React.KeyboardEvent | KeyboardEvent) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            onClose();
        }
        if (e.code === 'Space' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            togglePlay();
        }
    }, [onClose, togglePlay]);

    // Also attach global listener as backup for Tauri WebView
    useEffect(() => {
        const handler = (e: KeyboardEvent) => handleKeyDown(e);
        window.addEventListener('keydown', handler, true);
        return () => window.removeEventListener('keydown', handler, true);
    }, [handleKeyDown]);

    const handleWheel = () => {
        if (!isPlayingRef.current) return;
        isManuallyScrolling.current = true;
        if (resumeTimeout.current) clearTimeout(resumeTimeout.current);
        resumeTimeout.current = setTimeout(() => {
            isManuallyScrolling.current = false;
        }, 3000);
    };

    const jumpToOutline = (text: string) => {
        const elems = document.querySelectorAll('.presenter-para');
        const searchTarget = text.trim();
        for (let i = 0; i < elems.length; i++) {
            if (elems[i].textContent?.includes(searchTarget)) {
                elems[i].scrollIntoView({ behavior: 'smooth', block: 'start' });
                handleWheel();
                return;
            }
        }
    };

    const paragraphs = presenterData?.paragraphs || [];
    const outline = presenterData?.outline || [];

    const formatTime = (sec: number) => {
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <div 
            className="presenter-container" 
            ref={containerRef}
            tabIndex={0}
            onKeyDown={handleKeyDown}
            style={{ outline: 'none' }}
        >
            <div style={{ position: 'absolute', top: 16, left: 24, zIndex: 100, color: 'rgba(255,255,255,0.3)', fontSize: 13, pointerEvents: 'none' }}>
                ESC: 나가기 | Space: 재생/일시정지
            </div>

            <div style={{ position: 'absolute', top: 16, left: 0, right: 0, textAlign: 'center', zIndex: 100, color: 'rgba(255,255,255,0.6)', fontSize: 13.5, pointerEvents: 'none' }}>
                진행: <span style={{color: '#fff', fontWeight: 600}}>{formatTime(elapsedTime)}</span> / 
                예상 종료시간: {formatTime(estimatedTotal)} (남은시간: <span style={{color: '#aaa'}}>{formatTime(Math.max(0, estimatedTotal - elapsedTime))}</span>)
            </div>

            {/* Reading Area */}
            <div 
                className="presenter-scrollable" 
                id="presenter-scrollable" 
                ref={scrollRef}
                onWheel={handleWheel}
                onTouchMove={handleWheel}
            >
                <div className="presenter-content" ref={contentWrapperRef} style={{ fontSize: `${fontSize}rem` }}>
                    {paragraphs.length > 0 ? (
                        paragraphs.map((p, idx) => (
                            p.text.trim() === '' ? <br key={idx} /> : <p key={idx} className="presenter-para" style={{ marginBottom: '1em' }}>{p.text}</p>
                        ))
                    ) : (
                        <><h1>설교 문서가 비어 있거나 로딩 중입니다.</h1><br/><p>만약 계속 로딩중이라면, 에디터 화면으로 돌아가 '저장' 후 다시 시도해보세요.</p></>
                    )}
                </div>
            </div>

            {/* Outline Jump Navigator (Right Rail) */}
            {outline.length > 0 && (
                <div className="presenter-outline-right presenter-outline">
                    {outline.map((item, i) => (
                        <div key={i} className="outline-item" onClick={() => jumpToOutline(item.text)}>
                            <button title={item.text}><div className="dot blue"></div></button>
                            <span className="outline-text">{item.text}</span>
                            {i < outline.length - 1 && <div className="line"></div>}
                        </div>
                    ))}
                </div>
            )}

            {/* Floating Control Bar */}
            <div className={`presenter-controls ${isPlaying ? 'playing' : ''}`}>
                <button className="ctrl-pb" onClick={(e) => { e.currentTarget.blur(); togglePlay(); }}>
                    {isPlaying ? <Pause size={24} color="#000" /> : <Play size={24} color="#000" fill="#000" />}
                </button>
                
                <div className="ctrl-speed">
                    <span>🐢</span>
                    <input 
                        type="range" 
                        min="5" max="50" step="1"
                        value={speed} 
                        onChange={e => { 
                            const v = Number(e.target.value); 
                            setSpeed(v); 
                            speedRef.current = v; 
                        }} 
                        className="speed-slider"
                    />
                    <span>🐇 <span style={{color: '#fff', marginLeft: 4, minWidth: '24px', display: 'inline-block'}}>{speed}</span></span>
                </div>

                <div className="ctrl-font">
                    <button tabIndex={-1} onClick={(e) => { e.currentTarget.blur(); setFontSize(f => Math.max(2, f - 0.5)); }}><ChevronDown size={14}/></button>
                    <Type size={18} />
                    <button tabIndex={-1} onClick={(e) => { e.currentTarget.blur(); setFontSize(f => Math.min(8, f + 0.5)); }}><ChevronUp size={14}/></button>
                </div>

                <button className="ctrl-close" tabIndex={-1} onClick={onClose}><X size={20} /></button>
            </div>
        </div>
    );
}
