import { useState, useEffect } from 'react';
import { Play, Pause, X, Type, ChevronUp, ChevronDown } from 'lucide-react';
import '../styles.css';

interface PresenterModeProps {
    htmlContent: string;
    onClose: () => void;
}

export function PresenterMode({ htmlContent, onClose }: PresenterModeProps) {
    const [isPlaying, setIsPlaying] = useState(false);
    const [speed, setSpeed] = useState(45); // words per minute approx or pixels per second
    const [fontSize, setFontSize] = useState(3.5); // rem
    
    // Auto-scroll logic could go here based on `isPlaying` and `speed`.
    useEffect(() => {
        let interval: ReturnType<typeof setInterval>;
        if (isPlaying) {
            interval = setInterval(() => {
                const scrollable = document.getElementById('presenter-scrollable');
                if (scrollable) {
                    scrollable.scrollBy(0, speed / 20); // arbitrary smooth scrolling speed
                }
            }, 50);
        }
        return () => clearInterval(interval);
    }, [isPlaying, speed]);

    return (
        <div className="presenter-container">
            {/* Outline Jump Navigator (Subtle Left Rail) */}
            <div className="presenter-outline">
                <button title="주제 (Theme)"><div className="dot blue"></div></button>
                <div className="line"></div>
                <button title="1. 도입"><div className="dot"></div></button>
                <div className="line"></div>
                <button title="2. 말씀"><div className="dot"></div></button>
                <div className="line"></div>
                <button title="3. 적용"><div className="dot"></div></button>
            </div>

            {/* Reading Area */}
            <div className="presenter-scrollable" id="presenter-scrollable">
                <div 
                    className="presenter-content" 
                    style={{ fontSize: `${fontSize}rem` }}
                    dangerouslySetInnerHTML={{ __html: htmlContent || '<h1>설교 문서가 비어 있습니다.</h1><p>에디터에서 내용을 작성해주세요.</p>' }}
                />
            </div>

            {/* Floating Control Bar */}
            <div className={`presenter-controls ${isPlaying ? 'playing' : ''}`}>
                <button className="ctrl-pb" onClick={() => setIsPlaying(!isPlaying)}>
                    {isPlaying ? <Pause size={24} color="#000" /> : <Play size={24} color="#000" fill="#000" />}
                </button>
                
                <div className="ctrl-speed">
                    <span>거북이</span>
                    <input 
                        type="range" 
                        min="10" max="100" 
                        value={speed} onChange={e => setSpeed(Number(e.target.value))} 
                        className="speed-slider"
                    />
                    <span>토끼</span>
                </div>

                <div className="ctrl-font">
                    <button onClick={() => setFontSize(f => Math.max(2, f - 0.5))}><ChevronDown size={14}/></button>
                    <Type size={18} />
                    <button onClick={() => setFontSize(f => Math.min(8, f + 0.5))}><ChevronUp size={14}/></button>
                </div>

                <button className="ctrl-close" onClick={onClose}><X size={20} /></button>
            </div>
        </div>
    );
}
