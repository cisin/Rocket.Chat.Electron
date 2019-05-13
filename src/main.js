import { app } from 'electron';
import ElectronStore from 'electron-store';
import jetpack from 'fs-jetpack';
import i18n from './i18n';
import './store';
import { deepLinks } from './main/deepLinks';
import { mainWindow, createMainWindow } from './main/mainWindow';
import { basicAuth } from './main/basicAuth';
import { certificates } from './main/certificates';
import { dock } from './main/dock';
import { menus } from './main/menus';
import { spellchecking } from './main/spellchecking';
import { touchBar } from './main/touchBar';
import { tray } from './main/tray';
import { updates } from './main/updates';


export const config = new ElectronStore();

const setupErrorHandling = () => {
	process.on('uncaughtException', (error) => {
		console.error(error && (error.stack || error));
		app.quit(1);
	});

	process.on('unhandledRejection', (reason) => {
		console.error(reason && (reason.stack || reason));
		app.quit(1);
	});
};

const setupAppParameters = () => {
	app.setAsDefaultProtocolClient('rocketchat');
	app.setAppUserModelId('chat.rocket');
	app.commandLine.appendSwitch('--autoplay-policy', 'no-user-gesture-required');
	// TODO: make it a setting
	if (process.platform === 'linux') {
		app.disableHardwareAcceleration();
	}
};

const setupUserDataPath = () => {
	const appName = app.getName();
	const dirName = process.env.NODE_ENV === 'production' ? appName : `${ appName } (${ process.env.NODE_ENV })`;

	app.setPath('userData', jetpack.path(app.getPath('appData'), dirName));
};

const resetAppData = () => {
	const dataDir = app.getPath('userData');
	jetpack.remove(dataDir);
};

export const relaunch = (...args) => {
	app.relaunch({ args: [process.argv[1], ...args] });
	app.quit();
};

const attachAppEvents = () => {
	app.on('activate', () => {
		mainWindow.show();
	});

	app.on('before-quit', () => {
		mainWindow.removeAllListeners();
	});

	app.on('window-all-closed', () => {
		app.quit();
	});

	app.on('open-url', (event, url) => {
		event.preventDefault();
		deepLinks.handle(url);
	});

	app.on('second-instance', (event, argv) => {
		mainWindow.forceFocus();
		argv.slice(2).forEach(deepLinks.handle);
	});

	app.on('login', basicAuth.handleLoginEvent);

	app.on('certificate-error', certificates.handleCertificateError);
};

(async () => {
	setupErrorHandling();
	setupAppParameters();
	setupUserDataPath();

	const args = process.argv.slice(2);

	if (args.includes('--reset-app-data')) {
		resetAppData();
		relaunch();
		return;
	}

	const canStart = process.mas || app.requestSingleInstanceLock();
	if (!canStart) {
		app.quit();
		return;
	}

	attachAppEvents();

	await app.whenReady();

	await i18n.initialize();

	await createMainWindow();

	await dock.mount();
	await menus.mount();
	await touchBar.mount();
	await tray.mount();

	await certificates.initialize();
	await spellchecking.initialize();
	await updates.initialize();

	mainWindow.showIfNeeded();

	args.forEach(deepLinks.handle);
})();

export { basicAuth } from './main/basicAuth';
export { certificates } from './main/certificates';
export { deepLinks } from './main/deepLinks';
export { dock } from './main/dock';
export { menus } from './main/menus';
export { notifications } from './main/notifications';
export { spellchecking } from './main/spellchecking';
export { systemIdleTime } from './main/systemIdleTime';
export { touchBar } from './main/touchBar';
export { tray } from './main/tray';
export { updates } from './main/updates';
