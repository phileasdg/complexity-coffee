(function() {
  // Hide the body immediately to prevent flash of content (FOUC) while verifying
  const style = document.createElement('style');
  style.id = 'auth-hide-body';
  style.innerHTML = 'body { display: none !important; }';
  document.head.appendChild(style);

  // Helper to compute SHA-256
  async function sha256(string) {
    const utf8 = new TextEncoder().encode(string);
    const hashBuffer = await crypto.subtle.digest('SHA-256', utf8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  document.addEventListener('DOMContentLoaded', async () => {
    // Determine the presentation folder ID from pathname
    const pathParts = window.location.pathname.split('/').filter(Boolean);
    const presentationsIndex = pathParts.indexOf('presentations');
    const presentationId = presentationsIndex !== -1 ? pathParts[presentationsIndex + 1] : pathParts[pathParts.length - 2];

    let hubHash = "9fff2d310ad659f6e05c6c1bbfcfb605cd4489e1d3860160b88220636a6353f8"; // Fallback 'complexity'
    let presentationHash = null; // Specific presentation password (optional)
    let pTitle = "Protected Presentation";

    try {
      const response = await fetch('../data/presentations.json');
      if (response.ok) {
        const data = await response.json();
        hubHash = data.hubPasswordHash || hubHash;
        const pConfig = data.presentations.find(p => p.id === presentationId);
        if (pConfig) {
          presentationHash = pConfig.passwordHash || null;
          pTitle = pConfig.title || pTitle;
        }
      }
    } catch (e) {
      console.error("Failed to load presentations config", e);
    }

    // Check if authenticated via General Hub password OR the Presentation-specific password
    const hasHubAuth = sessionStorage.getItem('cc_auth_hub') === hubHash;
    const hasPresentationAuth = presentationHash && (sessionStorage.getItem('cc_auth_' + presentationId) === presentationHash);

    if (hasHubAuth || hasPresentationAuth) {
      revealBody();
      return;
    }

    // Show the login prompt overlay
    showAuthOverlay(presentationId, hubHash, presentationHash, pTitle);
  });

  function revealBody() {
    const hideStyle = document.getElementById('auth-hide-body');
    if (hideStyle) hideStyle.remove();
  }

  function showAuthOverlay(presentationId, hubHash, presentationHash, pTitle) {
    const overlay = document.createElement('div');
    overlay.id = 'auth-overlay';
    
    Object.assign(overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      width: '100vw',
      height: '100vh',
      backgroundColor: '#ecebe6',
      zIndex: '999999',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Inter, sans-serif',
      padding: '20px',
      boxSizing: 'border-box'
    });

    overlay.innerHTML = `
      <div style="width: 100%; max-width: 420px; background: rgba(255, 255, 255, 0.7); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px); border: 1px solid rgba(255, 255, 255, 0.4); border-radius: 16px; box-shadow: 0 10px 25px rgba(0,0,0,0.05); padding: 40px; box-sizing: border-box; text-align: center;">
        <div style="margin-bottom: 24px;">
          <h1 style="font-family: 'Playfair Display', serif; font-size: 28px; font-weight: 900; color: #003d5b; margin: 0 0 8px 0;">Complexity Coffee</h1>
          <p style="font-size: 14px; color: #666; margin: 0;">${pTitle}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <svg style="width: 48px; height: 48px; margin: 0 auto 16px auto; color: rgba(0, 169, 183, 0.7);" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
          </svg>
          <h2 style="font-size: 18px; font-weight: 700; color: #333; margin: 0 0 4px 0;">Enter Password</h2>
          <p style="font-size: 13px; color: #888; margin: 0;">Please enter the password to view these slides.</p>
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          <input type="text" id="auth-password-input" placeholder="Password" autocomplete="off" style="-webkit-text-security: disc; text-security: disc; width: 100%; padding: 12px; font-size: 14px; border: 1px solid #ccc; border-radius: 8px; box-sizing: border-box; outline: none; transition: border-color 0.2s; height: 44px; text-align: center;" />
          <button id="auth-unlock-btn" style="width: 100%; height: 44px; background: #003d5b; color: white; border: none; border-radius: 8px; font-weight: 700; font-size: 14px; cursor: pointer; transition: background 0.2s; outline: none;">Unlock Slides</button>
          <p id="auth-error-msg" style="color: #ef4444; font-size: 13px; margin: 4px 0 0 0; display: none;">Incorrect password. Please try again.</p>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    const input = document.getElementById('auth-password-input');
    const button = document.getElementById('auth-unlock-btn');
    const errorMsg = document.getElementById('auth-error-msg');

    input.addEventListener('focus', () => { input.style.borderColor = '#00a9b7'; });
    input.addEventListener('blur', () => { input.style.borderColor = '#ccc'; });
    button.addEventListener('mouseover', () => { button.style.background = '#00a9b7'; });
    button.addEventListener('mouseout', () => { button.style.background = '#003d5b'; });

    async function handleUnlock() {
      const password = input.value;
      const hashedInput = await sha256(password);
      
      if (hashedInput === hubHash) {
        // Authenticated via General Hub password (grants global access)
        sessionStorage.setItem('cc_auth_hub', hubHash);
        overlay.remove();
        revealBody();
      } else if (presentationHash && hashedInput === presentationHash) {
        // Authenticated via specific Presentation password
        sessionStorage.setItem('cc_auth_' + presentationId, presentationHash);
        overlay.remove();
        revealBody();
      } else {
        errorMsg.style.display = 'block';
        input.value = '';
      }
    }

    button.addEventListener('click', handleUnlock);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        handleUnlock();
      }
    });

    // Make body visible for the overlay to render
    revealBody();
  }
})();
