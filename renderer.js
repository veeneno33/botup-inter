// Função para carregar CSS dinamicamente
function loadStylesheet(filename) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = filename;
    document.head.appendChild(link);
}

// Função para redirecionar para outra página
function navigateTo(page) {
    window.location.href = page;
}

// Exporta funções para uso nas páginas
window.loadStylesheet = loadStylesheet;
window.navigateTo = navigateTo;

// Função principal para inicialização da página
window.addEventListener('DOMContentLoaded', async () => {
    // Determina qual página está sendo carregada
    const currentPage = window.location.pathname.split('/').pop();

    if (currentPage === 'index.html') {
        // Carrega o CSS da página inicial
        loadStylesheet('css/index.css');

        // Adiciona funcionalidade ao botão "Iniciar Bot"
        const startBotButton = document.getElementById('startBotButton');
        if (startBotButton) {
            startBotButton.addEventListener('click', async () => {
                try {
                    console.log("Iniciando o bot...");
                    await window.electron.startBot(); // Envia a solicitação para iniciar o bot no main process
                    // Redireciona para a página dashboard após 3 segundos
                    setTimeout(() => {
                        navigateTo('dashboard.html');
                    }, 3000);
                } catch (error) {
                    console.error("Erro ao iniciar o bot:", error);
                    alert("Ocorreu um erro ao iniciar o bot. Verifique o console para mais detalhes.");
                }
            });
        } else {
            console.warn("Botão 'startBotButton' não encontrado.");
        }
    } else if (currentPage === 'config.html') {
        // Carrega o CSS da página de configuração
        loadStylesheet('css/config.css');

        try {
            // Carrega a configuração atual
            const config = await window.electron.getConfig();
            populateConfigForm(config);

            // Adiciona funcionalidade para adicionar/remover cores
            const addColorButton = document.getElementById('addColorButton');
            if (addColorButton) {
                addColorButton.addEventListener('click', () => {
                    addEmbedColorField('#FFFFFF');
                });
            } else {
                console.warn("Botão 'addColorButton' não encontrado.");
            }

            // Adiciona funcionalidade para adicionar/remover tokens
            const addTokenButton = document.getElementById('addTokenButton');
            if (addTokenButton) {
                addTokenButton.addEventListener('click', () => {
                    addTokenField('');
                });
            } else {
                console.warn("Botão 'addTokenButton' não encontrado.");
            }

            // Salva as configurações
            const saveConfigButton = document.getElementById('saveConfigButton');
            if (saveConfigButton) {
                saveConfigButton.addEventListener('click', async () => {
                    const newConfig = getConfigFromForm();
                    await window.electron.updateConfig(newConfig);
                    alert('Configurações salvas!');
                });
            } else {
                console.warn("Botão 'saveConfigButton' não encontrado.");
            }
        } catch (error) {
            console.error('Erro ao carregar ou processar a configuração:', error);
            alert('Ocorreu um erro ao carregar as configurações. Verifique o console para mais detalhes.');
        }
    } else if (currentPage === 'dashboard.html') {
        // Carrega o CSS da página do painel
        loadStylesheet('css/dashboard.css');

    try {
        // Chama a função para obter os arquivos via IPC
        const files = await window.electron.getFiles();

        const fileCardsContainer = document.getElementById('fileCardsContainer');
        fileCardsContainer.innerHTML = ''; // Limpa o container

        if (files.length === 0) {
            fileCardsContainer.innerHTML = '<p>Nenhuma pasta disponível.</p>';
            return;
        }

        // Renderiza os cards
        files.forEach(file => {
            const card = document.createElement('div');
            card.classList.add('file-card');

            card.innerHTML = `
                <h3>${file.folderName}</h3>
                <p><strong>Nome do Arquivo:</strong> ${file.fileName}</p>
                <p><strong>Data de Upload:</strong> ${new Date(file.uploadDate).toLocaleDateString()}</p>
                <p><strong>Tamanho:</strong> ${file.fileSize}</p>
                <div class="actions">
                    <button class="action-button">Download</button>
                    <button class="action-button">Compartilhar</button>
                    <button class="action-button">Deletar</button>
                </div>
          `;

            fileCardsContainer.appendChild(card);
        });
    } catch (error) {
        console.error('Erro ao carregar arquivos:', error);
        alert('Ocorreu um erro ao carregar os arquivos. Verifique o console para mais detalhes.');
    }
}
});

// Preenche o formulário com os valores da configuração atual
function populateConfigForm(config) {
    const fields = [
        { id: 'clientId', value: config.clientId || '' },
        { id: 'guildId', value: config.guildId || '' },
        { id: 'progressChannelId', value: config.progressChannelId || '' },
        { id: 'MAX_RAM_USAGE', value: config.MAX_RAM_USAGE || '' },
        { id: 'UPLOAD_DELAY', value: config.UPLOAD_DELAY || '' },
        { id: 'MAX_DL', value: config.MAX_DL || '' },
        { id: 'CHUNK_SIZE', value: config.CHUNK_SIZE || '' },
    ];
    fields.forEach(({ id, value }) => {
        const element = document.getElementById(id);
        if (element) {
            element.value = value;
        } else {
            console.warn(`Elemento com ID '${id}' não encontrado.`);
        }
    });

    // Preenche as cores do embed
    const embedColorsContainer = document.getElementById('embedColors');
    if (embedColorsContainer) {
        config.embedColors.forEach((color) => {
            addEmbedColorField(color);
        });
    }

    // Preenche os tokens
    const tokensContainer = document.getElementById('tokens');
    if (tokensContainer) {
        config.tokens.forEach((token) => {
            addTokenField(token);
        });
    }
}

// Obtém os valores do formulário e retorna um objeto de configuração
function getConfigFromForm() {
    return {
        clientId: document.getElementById('clientId')?.value || '',
        guildId: document.getElementById('guildId')?.value || '',
        progressChannelId: document.getElementById('progressChannelId')?.value || '',
        MAX_RAM_USAGE: parseInt(document.getElementById('MAX_RAM_USAGE')?.value || 0),
        UPLOAD_DELAY: parseInt(document.getElementById('UPLOAD_DELAY')?.value || 0),
        MAX_DL: parseInt(document.getElementById('MAX_DL')?.value || 0),
        CHUNK_SIZE: parseInt(document.getElementById('CHUNK_SIZE')?.value || 0),
        embedColors: Array.from(document.querySelectorAll('.embed-color-input')).map(input => input.value),
        tokens: Array.from(document.querySelectorAll('.token-input')).map(input => input.value),
    };
}

// Adiciona um campo de cor ao formulário
function addEmbedColorField(color = '#FFFFFF') {
    const container = document.getElementById('embedColors');
    if (!container) {
        console.warn("Container 'embedColors' não encontrado.");
        return;
    }
    const div = document.createElement('div');
    div.innerHTML = `
        <input type="color" class="embed-color-input" value="${color}">
        <button class="remove-button" onclick="removeField(this)">Remover</button>
    `;
    container.appendChild(div);
}

// Adiciona um campo de token ao formulário
function addTokenField(token = '') {
    const container = document.getElementById('tokens');
    if (!container) {
        console.warn("Container 'tokens' não encontrado.");
        return;
    }
    const div = document.createElement('div');
    div.innerHTML = `
        <input type="text" class="token-input" value="${token}" placeholder="Insira o token aqui">
        <button class="remove-button" onclick="removeField(this)">Remover</button>
    `;
    container.appendChild(div);
}

// Remove um campo do formulário
function removeField(button) {
    button.parentElement.remove();
}

async function openFileExplorer() {
    const files = await window.electron.openFileDialog();
    if (files) {
        files.forEach(file => {
            // Chame a função de upload do bot.js aqui
            uploadFile(file);
        });
    }
}

async function uploadFile(filePath) {
    try {
        // Chame a função uploadFileInterface do bot.js
        await window.electron.uploadFileInterface(filePath);
        alert('Upload concluído com sucesso!');
    } catch (error) {
        console.error('Erro ao fazer upload do arquivo:', error);
        alert('Erro ao fazer upload do arquivo. Verifique o console para mais detalhes.');
    }
}

// Adicione um evento ao botão de upload
const uploadButton = document.getElementById('uploadButton');
if (uploadButton) {
    uploadButton.addEventListener('click', openFileExplorer);
}