const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron');
/*const widevine = require('electron-widevinecdm');
widevine.load(app);*/
const notifier = require('node-notifier');
const path = require('path');
const decompress = require("decompress");
var request = require('request');

//Functions
function checkInternet(cb) {
    require('dns').lookup('google.com',function(err) {
        if (err && err.code == "ENOTFOUND") {
            cb(false);
        } else {
            cb(true);
        }
    })
}

let SplashWindow;
let UpdatingWindow;
let mainWindow;
let tray;

function createWindow () {
  //Splash window
  SplashWindow = new BrowserWindow({
    width: 350,
    height: 350,
    frame: false,
    transparent: false,
    center: true,
    icon: `${icondir}/app.${iconext}`,
    backgroundColor: '#23272A',
  });
  SplashWindow.loadFile(appdir + '/view/splash.html');
  SplashWindow.on('closed', function () {
    SplashWindow = null;
  });
  SplashWindow.hide()
  //Updater window
  UpdatingWindow = new BrowserWindow({
    width: 350,
    height: 350,
    frame: false,
    transparent: false,
    center: true,
    icon: `${icondir}/app.${iconext}`,
    backgroundColor: '#23272A',
  });
  UpdatingWindow.loadFile(appdir + '/view/update.html');
  UpdatingWindow.on('closed', function () {
    UpdatingWindow = null;
  });
  UpdatingWindow.hide()
  //Main Window
  mainWindow = new BrowserWindow({
    width: 1040,
    height: 900,
    icon: `${icondir}/app.${iconext}`,
  });
  mainWindow.setMenuBarVisibility(false)
  if (config.view.mode == "file") {
    mainWindow.loadFile(appdir + '/view/index.html');
  } else if (config.view.mode == "url") {
    mainWindow.loadURL(config.view.url)
  } else {
    console.log("Error: Unknown mode given at config.view.mode");
  }
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
  mainWindow.hide()
}

function Ready() {
  setTimeout(function () {
    SplashWindow.close();
    mainWindow.show();
    // "Red dot" tray icon
    const contents = mainWindow.webContents
    mainWindow.webContents.on('page-favicon-updated', () => {
      tray.setImage(`${icondir}/tray/tray-ping.${iconext}`);
      console.log();
    })
    app.on('browser-window-focus', () => {
      tray.setImage(`${icondir}/tray/tray-ping.${iconext}`)
    })
  }, 5000)
}

async function notification(mode, arg1) {
  if (mode == "1") {
    notifier.notify({
        title: 'Update availible.',
        message: 'An update is availible, Downloading now....',
        icon: icondir + '/download.png',
        sound: true,
        wait: true
    });
    //SplashWindow.close();
    mainWindow.hide();
    UpdatingWindow.show()
    console.log("Downloading latest version...");
	  console.log("OS type is: " + os.platform());
	  console.log("Downloading '" + serverUrl + os.platform() + ".zip'");
    try {
      request(serverUrl + os.platform() + '.zip').pipe(fs.createWriteStream('app.zip'));
      try {
        const files = await decompress("app.zip", "dist");
        console.log(files);
        console.log("\x1b[1m", "\x1b[32m", "Successfully download new update!", "\x1b[0m");
        notification(2)
      } catch (error) {
        console.log(error);
        notification(5)
      }
    } catch(e) {
      console.log("\x1b[1m", "\x1b[31m", "ERROR: Unable to download '" + serverUrl + os.platform() + ".zip'", "\x1b[0m");
	     notification(4, serverUrl + os.platform() + ".zip")
    }
  } else if (mode == "2") {
    notifier.notify({
        title: 'Update downloaded.',
        message: 'An update has been downloaded, Restarting app...',
        icon: icondir + '/tray-small.png',
        sound: true,
        wait: true
      },
      function (err, response2) {
        if (response2 == "activate") {
          console.log("An update has been downloaded.");
          app.quit();
        }
      }
    );
  } else if (mode == "3") {
    notifier.notify({
        title: 'Not connected.',
        message: 'You are not connected to the internet, you can not use '+appname+' without the internet.',
        icon: icondir + '/warning.png',
        sound: true,
        wait: true
      },
      function (err, response3) {
        if (response3 == "activate") {
          console.log("User clicked on no wifi notification.");
        }
      }
    );
    SplashWindow.hide();
    mainWindow.loadFile(appdir + '/view/nowifi.html');
    mainWindow.show();
  } else if (mode == "4") {
    notifier.notify({
        title: 'Error downloading.',
        message: 'Unable to download latest update file: ' + arg1 + '.',
        icon: icondir + '/warning.png',
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
  } else if (mode == "5") {
    notifier.notify({
        title: 'Error extracting files.',
        message: 'There was an error extracting some files.',
        icon: icondir + '/symbl/warning.png',
        sound: true,
        wait: true
      },
      function (err, response5) {
        if (response5 == "activate") {
          console.log("User clicked on unable to extract notification.");
        } else {
	        notifier.on('timeout', function (notifierObject, options) {
	          // Triggers if notification closes
	          console.log("User did not click on unable to extract notification.");
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
const config = require(appdir + '/configs/config.json'); // Read the config
var os = require('os');
var packageJson = require(app.getAppPath() + '/package.json') // Read package.json
var repoLink = packageJson.repository.url
var webLink = repoLink.substring(repoLink.indexOf("+")+1)
var serverVerUrl = config.serververurl
var serverUrl = config.serverurl

//Show info about app if ran from terminal
console.log('appname: ' + appname);
console.log('appversion: ' + appversion);
console.log('appdir: ' + appdir);
console.log('configdir: ' + appdir + "/configs");
console.log('icondir: ' + icondir);

//Main
//Check if user is connected to the internet.
checkInternet(function(isConnected) {
    if (isConnected) {
      //Get latest version from GitHub.
      var request = require('request');
      request(serverVerUrl, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          var verf = JSON.parse(body);
          const verstring = JSON.stringify(verf);
          const ver = verf.version;
          const onlineversion = ver.replace(/"([^"]+)":/g, '$1:');
          console.log("Online version: '" + onlineversion + "'");
          console.log("Local version: '" + appversion + "'");
          //If Online version is greater than local version, show update dialog.
          if ( onlineversion >= appversion ) {
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

app.on('ready', () => {
  createWindow();
  createTray()
  UpdatingWindow.hide()
  SplashWindow.hide();
  mainWindow.hide();
  // Close loading screen after, loading...
  mainWindow.webContents.once('did-finish-load', () => {
    Ready();
  })
});

app.on('window-all-closed', function () {
  app.quit();
});
