const { contextBridge } = require('electron')

// Solo exponemos una marca de entorno. La interfaz no recibe acceso directo a
// Node, al disco ni a las APIs privilegiadas del sistema operativo.
contextBridge.exposeInMainWorld('electron', { isDesktop: true })
