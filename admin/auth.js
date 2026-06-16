(function() {
    // 1. Hide the body immediately to prevent a flash of protected content
    const style = document.createElement('style');
    style.id = 'auth-hide-body';
    style.innerHTML = 'body { display: none !important; }';
    (document.head || document.documentElement).appendChild(style);

    // Helpers to toggle layout access
    function grantAccess() {
        const bodies = document.querySelectorAll('body.admin-body');
        bodies.forEach(b => b.style.setProperty('display', 'flex', 'important'));
        
        const styleEl = document.getElementById('auth-hide-body');
        if (styleEl) styleEl.remove();
    }

    function denyAccess() {
        sessionStorage.removeItem('_admin_token');
        sessionStorage.removeItem('admin_logged_in'); // Cleanup old legacy token
        window.location.href = 'login.html';
    }

    // 2. Perform authentication status check with token validation
    function checkAuth() {
        try {
            // Support legacy logged in check briefly but enforce new token if used
            const tokenStr = sessionStorage.getItem('_admin_token');
            if (!tokenStr) {
                return denyAccess();
            }

            const token = JSON.parse(atob(tokenStr));
            if (token.auth === true && token.role === 'admin' && token.expiry > Date.now()) {
                grantAccess();
            } else {
                denyAccess();
            }
        } catch(e) {
            denyAccess();
        }
    }

    // Run auth check when DOM is ready so we can access the body element
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkAuth);
    } else {
        checkAuth();
    }

    // 3. Periodically enforce security every 5 seconds to prevent tampering
    setInterval(checkAuth, 5000);

    // 4. Expose verification for other scripts (e.g. before saving data)
    window._verifyAuth = function() {
        try {
            const tokenStr = sessionStorage.getItem('_admin_token');
            if (!tokenStr) return false;
            const token = JSON.parse(atob(tokenStr));
            return token.auth === true && token.role === 'admin' && token.expiry > Date.now();
        } catch(e) {
            return false;
        }
    };
})();
