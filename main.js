const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const yaml = require('js-yaml');
const { uploadFileInterface } = require('./bot');

// Caminho para o arquivo de configuração YAML
const configPath = path.join(__dirname, 'config.yaml');

// Função para carregar o arquivo de configuração
function loadConfig() {
    return yaml.load(fs.readFileSync(configPath, 'utf8'));
}

const config = loadConfig(); // Carrega a configuração
const progressChannelId = config.progressChannelId;

// Função para salvar alterações no arquivo de configuração
function saveConfig(newConfig) {
    fs.writeFileSync(configPath, yaml.dump(newConfig));
}

let mainWindow;

// Função para criar a janela principal
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1600, // Largura da janela
        height: 1000, // Altura da janela
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'), // Script de preload
            nodeIntegration: false, // Desativa a integração direta do Node.js para segurança
            contextIsolation: true, // Isola o contexto para evitar acesso direto ao Node.js
        },
    });

    // Carrega a página inicial (index.html)
    mainWindow.loadFile('index.html');

    // Abre as ferramentas de desenvolvimento (opcional, pode ser removido em produção)
    // mainWindow.webContents.openDevTools();
}

// Quando o Electron estiver pronto, cria a janela
app.whenReady().then(() => {
    createWindow();

    // Garante que a janela seja recriada no macOS se o usuário clicar no ícone do aplicativo
    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

// Fecha o aplicativo quando todas as janelas forem fechadas (exceto no macOS)
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});

// IPC Handlers para comunicação entre o frontend e o backend
ipcMain.handle('get-config', async () => {
    return loadConfig();
});

ipcMain.handle('update-config', async (event, newConfig) => {
    saveConfig(newConfig);
});

ipcMain.on('start-bot', () => {
    console.log('Iniciando o bot...');
    // Aqui você pode adicionar lógica para iniciar o bot.js, por exemplo:
    const { fork } = require('child_process');
    const botProcess = fork(path.join(__dirname, 'bot.js'));

    botProcess.on('message', (msg) => {
        console.log(`Mensagem do bot: ${msg}`);
    });

    botProcess.on('error', (err) => {
        console.error('Erro no processo do bot:', err);
    });

    botProcess.on('exit', (code) => {
        console.log(`Bot encerrado com código: ${code}`);
    });
});

ipcMain.handle('get-folders', async () => {
    return getAvailableFolders();
});

ipcMain.handle('get-files', async () => {
    return getAvailableFiles();
});

ipcMain.handle('open-file-dialog', async () => {
    const result = await dialog.showOpenDialog({
        properties: ['openFile', 'multiSelections'], // Permite selecionar múltiplos arquivos
        filters: [
            { name: 'Arquivos ZIP', extensions: ['zip'] } // Filtra apenas arquivos .zip
        ]
    });
    return result.filePaths; // Retorna os caminhos dos arquivos selecionados
});

ipcMain.handle('upload-file-interface', async (event, filePath) => {
    // Simulando um objeto de interação
    const interaction = {
        guild: {
            channels: {
                create: async (channelData) => {
                    return {
                        send: async (message) => {
                            console.log(`Mensagem enviada para o canal: ${message.embeds[0].title}`);
                        }
                    };
                }
            }
        }
    };

    await uploadFileInterface(filePath, interaction, progressChannelId);
});

function getAvailableFolders() {
    const upsDir = path.join(__dirname, 'ups');
    if (!fs.existsSync(upsDir)) {
        console.warn("Diretório 'ups' não encontrado.");
        return [];
    }

    // Lê todas as pastas dentro de /ups
    const folders = fs.readdirSync(upsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    return folders;
}

function getAvailableFiles() {
    const upsDir = path.join(__dirname, 'ups');
    if (!fs.existsSync(upsDir)) {
        console.warn("Diretório 'ups' não encontrado.");
        return [];
    }

    // Lê todas as pastas dentro de /ups
    const folders = fs.readdirSync(upsDir, { withFileTypes: true })
        .filter(dirent => dirent.isDirectory())
        .map(dirent => dirent.name);

    // Para cada pasta, lê o arquivo info.txt
    const filesInfo = folders.map(folder => {
        const infoFilePath = path.join(upsDir, folder, 'info.txt');
        if (!fs.existsSync(infoFilePath)) {
            console.warn(`Arquivo 'info.txt' não encontrado para a pasta: ${folder}`);
            return null;
        }

        const infoContent = fs.readFileSync(infoFilePath, 'utf8');
        const lines = infoContent.split('\n');

        const fileInfo = {};
        lines.forEach(line => {
            const [key, value] = line.split(': ');
            if (key && value) {
                fileInfo[key.trim()] = value.trim();
            }
        });

        return {
            folderName: folder,
            fileName: fileInfo['Nome do Arquivo'],
            uploadDate: fileInfo['Data de Upload'],
            fileSize: fileInfo['Tamanho Original'],
            zipContents: fileInfo['Conteúdo do Zip'] || 'Nenhum conteúdo disponível'
        };
    }).filter(Boolean); // Remove entradas inválidas

    return filesInfo;
}