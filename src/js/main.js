//Load nodejs modules
const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron');
const notifier = require('node-notifier');
const path = require('path');
const decompress = require("decompress");
var request = require('request');
var os = require('os');
var fs = require('fs');

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

//Variables
let SplashWindow;
let UpdatingWindow;
let mainWindow;
let tray;
const update = false;

function createWindow () {
  //Splash window
  SplashWindow = new BrowserWindow({
    width: 350,
    height: 350,
    frame: false,
    transparent: false,
    center: true,
    icon: `${icondir}/app.png`,
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
    height: 370,
    frame: false,
    transparent: false,
    center: true,
    icon: `${icondir}/app.png`,
    backgroundColor: '#23272A',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    }
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
    icon: `${icondir}/app.png`,
  });
  mainWindow.setMenuBarVisibility(false)
  mainWindow.loadURL(config.url)
  mainWindow.on('closed', function () {
    mainWindow = null;
  });
  mainWindow.hide()
}

function seticon(arg) {
  tray.setImage(`${arg}`);
  mainWindow.setIcon(`${arg}`);
}

function Ready() {
  if (update == true) {
    UpdatingWindow.show();
    SplashWindow.close();
    mainWindow.close();
  } else {
    UpdatingWindow.close();
    SplashWindow.close();
    mainWindow.show();
    // "Red dot" and "Ping" tray icon
    const contents = mainWindow.webContents
    mainWindow.webContents.on('page-favicon-updated', (event, favicons) => {
      //console.log(event);
      //console.log(favicons);
      const favstring = JSON.stringify(favicons);
      const nojson1 = favstring.replace(/\"/g, "");
      const nojson2 = nojson1.replace(/\'/g, "");
      const nojson3 = nojson2.replace(/\[/g, "");
      const nobase64 = nojson3.replace(/\]/g, "");
      //const fav = nobase64
      const fav2 = nobase64.replace(/^data:image\/png;base64,/,"")
      var buf = new Buffer(fav2, 'base64');
      
      fs.writeFile(`${userHomeDir}/.config/${appname}/downloads/icons/favicon.png`, buf, 'base64', function(err) {
        console.log(err)
      });
      setTimeout(async function () {
        seticon(`${userHomeDir}/.config/${appname}/downloads/icons/favicon.png`)
      }, 2000)
    });
    app.on('browser-window-focus', () => {
      seticon(`${userHomeDir}/.config/${appname}/downloads/icons/favicon.png`)
    });
  }
}

async function notification(mode, arg1) {
  if (mode == "1") {
    notifier.notify({
        title: 'Update availible.',
        message: 'An update is availible, Downloading now....',
        icon: icondir + '/symbl/download.png',
        sound: true,
        wait: true
    });
  } else if (mode == "2") {
    notifier.notify({
        title: 'Update downloaded.',
        message: 'An update has been downloaded, Restarting app...',
        icon: icondir + '/tray/tray-small.png',
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
        message: `You are not connected to the internet, you can not use ${appname} without the internet.`,
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
        icon: icondir + '/sybl/warning.png',
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
const config = require(appdir + '/json/config.json'); // Read the config
var packageJson = require(app.getAppPath() + '/package.json') // Read package.json
var contrib = require(appdir + '/json/contributors.json') // Read contributors.json
var repoLink = packageJson.repository.url
var webLink = repoLink.substring(repoLink.indexOf("+")+1)
var serverVerUrl = config.serververurl
const userHomeDir = os.homedir();

//Update window sends signals to main.js
ipcMain.on('synchronous-message', (event, arg) => {
  //Deal weith response
  if (arg.notif == "2") {
    notification(2);
  } else if (arg.notif == "4") {
    notification(4, arg.url);
  } else if (arg.notif == "5") {
    notification(5);
  }
})

//Show info about app if ran from terminal
console.log('appname: ' + appname);
//console.log('appversion: ' + appversion);
console.log('appdir: ' + appdir);
console.log('jsondir: ' + appdir + "/json");
console.log('icondir: ' + icondir);

//Main
//Make required dirs
const faviconpath = `${userHomeDir}/.config/${appname}/downloads/icons`
try {
  if (fs.existsSync(`${userHomeDir}/.config/${appname}`)) {
    fs.copyFileSync(`${icondir}/app.png`, `${userHomeDir}/.config/${appname}/app.png`);
  }
}
catch {
  faviconpath.split('/').reduce(
    (directories, directory) => {
      directories += `${directory}/`;

      if (!fs.existsSync(directories)) {
        fs.mkdirSync(directories);
      }

      return directories;
   },
  '',
  );
}
finally {
  fs.copyFileSync(`${icondir}/app.png`, `${userHomeDir}/.config/${appname}/app.png`);
}

// "About" information
var appAuthor = packageJson.author.name

if (Array.isArray(contrib.contributors) && contrib.contributors.length) {
  var appContributors = [ appAuthor, ...contrib.contributors ]
  var stringContributors = appContributors.join(', ')
} else {
  var stringContributors = appAuthor
}

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
	  iconPath: `${userHomeDir}/.config/${appname}/app.png`,
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
  //Check if user is connected to the internet.
  checkInternet(function(isConnected) {
    if (isConnected) {
      //Get latest version from GitHub.
      console.log("Initilize Updater:");
      request(serverVerUrl, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          var verfile = JSON.parse(body);
          const verstring = JSON.stringify(verfile);
          const ver = verfile.version;
          const onlineversion = ver.replace(/"([^"]+)":/g, '$1:');
          console.log("Online version: '" + onlineversion + "'");
          console.log("Local version: '" + appversion + "'");
          //If Online version is greater than local version, show update dialog.
          if (onlineversion > appversion) {
            console.log("\x1b[1m", "\x1b[31m", "Version is not up to date!", "\x1b[0m");
            notification(1);
            mainWindow.close();
            SplashWindow.close();
            //UpdatingWindow.show()
          } else {
            console.log("\x1b[1m", "\x1b[32m", "Version is up to date!", "\x1b[0m");
            SplashWindow.show();
            mainWindow.hide();
            UpdatingWindow.hide()
            // Close loading screen after, loading...
            mainWindow.webContents.once('did-finish-load', () => {
              setTimeout(async function () {
                Ready();
              }, 2000)
            })
          }
        } else if (!error && response.statusCode == 404) {
          console.log("\x1b[1m", "\x1b[31m", "Unable to check latest version from main server!\nIt may be because the server is down, moved, or does not exist.", "\x1b[0m");
        };
      });
    } else {
      //User not connected
      console.log("\x1b[1m", "\x1b[31m", "ERROR: User is not connected to internet, showing NotConnectedNotification", "\x1b[0m");
      notification(3);
      SplashWindow.close();
      UpdatingWindow.close();
      mainWindow.loadFile(appdir + '/view/nowifi.html');
      mainWindow.show();
    }
  });
});

app.on('window-all-closed', function () {
  app.quit();
});
