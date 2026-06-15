(function() {
    // 1. Hide the body immediately to prevent a flash of protected content
    const style = document.createElement('style');
    style.id = 'auth-hide-body';
    style.innerHTML = 'body { display: none !important; }';
    (document.head || document.documentElement).appendChild(style);

    // Helpers to toggle layout access
    function grantAccess() {
        sessionStorage.setItem('admin_logged_in', 'true');
        // Reveal the body layout by applying flex (reverses the default display: none in css)
        const bodies = document.querySelectorAll('body.admin-body');
        bodies.forEach(b => b.style.setProperty('display', 'flex', 'important'));
        
        const styleEl = document.getElementById('auth-hide-body');
        if (styleEl) styleEl.remove();
    }

    function denyAccess() {
        sessionStorage.removeItem('admin_logged_in');
        window.location.href = 'login.html';
    }

    // 2. Perform authentication status check
    async function checkAuth() {
        // Standalone static / Offline session check
        if (sessionStorage.getItem('admin_logged_in') === 'true') {
            grantAccess();
        } else {
            denyAccess();
        }
    }

    // Run auth check when DOM is ready so we can access the body element
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAuth);
    } else {
        checkAuth();
    }
})();

