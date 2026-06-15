
const { JSDOM } = require('jsdom');
const fs = require('fs');
const html = fs.readFileSync('admin/index.html', 'utf8');
const dom = new JSDOM(html, { runScripts: 'dangerously', url: 'http://localhost' });
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
        if (!dom.window.document.querySelector('.admin-header')) {
            console.log('admin-header-placeholder outerHTML:', dom.window.document.getElementById('admin-header-placeholder') ? dom.window.document.getElementById('admin-header-placeholder').outerHTML : 'null');
        }
    }, 1000);
});

