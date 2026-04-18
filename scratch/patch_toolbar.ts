// A quick TS script to put back class fields and fix duplicate methods.
import * as fs from 'fs';
const path = 'scratch/rhwp/rhwp-studio/src/ui/toolbar.ts';
let content = fs.readFileSync(path, 'utf8');

// 1. Put back fields
content = content.replace(
  '// Removed styleName, fontName, etc. since they are deprecated in minimal UI\n  private headingBtns: NodeListOf<HTMLButtonElement>;',
  'private headingBtns: NodeListOf<HTMLButtonElement>;\n  private styleName?: HTMLSelectElement;\n  private fontName?: HTMLSelectElement;\n  private fontSize?: HTMLInputElement;'
);

// 2. Safely fix property access errors by using `?.` where possible or putting them back in constructor
content = content.replace(
  "this.headingBtns = document.querySelectorAll('.heading-btn');",
  "this.headingBtns = document.querySelectorAll('.heading-btn');\n    this.styleName = document.getElementById('style-name') as HTMLSelectElement;\n    this.fontName = document.getElementById('font-name') as HTMLSelectElement;\n    this.fontSize = document.getElementById('font-size') as HTMLInputElement;"
);

// 3. Fix duplicate method updateStyleState
// The first occurrence of updateStyleState was left incorrectly. Wait, I inserted it at line 214 and the old one was at line 547.
// Let's remove the one from 547 onwards.
const parts = content.split('private updateStyleState(info: { id: number; name: string }): void {');
if (parts.length > 2) {
  // It exists twice.
  // The second one handles the old this.styleName logic. We can delete it.
  const oldMethodEnd = parts[2].indexOf('  /**') > -1 ? parts[2].indexOf('  /**') : parts[2].indexOf('  private setup');
  if (oldMethodEnd > -1) {
    content = parts[0] + 'private updateStyleState(info: { id: number; name: string }): void {' + parts[1] + parts[2].substring(oldMethodEnd);
  }
}

// Ensure styleName, fontName, fontSize accesses are null-safe since they have string values now,
// or we just cast them as non-null if they exist in legacy UI.
// But we actually need them in legacy UI! Let's just write this modified content.
fs.writeFileSync(path, content, 'utf8');
console.log('Patched toolbar.ts');
