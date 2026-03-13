// Archivo: src/main.ts
import './styles.css';

Hooks.once('init', () => {
    console.log('Strata Weaver Bridge | Initializing...');
    loadTemplates(['modules/strata-weaver-foundry-bridge/dist/templates/daily-log.hbs']);
});

// Hook nativo específico del chat
Hooks.on('renderChatLog', (app: any, html: any, data: any) => {
    const htmlElement = html.length !== undefined ? html[0] : html;
    injectControlPanel(htmlElement);
});

// Hook de seguridad cuando todo está cargado
Hooks.once('ready', () => {
    console.log('Strata Weaver Bridge | Foundry is ready. Setting up persistent observer...');
    setupPersistentObserver();
});

function setupPersistentObserver() {
    const observer = new MutationObserver((mutations) => {
        const chatTab = document.querySelector('#chat');
        if (!chatTab) return;

        const existingPanel = chatTab.querySelector('.sw-control-panel');
        if (!existingPanel) {
            injectControlPanel(chatTab as HTMLElement);
        }
    });

    observer.observe(document.body, { childList: true, subtree: true });
}

function injectControlPanel(chatElement: HTMLElement) {
    if (chatElement.querySelector('.sw-control-panel')) return;

    const chatControls = chatElement.querySelector('#chat-controls');
    if (!chatControls) {
        console.warn('Strata Weaver Bridge | Could not find #chat-controls to anchor the panel.');
        return;
    }

    const panel = document.createElement('div');
    panel.className = 'sw-control-panel';
    
    panel.innerHTML = `
        <div class="sw-panel-header">
            <img src="modules/strata-weaver-foundry-bridge/dist/assets/sw-icon/icon.png" alt="SW" class="sw-panel-logo" />
            <span class="sw-panel-title">Strata Weaver</span>
        </div>
        <div class="sw-panel-buttons">
            <button id="sw-btn-export" class="sw-panel-btn" title="Export Scene & Journals for Strata Weaver">
                <i class="fas fa-map-marked-alt"></i> Export
            </button>
            <button id="sw-btn-log" class="sw-panel-btn" title="Paste Daily Log from Clipboard">
                <i class="fas fa-cloud-sun"></i> Daily Log
            </button>
        </div>
    `;

    // Lógica del botón "Daily Log"
    const btnLog = panel.querySelector('#sw-btn-log');
    btnLog?.addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            const text = await navigator.clipboard.readText();
            processClipboardData(text);
        } catch (err) {
            new Dialog({
                title: "Paste Strata Weaver Data",
                content: `<textarea id="sw-paste-area" style="width:100%; height:200px; background: rgba(0,0,0,0.1); color: inherit; border: 1px solid rgba(255,255,255,0.2); padding: 8px; font-family: monospace;" placeholder="Paste JSON here..."></textarea>`,
                buttons: {
                    post: {
                        icon: '<i class="fas fa-check"></i>',
                        label: "Post to Chat",
                        callback: (dialogHtml: any) => {
                            const element = dialogHtml.length !== undefined ? dialogHtml[0] : dialogHtml;
                            const textArea = element.querySelector('#sw-paste-area') as HTMLTextAreaElement;
                            const val = textArea?.value || "";
                            processClipboardData(val);
                        }
                    }
                },
                default: "post"
            }).render(true);
        }
    });

    // Lógica del botón "Export Landmarks" (MODIFICADO PARA EXPORTACIÓN ÚNICA)
    const btnExport = panel.querySelector('#sw-btn-export');
    btnExport?.addEventListener('click', (e) => {
        e.preventDefault();
        
        // @ts-ignore
        if (!canvas || !canvas.scene) {
            // @ts-ignore
            ui.notifications?.warn("Strata Weaver | No active scene found. Please view a scene first.");
            return;
        }

        // @ts-ignore
        const scene = canvas.scene;
        const notes = scene.notes;

        if (notes.size === 0) {
            // @ts-ignore
            ui.notifications?.warn("Strata Weaver | No Map Notes found in this scene.");
            return;
        }

        // 1. Recopilar IDs únicos de los diarios vinculados a los pines
        const journalIds = new Set<string>();
        notes.forEach((note: any) => {
            if (note.entryId) journalIds.add(note.entryId);
        });

        // 2. Obtener los objetos JournalEntry
        const journals: any[] = [];
        journalIds.forEach(id => {
            // @ts-ignore
            const journal = game.journal?.get(id);
            if (journal) journals.push(journal.toObject());
        });

        // 3. Construir el paquete único
        const exportPackage = {
            type: "StrataWeaverExport",
            version: "1.0",
            scene: scene.toObject(),
            journals: journals
        };

        // @ts-ignore
        ui.notifications?.info(`Strata Weaver | Exporting Scene and ${journals.length} Journal(s) as a single package...`);

        // 4. Descargar el archivo único
        const safeSceneName = scene.name.replace(/[^a-zA-Z0-9]/g, '_');
        const filename = `sw-export-${safeSceneName}.json`;
        
        // @ts-ignore
        saveDataToFile(JSON.stringify(exportPackage, null, 2), "application/json", filename);
    });

    chatControls.parentNode?.insertBefore(panel, chatControls);
    console.log('Strata Weaver Bridge | Control Panel injected successfully above chat controls!');
}

async function processClipboardData(rawText: string) {
    try {
        const data = JSON.parse(rawText);
        
        if (data.source !== "strata-weaver") {
            // @ts-ignore
            ui.notifications?.warn("Clipboard data is not from Strata Weaver.");
            return;
        }

        const content = await renderTemplate('modules/strata-weaver-foundry-bridge/dist/templates/daily-log.hbs', data);

        // @ts-ignore
        ChatMessage.create({
            content: content,
            speaker: { alias: "Strata Weaver" }
        });

        // @ts-ignore
        ui.notifications?.info("Strata Weaver log posted!");

    } catch (e) {
        console.error("Strata Weaver Bridge Error:", e);
        // @ts-ignore
        ui.notifications?.error("Failed to parse Strata Weaver data. Make sure you copied it correctly.");
    }
}