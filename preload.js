const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    startBot: () => ipcRenderer.send('start-bot'),
    getConfig: () => ipcRenderer.invoke('get-config'),
    updateConfig: (newConfig) => ipcRenderer.invoke('update-config', newConfig),
    getFolders: () => ipcRenderer.invoke('get-folders'),
    getFiles: () => ipcRenderer.invoke('get-files'),
    openFileDialog: () => ipcRenderer.invoke('open-file-dialog'),
    uploadFileInterface: (filePath) => ipcRenderer.invoke('upload-file-interface', filePath)
});