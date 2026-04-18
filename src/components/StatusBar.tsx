interface StatusBarProps {
    fileName: string;
    isModified: boolean;
    charCount: number;
    paragraphCount: number;
}

export function StatusBar({ fileName, isModified, charCount, paragraphCount }: StatusBarProps) {
    return (
        <div className="statusbar">
            <div className="statusbar-group">
                <span>{fileName}{isModified ? ' •' : ''}</span>
            </div>
            <div className="statusbar-group">
                <span>{paragraphCount} 문단</span>
                <span>{charCount.toLocaleString()} 자</span>
                <span>맘편한설교노트 v0.1.0</span>
            </div>
        </div>
    );
}
