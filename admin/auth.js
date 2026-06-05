(function() {
    if (window.location.protocol !== 'file:') {
        // If served over HTTP/HTTPS, trust the server's session verification
        // and sync client-side sessionStorage
        sessionStorage.setItem('admin_logged_in', 'true');
    } else {
        // Fallback for offline/standalone static file viewing
        if (sessionStorage.getItem('admin_logged_in') !== 'true') {
            window.location.href = 'login.html';
        }
    }
})();
