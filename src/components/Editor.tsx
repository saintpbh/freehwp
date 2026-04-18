import { useEffect, useRef, useState } from 'react';

interface EditorProps {
    fileData: Uint8Array | null;
    fileName: string;
}

export function Editor({ fileData, fileName }: EditorProps) {
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
    }, [fileData, fileName, isIframeLoaded]);

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <iframe
                ref={iframeRef}
                className="hwp-studio-frame"
                src="/studio/index.html"
                style={{ flex: 1, width: '100%', border: 'none' }}
                title="HWP Editor"
            />
        </div>
    );
}
