
const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync('admin/index.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost', resources: 'usable' });
const scriptContent = fs.readFileSync('admin/admin-shared.js', 'utf8');
const scriptEl = dom.window.document.createElement('script');
scriptEl.textContent = scriptContent;

const cssContent = fs.readFileSync('admin/admin-shared.css', 'utf8');
const styleEl = dom.window.document.createElement('style');
styleEl.textContent = cssContent;
dom.window.document.head.appendChild(styleEl);

dom.window.document.body.appendChild(scriptEl);

dom.window.document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const header = dom.window.document.querySelector('.admin-header');
        const sidebar = dom.window.document.querySelector('.admin-sidebar');
        if(header) {
            console.log('Header classes:', header.className);
            const computedStyle = dom.window.getComputedStyle(header);
            console.log('Header display:', computedStyle.display);
            console.log('Header position:', computedStyle.position);
            console.log('Header left:', computedStyle.left);
        }
        if(sidebar) {
            console.log('Sidebar classes:', sidebar.className);
            const computedStyle = dom.window.getComputedStyle(sidebar);
            console.log('Sidebar display:', computedStyle.display);
            console.log('Sidebar position:', computedStyle.position);
            console.log('Sidebar left:', computedStyle.left);
        }
    }, 1000);
});

