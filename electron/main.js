import { app, BrowserWindow, Tray, Menu, nativeImage, session } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let tray;
let serverProcess;

const APP_PORT = process.env.PORT || '3000';
const APP_URL = `http://localhost:${APP_PORT}`;

function createTrayIcon() {
  const dataUrl =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAQAAAC1+jfqAAAAN0lEQVR4AWNABf7//z8jI8Pwn4GBgQEGhkYGRnY2NjYxMTEwMDAw8P///4eHh4YGBgYGBgYAAAH3Yh4j7tYgAAAABJRU5ErkJggg==';
  return nativeImage.createFromDataURL(dataUrl);
}

function startBackendServer() {
  serverProcess = spawn(process.execPath, ['server.js'], {
    cwd: path.resolve(__dirname, '..'),
    stdio: 'inherit',
    env: process.env
  });

  serverProcess.on('exit', (code) => {
    if (code !== 0) {
      console.error(`Backend server exited with code ${code}`);
    }
  });
}

function stopBackendServer() {
  if (serverProcess && !serverProcess.killed) {
    serverProcess.kill();
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1100,
    height: 780,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadURL(APP_URL);

  mainWindow.on('close', (event) => {
    if (!app.isQuiting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
}

function createTray() {
  tray = new Tray(createTrayIcon());
  tray.setToolTip('AI Personal Assistant');

  const buildMenu = () => {
    const openAtLogin = app.getLoginItemSettings().openAtLogin;

    return Menu.buildFromTemplate([
      {
        label: 'Show Assistant',
        click: () => {
          if (mainWindow) {
            mainWindow.show();
            mainWindow.focus();
          }
        }
      },
      {
        label: 'Launch at Startup',
        type: 'checkbox',
        checked: openAtLogin,
        click: (menuItem) => {
          app.setLoginItemSettings({ openAtLogin: menuItem.checked });
          tray.setContextMenu(buildMenu());
        }
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          app.isQuiting = true;
          app.quit();
        }
      }
    ]);
  };

  tray.setContextMenu(buildMenu());
  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });
}

function configurePermissions() {
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    if (permission === 'media' || permission === 'microphone' || permission === 'audioCapture') {
      callback(true);
      return;
    }

    callback(false);
  });
}

const lock = app.requestSingleInstanceLock();
if (!lock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.show();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    startBackendServer();
    configurePermissions();
    createWindow();
    createTray();

    app.setLoginItemSettings({ openAtLogin: false });
  });
}

app.on('before-quit', () => {
  app.isQuiting = true;
  stopBackendServer();
});

app.on('window-all-closed', (event) => {
  event.preventDefault();
});
