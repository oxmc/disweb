const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron');
const notifier = require('node-notifier');
const path = require('path');
const decompress = require("decompress");

//Check if user is online
function checkInternet(cb) {
    require('dns').lookup('google.com',function(err) {
        if (err && err.code == "ENOTFOUND") {
            cb(false);
        } else {
            cb(true);
        }
    })
}

//Functions
function notification(mode, arg1) {
  if (mode == "1") {
    notifier.notify({
        title: 'Update availible.',
        message: 'An update is availible, Downloading it now...',
        icon: icondir + '/symbl/download.png',
        sound: true,
        wait: true
      },
      console.log("Downloading latest version...");
      console.log("OS type is: " + os.platform());
      console.log("Downloading '" + serverUrl + os.platform() + ".zip'");
      (async () => {
        try {
          request(serverUrl + os.platform() + '.zip').pipe(fs.createWriteStream('app.zip'));
          try {
            const files = await decompress("app.zip", "dist");
            console.log(files);
            console.log("\x1b[1m", "\x1b[32m", "Successfully download new update!", "\x1b[0m");
            notification(2)
          } catch (error) {
            console.log(error);
            notification(4)
          }
        } catch(e) {
          console.log("\x1b[1m", "\x1b[31m", "ERROR: Unable to download '" + serverUrl + os.platform() + ".zip'", "\x1b[0m");
          notification(4, serverUrl + os.platform() + ".zip")
        }
      })();
    );
  } else if (mode == "2") {
    notifier.notify({
        title: 'Update downloaded.',
        message: 'An update has been downloaded, restarting app...',
        icon: icondir + '/smbl/checkmark.png',
        sound: true,
        wait: true
      },
      app.quit();
      app.relaunch();
    );
  } else if (mode == "3") {
    notifier.notify({
        title: 'Not connected.',
        message: 'You are not connected to the internet, I will not be able to check for updates.',
        icon: icondir + '/symbl/warning.png',
        sound: true,
        wait: true
      },
      function (err, response3) {
        if (response3 == "activate") {
          console.log("User clicked on no wifi notification.");
        }
      }
    );
  } else if (mode == "4") {
    notifier.notify({
        title: 'Error downloading.',
        message: 'Unable to download latest update file: ' + arg1 + '.',
        icon: icondir + '/symbl/warning.png',
        sound: true,
        wait: true
      },
      function (err, response4) {
        if (response4 == "activate") {
          console.log("User clicked on unable to download notification.");
        } else {
	        notifier.on('timeout', function (notifierObject, options) {
	          // Triggers if notification closes
	          console.log("User did not click on unable to download notification.");
	        });
        }
      }
    );
  }
}

//Main
var appdir = path.join(app.getAppPath(), '/src');
var icondir = path.join(appdir, '/icons');
var appname = app.getName();
var appversion = app.getVersion();
var configdir = path.join(appdir, '/configs');
const config = require(configdir + '/config.json'); // Read the config
var os = require('os');
var packageJson = require(app.getAppPath() + '/package.json') // Read package.json
var repoLink = packageJson.repository.url
var webLink = repoLink.substring(repoLink.indexOf("+")+1)
var serverUrl = config.serverurl

console.log('appname: ' + appname);
console.log('appversion: ' + appversion);
console.log('appdir: ' + appdir);
console.log('configdir: ' + configdir);
console.log('icondir: ' + icondir);

//Check if user is connected to the internet.
checkInternet(function(isConnected) {
    if (isConnected) {
        //Get latest version from GitHub.
	      var request = require('request');
	      request(serverUrl + "build.json", function (error, response, body) {
    	    if (!error && response.statusCode == 200) {
            var onlineversion = JSON.parse(body);
		        console.log("Online version: '" + onlineversion.Ver + "'");
		        console.log("Local version: '" + appversion + "'");
		        //If Online version is greater than local version, show update dialog.
		        if ( appversion != onlineversion.Ver ) {
              console.log("\x1b[1m", "\x1b[31m", "Version is not up to date!", "\x1b[0m");
		          notification(1);
		        } else {
		          console.log("\x1b[1m", "\x1b[32m", "Version is up to date!", "\x1b[0m");
		        }
          } else if (!error && response.statusCode == 404) {
		        console.log("\x1b[1m", "\x1b[31m", "Unable to check latest version from main server!\nIt may be because the server is down, moved, or does not exist.", "\x1b[0m");
          };
        });
    } else {
	    //User not connected
      console.log("\x1b[1m", "\x1b[31m", "ERROR: User is not connected to internet, showing NotConnectedNotification", "\x1b[0m");
	    notification(3);
    }
});

let mainWindow;
let tray;

var contrib = require(appdir + '/contributors.json') // Read contributors.json

// "About" information
var appAuthor = packageJson.author

if (Array.isArray(contrib.contributors) && contrib.contributors.length) {
	var appContributors = [ appAuthor, ...contrib.contributors ]
  var stringContributors = appContributors.join(', ')
} else {
  var stringContributors = appAuthor
}

var iconext = "png" //Set default iconext to png

var appYear = '2021' // the year since this app exists
var currentYear = new Date().getFullYear()

// Year format for copyright
if (appYear == currentYear){
	var copyYear = appYear
} else {
	var copyYear = `${appYear}-${currentYear}`
}

const createTray = () => {
  if (typeof config.madefor === 'undefined') {
    var credittext = stringContributors
    var trayMenuTemplate = [
            { label: appname, enabled: false },
	          { label: "Open source on github!", enabled: false},
            { type: 'separator' },
	          { label: 'About', role: 'about', click: function() { app.showAboutPanel();}},
	          { label: 'Quit', role: 'quit', click: function() { app.quit();}}
         ]
  } else {
    var trayMenuTemplate = [
            { label: appname, enabled: false },
	          { label: "Made for: " + config.madefor, enabled: false},
            { type: 'separator' },
	          { label: 'About', role: 'about', click: function() { app.showAboutPanel();}},
	          { label: 'Quit', role: 'quit', click: function() { app.quit();}}
         ]
    var credittext = stringContributors
  }
  tray = new Tray(path.join(icondir, '/tray/tray-icon.png'))
  let trayMenu = Menu.buildFromTemplate(trayMenuTemplate)
  tray.setContextMenu(trayMenu)
  const aboutWindow = app.setAboutPanelOptions({
	  applicationName: appname,
	  iconPath: icondir + '/tray/tray-small.' + iconext,
	  applicationVersion: 'Version: ' + appversion,
	  authors: appContributors,
	  website: webLink,
	  credits: 'Credits: ' + credittext,
	  copyright: 'Copyright © ' + copyYear + ' ' + appAuthor
  })
  return aboutWindow
}

function createWindow () {
  mainWindow = new BrowserWindow({
    width: 500,
    height: 410,
    frame: false,
    transparent: true,
    icon: `${icondir}/app.${iconext}`,
  });
  mainWindow.setMenuBarVisibility(false)
  if (config.view.mode == "file") {
    mainWindow.loadFile(appdir + '/view/index.html');
  } else if (config.view.mode == "url") {
    mainWindow.loadURL(config.view.url)
  } else {
    console.log("\x1b[1m", "\x1b[31m", "Error: Unknown mode given at config.view.mode", "\x1b[0m");
  }
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

app.on('ready', () => {
  createWindow();
  createTray()
  // "Red dot" icon feature
  mainWindow.webContents.once('did-finish-load', () => {
	  const contents = mainWindow.webContents
	  console.log(contents)
	  mainWindow.webContents.on('page-favicon-updated', () => {
		  tray.setImage(`${icondir}/tray/tray-ping.${iconext}`);
	  })
	  app.on('browser-window-focus', () => {
		  tray.setImage(`${icondir}/tray/tray-ping.${iconext}`)
	  })
  })
  return SplashWindow
  return mainWindow
});

app.on('window-all-closed', function () {
  app.quit();
});
