const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('terminalAPI', {
  /** ขอให้ main process เปิด pty ตัวใหม่ (ข้อมูลจะไหลกลับมาทาง onData) */
  spawn: (options) => ipcRenderer.invoke('terminal:spawn', options),
  write: (data) => ipcRenderer.send('terminal:write', data),
  resize: (cols, rows) => ipcRenderer.send('terminal:resize', { cols, rows }),

  /** คืนฟังก์ชันสำหรับเลิกฟัง */
  onData: (callback) => {
    const listener = (_event, data) => callback(data);
    ipcRenderer.on('terminal:data', listener);
    return () => ipcRenderer.removeListener('terminal:data', listener);
  },
  onExit: (callback) => {
    const listener = (_event, info) => callback(info);
    ipcRenderer.on('terminal:exit', listener);
    return () => ipcRenderer.removeListener('terminal:exit', listener);
  },
});
