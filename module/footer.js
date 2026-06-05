(function() {
    const copyrightYearEl = document.querySelector('.footer-bottom p');
    if (copyrightYearEl) {
        const currentYear = new Date().getFullYear();
        copyrightYearEl.innerHTML = `&copy; ${currentYear} Jhon Francis Garapan. All Rights Reserved.`;
    }
})();
