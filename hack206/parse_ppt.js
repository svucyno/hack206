const fs = require('fs');
const path = require('path');
const dir = 'F:/Crisis -AI/temp_ppt_extraction/ppt/slides';

try {
    const slides = fs.readdirSync(dir).filter(f => f.startsWith('slide') && f.endsWith('.xml'));
    let output = '';
    slides.forEach(s => {
        const c = fs.readFileSync(path.join(dir, s), 'utf8');
        const matches = [...c.matchAll(/<a:t.*?>(.*?)<\/a:t>/g)].map(m => m[1]);
        if (matches.length) {
            output += `\n--- ${s} ---\n`;
            output += matches.join(' ') + '\n';
        }
    });
    fs.writeFileSync('F:/Crisis -AI/ppt_text.txt', output);
    console.log('Text extracted to F:/Crisis -AI/ppt_text.txt');
} catch (e) {
    console.error(e);
}
