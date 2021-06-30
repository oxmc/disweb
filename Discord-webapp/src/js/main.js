const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron');
const widevine = require('electron-widevinecdm');
widevine.load(app);
const notifier = require('node-notifier');
const url = require('url');
const path = require('path');

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

//Main
var appdir = path.join(app.getAppPath(), '/src');
var icondir = path.join(appdir, '/icons');
var appname = app.getName();
var appversion = app.getVersion();
const config = require(appdir + '/configs/config.json');
var os = require('os');
var notconnected = "0"
var packageJson = require(app.getAppPath() + '/package.json') // Read package.json
var repoLink = packageJson.repository.url
var webLink = repoLink.substring(repoLink.indexOf("+")+1)

console.log('appname: ' + appname);
console.log('appversion: ' + appversion);
console.log('appdir: ' + appdir);
console.log('configdir: ' + appdir + "/configs");
console.log('icondir: ' + icondir);

//Check if user is connected to the internet.
checkInternet(function(isConnected) {
    if (isConnected) {
        //Get latest version from GitHub.
	var request = require('request');
	request.get(webLink + "/ver", function (error, response, body) {
    	if (!error && response.statusCode == 200) {
        	var csv = body;
		console.log("Online version: " + csv);
		console.log("Local version: " + appversion);
		//If Online version is greater than local version, show update dialog.
		if ( appversion != csv ) {
		  console.log("Version is not up to date!");
		  notification(1);
		} else {
		  console.log("Version is up to date!");
		}
    	} else if (!error && response.statusCode == 404) {
		  console.log("\x1b[1m", "\x1b[31m", "Unable to check latest version from main server!\nIt may be because the server is down, moved, or does not exist.");
    	};
});
    } else {
	//User not connected
        console.log("ERROR: User is not connected to internet, showing nowifi.html");
	notconnected = 1
	notification(3);
    }
});

let mainWindow;
let tray;

//Load useragent
var chromiumVersion = process.versions.chrome
const getUserAgent = require(appdir + '/js/userAgent.js')
fakeUserAgent = getUserAgent(chromiumVersion)

var contrib = require(appdir + '/contributors.json') // Read contributors.json

// "About" information
var appAuthor = packageJson.author

if (Array.isArray(contrib.contributors) && contrib.contributors.length) {
	var appContributors = [ appAuthor, ...contrib.contributors ]
} else {
	var appContributors = [appAuthor]
}

var iconext = "png" //Set default iconext to png

var appYear = '2021' // the year since this app exists
var currentYear = new Date().getFullYear()
var stringContributors = appContributors.join(', ')

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
    var credittext = stringContributors + '\n\nThis app was made for: ' + config.madefor
  }
  tray = new Tray(path.join(icondir, '/tray-icon.png'))
  let trayMenu = Menu.buildFromTemplate(trayMenuTemplate)
  tray.setContextMenu(trayMenu)
  
  const aboutWindow = app.setAboutPanelOptions({
	applicationName: appname,
	iconPath: icondir + '/tray-small.' + iconext,
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
    width: 1040,
    height: 900,
    //frame: false,
    icon: `${icondir}/app.${iconext}`,
  });
  mainWindow.setMenuBarVisibility(false)
  if (notconnected == "1") {
    mainWindow.loadFile(appdir + '/view/nowifi.html');
  } else {
    if (config.view.mode == "file") {
      mainWindow.loadFile(appdir + '/view/index.html');
    } else if (config.view.mode == "url") {
      mainWindow.loadURL(config.view.url,{userAgent: fakeUserAgent})
    } else {
      console.log("Error: Unknown mode given at config.view.mode");
    }
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
		tray.setImage(`${icondir}/tray-ping.${iconext}`);
	})

	app.on('browser-window-focus', () => {
		tray.setImage(`${icondir}/tray-ping.${iconext}`)
	})
  })
  return mainWindow
});

app.on('window-all-closed', function () {
  app.quit();
});
