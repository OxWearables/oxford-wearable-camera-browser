const schema = require('./schema.js')
const image_resize = require('./image_resize.js')
const electron = require('electron')
// Module to control application life.
const {app, BrowserWindow} = electron;
// Module to create native browser window.
require('electron-reload')(__dirname, {ignored: /node_modules|[\/\\]\.|annotation/});
console.log("start")
const path = require('path')
const url = require('url')
let win = null;


function createWindow () {
  // Create the browser window.
  win = new BrowserWindow({width: 1024, height:768})

  // and load the index.html of the app.
  // win.loadURL('http://127.0.0.1:3000')
  win.loadURL(url.format({
    pathname: path.join(__dirname, 'static','main.html'),
    protocol: 'file:',
    slashes: true
  }))

  // win.webContents.openDevTools()
  // Emitted when the window is closed.
  win.on('closed', () => {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    win = null
  })
}

var resize_operation = image_resize.initialize();
app.on('ready', ()=>{
  console.log("ready.. but waiting for resizing of images to be done.")
  resize_operation.then(()=>{
    console.log("all resizing done!")
    createWindow();
  })
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }

})

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
