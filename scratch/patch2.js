const fs = require('fs');
let content = fs.readFileSync('scratch/rhwp/rhwp-studio/src/ui/toolbar.ts', 'utf8');
content = content.replace(/this\.dispatcher\.execute\(/g, 'this.dispatcher.dispatch(');
content = content.replace(/private styleName\?:/g, 'private styleName!:');
content = content.replace(/private fontName\?:/g, 'private fontName!:');
content = content.replace(/private fontSize\?:/g, 'private fontSize!:');
fs.writeFileSync('scratch/rhwp/rhwp-studio/src/ui/toolbar.ts', content);
