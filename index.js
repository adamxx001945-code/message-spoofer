let spoofMap = {};
let observer = null;
let panelOpen = false;

function createPanel() {
    const panel = document.createElement('div');
    panel.id = 'spoofer-panel';
    panel.style.cssText = `
        position: fixed;
        top: 60px;
        right: 20px;
        width: 300px;
        background: rgba(32, 34, 37, 0.98);
        border-radius: 12px;
        padding: 16px;
        z-index: 999999;
        display: none;
        box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        color: white;
        font-family: sans-serif;
    `;
    
    panel.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
            <h3 style="margin: 0; font-size: 16px;">Message Spoofer</h3>
            <button id="close-panel" style="background: none; border: none; color: white; font-size: 20px; cursor: pointer;">×</button>
        </div>
        <input id="msg-id" type="text" placeholder="Message ID" style="width: 100%; padding: 8px; margin-bottom: 8px; border-radius: 6px; border: none; background: rgba(0,0,0,0.3); color: white; box-sizing: border-box;">
        <textarea id="msg-text" placeholder="Replacement text" style="width: 100%; padding: 8px; margin-bottom: 8px; border-radius: 6px; border: none; background: rgba(0,0,0,0.3); color: white; min-height: 80px; box-sizing: border-box; resize: vertical;"></textarea>
        <div style="display: flex; gap: 8px; margin-bottom: 8px;">
            <button id="apply-btn" style="flex: 1; padding: 10px; border: none; border-radius: 6px; background: #5865f2; color: white; font-weight: bold; cursor: pointer;">Apply</button>
            <button id="restore-btn" style="flex: 1; padding: 10px; border: none; border-radius: 6px; background: #d83c3e; color: white; font-weight: bold; cursor: pointer;">Restore</button>
        </div>
        <div id="status" style="font-size: 12px; color: #43b581; min-height: 16px;"></div>
    `;
    
    document.body.appendChild(panel);
    
    document.getElementById('close-panel').onclick = () => {
        panel.style.display = 'none';
        panelOpen = false;
    };
    
    document.getElementById('apply-btn').onclick = () => {
        const id = document.getElementById('msg-id').value.trim();
        const text = document.getElementById('msg-text').value;
        const status = document.getElementById('status');
        
        if (!id) {
            status.style.color = '#f04747';
            status.textContent = 'Please enter a message ID';
            return;
        }
        
        const el = document.getElementById(`message-content-${id}`);
        if (!el) {
            status.style.color = '#f04747';
            status.textContent = 'Message not found. Make sure it\'s visible.';
            return;
        }
        
        if (!el.dataset.original) {
            el.dataset.original = el.innerHTML;
        }
        el.textContent = text;
        spoofMap[id] = text;
        vendetta.storage.set('discordMessageSpoofs', JSON.stringify(spoofMap));
        
        status.style.color = '#43b581';
        status.textContent = 'Message spoofed successfully!';
    };
    
    document.getElementById('restore-btn').onclick = () => {
        const id = document.getElementById('msg-id').value.trim();
        const status = document.getElementById('status');
        
        if (!id) {
            status.style.color = '#f04747';
            status.textContent = 'Please enter a message ID';
            return;
        }
        
        const el = document.getElementById(`message-content-${id}`);
        if (el && el.dataset.original) {
            el.innerHTML = el.dataset.original;
            delete el.dataset.original;
        }
        
        delete spoofMap[id];
        vendetta.storage.set('discordMessageSpoofs', JSON.stringify(spoofMap));
        
        status.style.color = '#43b581';
        status.textContent = 'Message restored!';
    };
    
    return panel;
}

function createFloatingButton() {
    const btn = document.createElement('button');
    btn.id = 'spoofer-btn';
    btn.textContent = '🎭';
    btn.style.cssText = `
        position: fixed;
        bottom: 80px;
        right: 20px;
        width: 50px;
        height: 50px;
        border-radius: 50%;
        background: #5865f2;
        border: none;
        font-size: 24px;
        cursor: pointer;
        z-index: 999998;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
    `;
    
    btn.onclick = () => {
        const panel = document.getElementById('spoofer-panel');
        if (panel) {
            panel.style.display = panelOpen ? 'none' : 'block';
            panelOpen = !panelOpen;
        }
    };
    
    document.body.appendChild(btn);
}

export default {
    onLoad() {
        console.log("Message Spoofer loaded!");
        
        // Load saved spoofs
        try {
            const stored = vendetta.storage.get('discordMessageSpoofs');
            if (stored) {
                spoofMap = JSON.parse(stored);
            }
        } catch (e) {
            console.error("Failed to load spoofs:", e);
        }
        
        // Create UI
        setTimeout(() => {
            createPanel();
            createFloatingButton();
        }, 1000);
        
        // Apply saved spoofs
        const applyAllSpoofs = () => {
            Object.keys(spoofMap).forEach(id => {
                const el = document.getElementById(`message-content-${id}`);
                if (el && el.textContent !== spoofMap[id]) {
                    if (!el.dataset.original) {
                        el.dataset.original = el.innerHTML;
                    }
                    el.textContent = spoofMap[id];
                }
            });
        };
        
        // Initial apply
        setTimeout(applyAllSpoofs, 1500);
        
        // Watch for new messages
        observer = new MutationObserver(applyAllSpoofs);
        observer.observe(document.body, { childList: true, subtree: true });
    },
    
    onUnload() {
        if (observer) {
            observer.disconnect();
        }
        
        const panel = document.getElementById('spoofer-panel');
        const btn = document.getElementById('spoofer-btn');
        if (panel) panel.remove();
        if (btn) btn.remove();
        
        console.log("Message Spoofer unloaded");
    }
};
