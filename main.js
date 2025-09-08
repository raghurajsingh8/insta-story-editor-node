const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: true,
    }
  });

  mainWindow.loadURL("http://localhost:3000");

  // जब window बंद होगी → server भी बंद करो ✅
  mainWindow.on('closed', function () {
    mainWindow = null;
    if (serverProcess) {
      serverProcess.kill('SIGINT'); // ✅ forcefully server बंद
      serverProcess = null;
    }
  });
}

// App ready होते ही server start करो
app.on('ready', () => {
  // Start Node server.js
  serverProcess = spawn('node', [path.join(__dirname, 'server.js')], {
    shell: true
  });

  // Server logs देखो
  serverProcess.stdout.on('data', (data) => {
    const msg = data.toString();
    console.log(msg);

    // जब server ready हो → window create करो ✅
    if (msg.includes("http://localhost:3000")) {
      createWindow();
    }
  });

  // Server errors catch करो
  serverProcess.stderr.on('data', (data) => {
    console.error(`Server Error: ${data}`);
  });

  // अगर server crash हो गया → app भी बंद करो ✅
  serverProcess.on('close', (code) => {
    console.log(`Server stopped with code ${code}`);
    if (mainWindow) {
      mainWindow.close();
    }
  });
});

// जब सभी windows बंद हों → app quit ✅
app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') {
    if (serverProcess) {
      serverProcess.kill('SIGINT'); // ✅ server बंद
      serverProcess = null;
    }
    app.quit(); // ✅ app बंद
  }
});

// App quit होने पर server process kill करो ✅
app.on('quit', () => {
  if (serverProcess) {
    serverProcess.kill('SIGINT');
    serverProcess = null;
  }
});
