const { app, BrowserWindow, shell } = require('electron')
const path = require('path')

const esDesarrollo = Boolean(process.env.ELECTRON_START_URL)

function crearVentana() {
  const ventana = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    autoHideMenuBar: true,
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  })

  if (esDesarrollo) {
    ventana.loadURL(process.env.ELECTRON_START_URL)
  } else {
    ventana.loadFile(path.join(__dirname, '..', 'dist', 'index.html'))
  }

  ventana.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })
}

app.whenReady().then(() => {
  crearVentana()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) crearVentana()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
