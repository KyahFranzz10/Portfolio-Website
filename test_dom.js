
const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync('admin/index.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', resources: 'usable' });
const scriptContent = fs.readFileSync('admin/admin-shared.js', 'utf8');
const scriptEl = dom.window.document.createElement('script');
scriptEl.textContent = scriptContent;
dom.window.document.body.appendChild(scriptEl);

dom.window.document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded fired');
    setTimeout(() => {
        console.log('Timeout reached. Checking DOM...');
        console.log('Header:', !!dom.window.document.querySelector('.admin-header'));
        console.log('Sidebar:', !!dom.window.document.querySelector('.admin-sidebar'));
    }, 1000);
});

