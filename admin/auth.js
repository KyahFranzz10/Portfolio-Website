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
        const isServerEnv = window.location.protocol !== 'file:';
        if (isServerEnv) {
            try {
                const res = await fetch('/api/check-auth');
                if (res.ok) {
                    const data = await res.json();
                    if (data.authenticated) {
                        grantAccess();
                        return;
                    } else {
                        denyAccess();
                        return;
                    }
                } else if (res.status === 404) {
                    // Endpoint doesn't exist. This is a static web server without the python backend.
                    // Fall back to client-side session verification.
                    console.log("Auth endpoint not found on server. Using client-side fallback.");
                } else {
                    // Other server errors (e.g. 401 Unauthorized or 403 Forbidden)
                    denyAccess();
                    return;
                }
            } catch (e) {
                console.warn("Server auth API is unavailable. Falling back to local session verification.");
            }
        }
        
        // Standalone static / Offline fallback session check
        if (sessionStorage.getItem('admin_logged_in') === 'true') {
            grantAccess();
        } else {
            denyAccess();
        }
    }

    // Run auth check immediately (fetch/localStorage doesn't require DOMContentLoaded)
    checkAuth();
})();

