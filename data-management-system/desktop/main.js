/**
 * Electron 主进程入口
 * @creator dzh
 * @created 2026-03-14
 * @updated 2026-03-14
 */

const { app, BrowserWindow, ipcMain, dialog, Notification, shell, Menu } = require('electron');
const path = require('path');

// 开发环境检测
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;

// 主窗口引用
let mainWindow = null;

/**
 * 创建应用主窗口
 */
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    title: '数据管理系统',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    webPreferences: {
      // 预加载脚本
      preload: path.join(__dirname, 'preload.js'),
      // 启用上下文隔离，提高安全性
      contextIsolation: true,
      // 禁用 node 集成，使用 preload 暴露 API
      nodeIntegration: false,
      // 启用沙箱
      sandbox: true,
    },
    // 窗口配置
    show: false,
    frame: true,
    backgroundColor: '#f5f5f5',
  });

  // 窗口准备好后显示（避免白屏）
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // 加载应用
  if (isDev) {
    // 开发环境：加载 Vite 开发服务器
    mainWindow.loadURL('http://localhost:5173');
    // 打开开发者工具
    // mainWindow.webContents.openDevTools();
  } else {
    // 生产环境：加载打包后的文件
    mainWindow.loadFile(path.join(__dirname, '../frontend/dist/index.html'));
  }

  // 处理外部链接点击
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    // 使用系统默认浏览器打开外部链接
    shell.openExternal(url);
    return { action: 'deny' };
  });

  // 窗口关闭处理
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // 创建应用菜单
  createApplicationMenu();
}

/**
 * 创建应用菜单
 */
function createApplicationMenu() {
  const template = [
    {
      label: '文件',
      submenu: [
        {
          label: '刷新',
          accelerator: 'CmdOrCtrl+R',
          click: () => {
            mainWindow?.webContents.reload();
          },
        },
        { type: 'separator' },
        {
          label: '退出',
          accelerator: 'CmdOrCtrl+Q',
          click: () => {
            app.quit();
          },
        },
      ],
    },
    {
      label: '编辑',
      submenu: [
        { role: 'undo', label: '撤销' },
        { role: 'redo', label: '重做' },
        { type: 'separator' },
        { role: 'cut', label: '剪切' },
        { role: 'copy', label: '复制' },
        { role: 'paste', label: '粘贴' },
        { role: 'selectAll', label: '全选' },
      ],
    },
    {
      label: '视图',
      submenu: [
        { role: 'reload', label: '重新加载' },
        { role: 'forceReload', label: '强制重新加载' },
        { type: 'separator' },
        { role: 'resetZoom', label: '重置缩放' },
        { role: 'zoomIn', label: '放大' },
        { role: 'zoomOut', label: '缩小' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: '全屏' },
      ],
    },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: '关于',
              message: '数据管理系统',
              detail: `版本: ${app.getVersion()}\n作者: dzh`,
            });
          },
        },
      ],
    },
  ];

  // 开发环境添加开发者工具菜单
  if (isDev) {
    template[2].submenu.push(
      { type: 'separator' },
      { role: 'toggleDevTools', label: '开发者工具' }
    );
  }

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

/**
 * IPC 通信处理
 */

// 文件对话框 - 打开
ipcMain.handle('dialog:openFile', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: options?.title || '选择文件',
    properties: options?.multiple 
      ? ['openFile', 'multiSelections'] 
      : ['openFile'],
    filters: options?.filters || [],
  });
  return {
    filePaths: result.filePaths,
    canceled: result.canceled,
  };
});

// 文件对话框 - 保存
ipcMain.handle('dialog:saveFile', async (event, options) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    title: options?.title || '保存文件',
    filters: options?.filters || [],
  });
  return {
    filePaths: result.filePath ? [result.filePath] : [],
    canceled: result.canceled,
  };
});

// 系统通知
ipcMain.handle('notification:show', async (event, options) => {
  if (!Notification.isSupported()) {
    return { success: false, error: '系统不支持通知' };
  }

  const notification = new Notification({
    title: options.title,
    body: options.body,
    icon: options.icon,
  });

  notification.on('click', () => {
    event.sender.send('notification:clicked', options);
  });

  notification.show();
  return { success: true };
});

// 打开外部链接
ipcMain.handle('shell:openExternal', async (event, url) => {
  await shell.openExternal(url);
  return { success: true };
});

// 在文件管理器中显示
ipcMain.handle('shell:showItemInFolder', async (event, filePath) => {
  shell.showItemInFolder(filePath);
  return { success: true };
});

// 窗口控制
ipcMain.handle('window:minimize', () => {
  mainWindow?.minimize();
  return { success: true };
});

ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
  return { success: true };
});

ipcMain.handle('window:restore', () => {
  mainWindow?.restore();
  return { success: true };
});

ipcMain.handle('window:close', () => {
  mainWindow?.close();
  return { success: true };
});

ipcMain.handle('window:isMaximized', () => {
  return mainWindow?.isMaximized() || false;
});

// 应用控制
ipcMain.handle('app:getVersion', () => {
  return app.getVersion();
});

ipcMain.handle('app:quit', () => {
  app.quit();
  return { success: true };
});

ipcMain.handle('app:relaunch', () => {
  app.relaunch();
  app.exit(0);
  return { success: true };
});

// 应用就绪
app.whenReady().then(() => {
  createMainWindow();

  // macOS 激活应用时重新创建窗口
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

// 所有窗口关闭时退出应用（macOS 除外）
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 安全性：阻止新窗口创建
app.on('web-contents-created', (event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault();
    shell.openExternal(navigationUrl);
  });
});
