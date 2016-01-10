'use strict';

const remote = require('electron').remote;
const Menu = remote.Menu;
const MenuItem = remote.MenuItem;

var menu = new Menu();
menu.append(new MenuItem({ label: 'back', click: function() {
  let currentWindow = remote.getCurrentWindow();
  if (currentWindow.webContents.canGoBack()) {
    currentWindow.webContents.goBack();
  }
}}));

window.addEventListener('contextmenu', function (e) {
  e.preventDefault();
  menu.popup(remote.getCurrentWindow());
}, false);