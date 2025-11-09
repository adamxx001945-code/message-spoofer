const STORAGE_KEY = 'discordMessageSpoofs';

let spoofMap = {};
let observer = null;

// Load spoofs from storage
const loadSpoofs = () => {
    try {
        const stored = vendetta.storage.get(STORAGE_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch (err) {
        console.warn('[MessageSpoofer] Failed to parse stored spoof data', err);
        return {};
    }
};

const saveSpoofs = (map) => {
    vendetta.storage.set(STORAGE_KEY, JSON.stringify(map));
};

// Message spoofing functions
function spoofMessage(messageId, replacementText, record = true) {
    const target = document.getElementById(`message-content-${messageId}`);
    if (!target) {
        return { success: false, message: 'Message element not found. Make sure the message is visible.' };
    }

    if (!target.dataset.originalHtml) {
        target.dataset.originalHtml = target.innerHTML;
    }
    target.textContent = replacementText ?? '';

    if (record) {
        spoofMap[messageId] = replacementText ?? '';
        saveSpoofs(spoofMap);
    }

    return { success: true, message: 'Message content replaced (client-side only).' };
}

function restoreMessage(messageId, forget = true) {
    const target = document.getElementById(`message-content-${messageId}`);
    if (!target) {
        if (forget) {
            delete spoofMap[messageId];
            saveSpoofs(spoofMap);
            return { success: true, message: 'Stored spoof removed.' };
        }
        return { success: false, message: 'Cannot find that message anymore.' };
    }

    if (target.dataset.originalHtml) {
        target.innerHTML = target.dataset.originalHtml;
        delete target.dataset.originalHtml;
    }

    if (forget) {
        delete spoofMap[messageId];
        saveSpoofs(spoofMap);
    }

    return { success: true, message: 'Message restored to original text.' };
}

function applyStoredSpoofsToNode(node) {
    if (!node || !node.id) return;
    const match = node.id.match(/^message-content-(\d+)$/);
    if (!match) return;
    const messageId = match[1];
    if (spoofMap.hasOwnProperty(messageId)) {
        spoofMessage(messageId, spoofMap[messageId], false);
    }
}

function applyAllSpoofs() {
    Object.keys(spoofMap).forEach((id) => {
        const target = document.getElementById(`message-content-${id}`);
        if (target) {
            spoofMessage(id, spoofMap[id], false);
        }
    });
}

function setupObservers() {
    const obs = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType !== Node.ELEMENT_NODE) return;

                applyStoredSpoofsToNode(node);

                node.querySelectorAll?.('[id^="message-content-"]').forEach((el) => {
                    applyStoredSpoofsToNode(el);
                });
            });
        }
    });

    obs.observe(document.body, {
        childList: true,
        subtree: true,
    });

    return obs;
}

export default {
    onLoad: () => {
        spoofMap = loadSpoofs();
        observer = setupObservers();
        
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            applyAllSpoofs();
        } else {
            document.addEventListener('DOMContentLoaded', applyAllSpoofs, { once: true });
        }

        console.log('[MessageSpoofer] Plugin loaded');
    },

    onUnload: () => {
        if (observer) {
            observer.disconnect();
        }

        Object.keys(spoofMap).forEach((id) => {
            restoreMessage(id, false);
        });

        console.log('[MessageSpoofer] Plugin unloaded');
    },

    settings: {
        MessageSpooferSettings: () => {
            const { React } = vendetta.metro.common;
            const [messageId, setMessageId] = React.useState('');
            const [replacementText, setReplacementText] = React.useState('');
            const [status, setStatus] = React.useState('');

            const handleApply = () => {
                if (!messageId.trim()) {
                    setStatus('❌ Please supply a message ID.');
                    return;
                }
                const result = spoofMessage(messageId.trim(), replacementText);
                setStatus(result.success ? `✅ ${result.message}` : `❌ ${result.message}`);
            };

            const handleReset = () => {
                if (!messageId.trim()) {
                    setStatus('❌ Need a message ID to reset.');
                    return;
                }
                const result = restoreMessage(messageId.trim());
                setStatus(result.success ? `✅ ${result.message}` : `❌ ${result.message}`);
            };

            return React.createElement('div', { style: { padding: '16px' } },
                React.createElement('h2', { style: { marginBottom: '12px', fontSize: '18px', fontWeight: '600' } }, 'Message Spoofer'),
                
                React.createElement('label', { style: { display: 'block', marginBottom: '6px', fontSize: '12px', textTransform: 'uppercase' } }, 'Message ID'),
                React.createElement('input', {
                    type: 'text',
                    placeholder: '1234567890123456789',
                    value: messageId,
                    onChange: (e) => setMessageId(e.target.value),
                    style: { width: '100%', marginBottom: '10px', padding: '10px', borderRadius: '8px' }
                }),

                React.createElement('label', { style: { display: 'block', marginBottom: '6px', fontSize: '12px', textTransform: 'uppercase' } }, 'Replacement Text'),
                React.createElement('textarea', {
                    placeholder: 'What should the message show?',
                    value: replacementText,
                    onChange: (e) => setReplacementText(e.target.value),
                    style: { width: '100%', marginBottom: '10px', padding: '10px', borderRadius: '8px', minHeight: '96px' }
                }),

                React.createElement('div', { style: { display: 'flex', gap: '8px', marginBottom: '10px' } },
                    React.createElement('button', {
                        onClick: handleApply,
                        style: { flex: 1, padding: '10px', borderRadius: '8px', background: '#5865f2', color: '#fff', border: 'none', cursor: 'pointer' }
                    }, 'Apply'),
                    React.createElement('button', {
                        onClick: handleReset,
                        style: { flex: 1, padding: '10px', borderRadius: '8px', background: '#d83c3e', color: '#fff', border: 'none', cursor: 'pointer' }
                    }, 'Reset')
                ),

                status && React.createElement('div', { style: { marginTop: '10px', fontSize: '12px' } }, status)
            );
        }
    }
};
