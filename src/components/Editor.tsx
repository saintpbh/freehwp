import { useEffect, useRef, useState } from 'react';

interface EditorProps {
    fileData: Uint8Array | null;
    fileName: string;
    id: string;
    theme?: string;
}

export function Editor({ fileData, fileName, id, theme = 'default' }: EditorProps) {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isIframeLoaded, setIsIframeLoaded] = useState(false);

    useEffect(() => {
        const handleMsg = (e: MessageEvent) => {
            if (e.data?.type === 'rhwp-ready') {
                setIsIframeLoaded(true);
            }
        };
        window.addEventListener('message', handleMsg);
        return () => window.removeEventListener('message', handleMsg);
    }, []);

    useEffect(() => {
        if (isIframeLoaded && iframeRef.current && iframeRef.current.contentWindow) {
            // Document loading happens strictly ONCE per Editor instance upon creation.
            const iframeWindow = iframeRef.current.contentWindow;
            
            if (fileData) {
                iframeWindow.postMessage({
                    type: 'rhwp-request',
                    id: Date.now(),
                    method: 'loadFile',
                    params: {
                        data: Array.from(fileData),
                        fileName: fileName,
                    }
                }, '*');
            } else {
                iframeWindow.postMessage({
                    type: 'rhwp-request',
                    id: Date.now(),
                    method: 'newFile',
                }, '*');
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isIframeLoaded]); // Intentionally not depending on fileData/fileName to avoid reloading.

    let filterStyle = 'none';
    if (theme === 'hacker') filterStyle = 'invert(1) sepia(1) hue-rotate(80deg) saturate(3) brightness(0.8)';
    else if (theme === 'dark') filterStyle = 'invert(0.9) hue-rotate(180deg)';
    else if (theme === 'warm') filterStyle = 'sepia(0.35)';
    else if (theme === 'contrast') filterStyle = 'contrast(1.5) grayscale(1)';

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <iframe
                ref={iframeRef}
                className="hwp-studio-frame"
                src="/studio/index.html"
                style={{ flex: 1, width: '100%', border: 'none', filter: filterStyle, transition: 'filter 0.3s ease' }}
                title="HWP Editor"
                data-id={id}
            />
        </div>
    );
}
