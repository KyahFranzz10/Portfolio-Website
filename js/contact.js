// Custom Toast Notification
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.position = 'fixed';
        container.style.bottom = '25px';
        container.style.right = '25px';
        container.style.zIndex = '99999';
        container.style.display = 'flex';
        container.style.flexDirection = 'column';
        container.style.gap = '12px';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.style.background = type === 'success' ? 'var(--secondary-color, #10b981)' : '#ef4444';
    toast.style.color = '#ffffff';
    toast.style.padding = '16px 24px';
    toast.style.borderRadius = '12px';
    toast.style.boxShadow = '0 10px 25px rgba(0,0,0,0.2)';
    toast.style.fontFamily = "'Outfit', sans-serif";
    toast.style.fontSize = '1.05rem';
    toast.style.fontWeight = '500';
    toast.style.display = 'flex';
    toast.style.alignItems = 'center';
    toast.style.gap = '12px';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(30px) scale(0.95)';
    toast.style.transition = 'all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

    const icon = document.createElement('i');
    icon.className = type === 'success' ? 'fas fa-check-circle' : 'fas fa-exclamation-circle';
    icon.style.fontSize = '1.25rem';
    
    toast.appendChild(icon);
    toast.appendChild(document.createTextNode(message));
    container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        setTimeout(() => {
            toast.style.opacity = '1';
            toast.style.transform = 'translateY(0) scale(1)';
        }, 10);
    });

    // Remove after 4 seconds
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(15px) scale(0.95)';
        setTimeout(() => {
            if(toast.parentElement) toast.remove();
        }, 400);
    }, 4000);
}

document.addEventListener('DOMContentLoaded', () => {
    const contactForm = document.getElementById('contactForm');
    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btn = contactForm.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
            btn.disabled = true;

            const name = document.getElementById('msg-name').value.trim();
            const email = document.getElementById('msg-email').value.trim();
            const subject = document.getElementById('msg-subject').value.trim();
            const message = document.getElementById('msg-body').value.trim();

            const payload = { name, email, subject, message };

            // 1. Send Email via Web3Forms
            const web3Payload = {
                access_key: "9273bbca-6f36-4610-8795-f1d93cd9e462",
                from_name: "Portfolio Website",
                subject: "New Portfolio Message: " + subject,
                name: name,
                email: email,
                message: message
            };

            try {
                await fetch('https://api.web3forms.com/submit', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    },
                    body: JSON.stringify(web3Payload)
                });
            } catch(e) {
                console.error("Email forwarding failed:", e);
            }

            // Save message to offline storage (no backend server anymore)
            let msgs = [];
            try {
                msgs = JSON.parse(localStorage.getItem('portfolio_messages')) || [];
            } catch(e){}
            payload.timestamp = Date.now();
            msgs.unshift(payload);
            localStorage.setItem('portfolio_messages', JSON.stringify(msgs));
            showToast('Message saved successfully!', 'success');

            btn.innerHTML = originalText;
            btn.disabled = false;
            contactForm.reset();
        });
    }

    if (window.getPortfolioData) {
        window.getPortfolioData().then(data => {
            if (data && data.contact) {
                const emailEl = document.getElementById('contact-page-email');
                const phoneEl = document.getElementById('contact-page-phone');
                const locEl = document.getElementById('contact-page-location');

                if (emailEl && data.contact.email) emailEl.innerText = data.contact.email;
                if (phoneEl && data.contact.phone) phoneEl.innerText = data.contact.phone;
                if (locEl && data.contact.location) locEl.innerText = data.contact.location;
            }
        }).catch(err => console.error("Error loading contact data:", err));
    }
});
