import { remote, clipboard } from 'electron';
import i18n from '../i18n';
import * as channels from '../preload/channels';
import { store } from '../store';
import { stopLoading } from '../store/loading';
import { loadPreferences, setPreferences } from '../store/preferences';
import { loadServers } from '../store/servers';
import { showWindow, hideWindow } from '../store/windowVisible';
import { queryEditFlags } from '../utils';
import { aboutModal } from './aboutModal';
import { screenshareModal } from './screenshareModal';
import { updateModal } from './updateModal';
import { landing } from './landing';
import { preferences } from './preferences';
import { servers } from './servers';
import { sidebar } from './sidebar';
import { webviews } from './webviews';
import { contextMenu } from './contextMenu';
const { app, dialog, getCurrentWindow, shell } = remote;
const {
	basicAuth,
	certificates,
	config,
	deepLinks,
	dock,
	menus,
	relaunch,
	spellchecking,
	touchBar,
	tray,
	updates,
} = remote.require('./main');


const askWhenToInstallUpdate = () => new Promise((resolve) => {
	dialog.showMessageBox(getCurrentWindow(), {
		type: 'question',
		title: i18n.__('dialog.updateReady.title'),
		message: i18n.__('dialog.updateReady.message'),
		buttons: [
			i18n.__('dialog.updateReady.installLater'),
			i18n.__('dialog.updateReady.installNow'),
		],
		defaultId: 1,
		cancelId: 0,
	}, (response) => resolve(response === 0 ? 'later' : 'now'));
});


const warnDelayedUpdateInstall = () => new Promise ((resolve) => {
	dialog.showMessageBox(getCurrentWindow(), {
		type: 'info',
		title: i18n.__('dialog.updateInstallLater.title'),
		message: i18n.__('dialog.updateInstallLater.message'),
		buttons: [i18n.__('dialog.updateInstallLater.ok')],
		defaultId: 0,
	}, () => resolve());
});


const warnCertificateError = ({ requestUrl, error, certificate: { issuerName }, replace }) => new Promise((resolve) => {
	const detail = `URL: ${ requestUrl }\nError: ${ error }`;

	dialog.showMessageBox(getCurrentWindow(), {
		title: i18n.__('dialog.certificateError.title'),
		message: i18n.__('dialog.certificateError.message', { issuerName }),
		detail: replace ? i18n.__('error.differentCertificate', { detail }) : detail,
		type: 'warning',
		buttons: [
			i18n.__('dialog.certificateError.yes'),
			i18n.__('dialog.certificateError.no'),
		],
		defaultId: 1,
		cancelId: 1,
	}, (response) => resolve(response === 0));
});


const confirmServerAddition = ({ serverUrl }) => new Promise((resolve) => {
	dialog.showMessageBox(getCurrentWindow(), {
		title: i18n.__('dialog.addServer.title'),
		message: i18n.__('dialog.addServer.message', { host: serverUrl }),
		type: 'question',
		buttons: [
			i18n.__('dialog.addServer.add'),
			i18n.__('dialog.addServer.cancel'),
		],
		defaultId: 0,
		cancelId: 1,
	}, (response) => resolve(response === 0));
});


const confirmAppDataReset = () => new Promise((resolve) => {
	dialog.showMessageBox({
		title: i18n.__('dialog.resetAppData.title'),
		message: i18n.__('dialog.resetAppData.message'),
		type: 'question',
		buttons: [
			i18n.__('dialog.resetAppData.yes'),
			i18n.__('dialog.resetAppData.cancel'),
		],
		defaultId: 1,
		cancelId: 1,
	}, (response) => resolve(response === 0));
});


const destroyAll = () => {
	try {
		menus.unmount();
		dock.unmount();
		touchBar.unmount();
		tray.unmount();
		deepLinks.removeAllListeners();
		basicAuth.removeAllListeners();
		certificates.removeAllListeners();
		updates.removeAllListeners();
		getCurrentWindow().removeAllListeners();
	} catch (error) {
		remote.getGlobal('console').error(error.stack || error);
	}
};

const handleSelectionChangeEventListener = () => {
	menus.setState({
		...queryEditFlags(),
		canGoBack: false,
		canGoForward: false,
	});
};

const getFocusedWebContents = () => webviews.getWebContents({ focused: true }) || getCurrentWindow().webContents;

const browseForDictionary = () => {
	const callback = async (filePaths = []) => {
		try {
			await spellchecking.installDictionaries(filePaths);
		} catch (error) {
			console.error(error);
			dialog.showErrorBox(
				i18n.__('dialog.loadDictionaryError.title'),
				i18n.__('dialog.loadDictionaryError.message', { message: error.message })
			);
		}
	};

	dialog.showOpenDialog(getCurrentWindow(), {
		title: i18n.__('dialog.loadDictionary.title'),
		defaultPath: spellchecking.getDictionaryInstallationDirectory(),
		filters: [
			{ name: i18n.__('dialog.loadDictionary.dictionaries'), extensions: ['aff', 'dic'] },
			{ name: i18n.__('dialog.loadDictionary.allFiles'), extensions: ['*'] },
		],
		properties: ['openFile', 'multiSelections'],
	}, callback);
};

const update = () => {
	const {
		windowVisible,
		loading,
		preferences: {
			hasTray,
			hasMenus,
			hasSidebar,
			showWindowOnUnreadChanged,
			enabledDictionaries,
		},
		servers,
	} = store.getState();

	const badges = servers.map(({ badge }) => badge);
	const mentionCount = (
		badges
			.filter((badge) => Number.isInteger(badge))
			.reduce((sum, count) => sum + count, 0)
	);
	const globalBadge = mentionCount || (badges.some((badge) => !!badge) && '•') || null;

	const view = (
		servers.find(({ active }) => active) ||
		'landing'
	);

	getCurrentWindow().hideOnClose = hasTray;

	document.querySelector('.loading').classList.toggle('loading--visible', loading);

	dock.setState({
		hasTray,
		badge: globalBadge,
	});

	landing.setState({
		visible: !loading && view === 'landing',
	});

	menus.setState({
		hasTray,
		hasMenus,
		hasSidebar,
		showWindowOnUnreadChanged,
		servers,
	});

	sidebar.setState({
		servers,
		visible: !loading && hasSidebar,
	});

	spellchecking.setEnabledDictionaries(...enabledDictionaries);

	touchBar.setState({
		servers,
	});

	tray.setState({
		badge: globalBadge,
		isMainWindowVisible: windowVisible,
		visible: hasTray,
	});

	webviews.setState({
		hasSidebar,
		servers,
	});
};

const persistConfig = () => {
	const {
		preferences,
		servers,
		view,
	} = store.getState();

	config.set('preferences', preferences);
	config.set('servers', servers);
	config.set('view', view);
};

export default async () => {
	await i18n.initialize();

	store.subscribe(update);
	store.subscribe(persistConfig);

	getCurrentWindow().on('show', () => store.dispatch(showWindow()));
	getCurrentWindow().on('hide', () => store.dispatch(hideWindow()));

	window.addEventListener('beforeunload', destroyAll);

	document.addEventListener('selectionchange', handleSelectionChangeEventListener);

	aboutModal.on('check-for-updates', () => updates.checkForUpdates());
	aboutModal.on('set-check-for-updates-on-start', (enabled) => updates.setAutoUpdate(enabled));

	basicAuth.on('login-requested', ({ webContentsUrl, callback }) => {
		const { servers } = store.getState();
		const { username, password } = servers.find(({ url }) => webContentsUrl.indexOf(url) === 0) || {};
		callback((username && password) ? [username, password] : null);
	});

	certificates.on('ask-for-trust', async ({ requestUrl, error, certificate, replace, callback }) => {
		const isTrusted = await warnCertificateError({ requestUrl, error, certificate, replace });
		callback(isTrusted);
	});

	contextMenu.on('replace-misspelling', (correction) => getFocusedWebContents().replaceMisspelling(correction));
	contextMenu.on('toggle-dictionary', (dictionary, enabled) => {
		const { preferences: { enabledDictionaries } } = store.getState();
		store.dispatch(setPreferences({
			enabledDictionaries: spellchecking.filterDictionaries(
				enabled ?
					[dictionary, ...enabledDictionaries] :
					enabledDictionaries.filter((_dictionary) => _dictionary !== dictionary)
			),
		}));
	});
	contextMenu.on('browse-for-dictionary', () => browseForDictionary());

	contextMenu.on('save-image-as', (url) => getFocusedWebContents().downloadURL(url)),

	contextMenu.on('open-link', (url) => shell.openExternal(url));
	contextMenu.on('copy-link-text', ({ text }) => clipboard.write({ text, bookmark: text }));
	contextMenu.on('copy-link-address', ({ text, url }) => clipboard.write({ text: url, bookmark: text }));

	contextMenu.on('undo', () => getFocusedWebContents().undo());
	contextMenu.on('redo', () => getFocusedWebContents().redo());
	contextMenu.on('cut', () => getFocusedWebContents().cut());
	contextMenu.on('copy', () => getFocusedWebContents().copy());
	contextMenu.on('paste', () => getFocusedWebContents().paste());
	contextMenu.on('select-all', () => getFocusedWebContents().selectAll());

	deepLinks.on('auth', async ({ serverUrl }) => {
		getCurrentWindow().forceFocus();

		const { servers } = store.getState();

		if (servers.findIndex(({ url }) => url === serverUrl) > -1) {
			servers.setActive(serverUrl);
			return;
		}

		const shouldAdd = await confirmServerAddition({ serverUrl });
		if (!shouldAdd) {
			return;
		}

		try {
			await servers.validate(serverUrl);
			servers.add(serverUrl);
			servers.setActive(serverUrl);
		} catch (error) {
			dialog.showErrorBox(
				i18n.__('dialog.addServerError.title'),
				i18n.__('dialog.addServerError.message', { host: serverUrl })
			);
		}
	});

	landing.on('add-server', (serverUrl) => {
		servers.add(serverUrl);
		servers.setActive(serverUrl);
	});

	landing.on('validate', async (serverUrl, callback) => {
		callback(await servers.validate(serverUrl));
	});

	menus.on('quit', () => app.quit());
	menus.on('about', () => aboutModal.setState({ visible: true }));
	menus.on('open-url', (url) => shell.openExternal(url));

	menus.on('undo', () => getFocusedWebContents().undo());
	menus.on('redo', () => getFocusedWebContents().redo());
	menus.on('cut', () => getFocusedWebContents().cut());
	menus.on('copy', () => getFocusedWebContents().copy());
	menus.on('paste', () => getFocusedWebContents().paste());
	menus.on('select-all', () => getFocusedWebContents().selectAll());

	menus.on('reset-zoom', () => webviews.resetZoom({ active: true }));
	menus.on('zoom-in', () => webviews.zoomIn({ active: true }));
	menus.on('zoom-out', () => webviews.zoomOut({ active: true }));

	menus.on('add-new-server', () => {
		getCurrentWindow().show();
		servers.setActive(null);
	});

	menus.on('select-server', ({ url }) => {
		getCurrentWindow().show();
		servers.setActive(url);
	});

	menus.on('reload-server', ({ ignoringCache = false, clearCertificates = false } = {}) => {
		if (clearCertificates) {
			certificates.clear();
		}

		webviews.reload({ active: true }, { ignoringCache });
	});

	menus.on('open-devtools-for-server', () => {
		webviews.openDevTools({ active: true });
	});

	menus.on('go-back', () => {
		webviews.goBack({ active: true });
	});

	menus.on('go-forward', () => {
		webviews.goForward({ active: true });
	});

	menus.on('reload-app', () => getCurrentWindow().reload());

	menus.on('toggle-devtools', () => getCurrentWindow().toggleDevTools());

	menus.on('reset-app-data', async () => {
		const shouldReset = await confirmAppDataReset();

		if (shouldReset) {
			relaunch('--reset-app-data');
		}
	});

	menus.on('toggle', (property, value) => {
		switch (property) {
			case 'hasTray': {
				store.dispatch(setPreferences({ hasTray: value }));
				break;
			}

			case 'hasMenus': {
				store.dispatch(setPreferences({ hasMenus: value }));
				break;
			}

			case 'hasSidebar': {
				store.dispatch(setPreferences({ hasSidebar: value }));
				break;
			}

			case 'showWindowOnUnreadChanged': {
				store.dispatch(setPreferences({ showWindowOnUnreadChanged: value }));
				break;
			}
		}
	});

	screenshareModal.on('select-source', ({ id, url }) => {
		screenshareModal.setState({ visible: false });
		webviews.selectScreenshareSource({ url }, id);
	});

	servers.on('loaded', (entries, fromDefaults) => {
		if (fromDefaults) {
			if (Object.keys(entries).length <= 1) {
				store.dispatch(setPreferences({ hasSidebar: false }));
			}
		}
		store.dispatch(loadServers(entries));
	});

	servers.on('added', (/* entry */) => {
		store.dispatch(loadServers(servers.getAll()));
	});

	servers.on('removed', (/* entry */) => {
		store.dispatch(loadServers(servers.getAll()));
	});

	servers.on('updated', (/* entry */) => {
		store.dispatch(loadServers(servers.getAll()));
	});

	servers.on('sorted', () => {
		store.dispatch(loadServers(servers.getAll()));
	});

	servers.on('active-setted', (/* entry */) => {
		store.dispatch(loadServers(servers.getAll()));
	});

	servers.on('active-cleared', () => {
		store.dispatch(loadServers(servers.getAll()));
	});

	servers.on('title-setted', () => {
		store.dispatch(loadServers(servers.getAll()));
	});

	sidebar.on('select-server', (url) => {
		servers.setActive(url);
	});

	sidebar.on('reload-server', (url) => {
		webviews.reload({ url });
	});

	sidebar.on('remove-server', (url) => {
		servers.remove(url);
	});

	sidebar.on('open-devtools-for-server', (url) => {
		webviews.openDevTools({ url });
	});

	sidebar.on('add-server', () => {
		servers.setActive(null);
	});

	sidebar.on('servers-sorted', (urls) => {
		servers.sort(urls);
	});

	touchBar.on('format', (buttonId) => {
		webviews.format({ active: true }, buttonId);
	});

	touchBar.on('select-server', (url) => {
		servers.setActive(url);
	});

	tray.on('set-main-window-visibility', (visible) =>
		(visible ? getCurrentWindow().show() : getCurrentWindow().hide()));
	tray.on('quit', () => app.quit());

	updateModal.on('skip', (newVersion) => {
		dialog.showMessageBox(getCurrentWindow(), {
			type: 'warning',
			title: i18n.__('dialog.updateSkip.title'),
			message: i18n.__('dialog.updateSkip.message'),
			buttons: [i18n.__('dialog.updateSkip.ok')],
			defaultId: 0,
		}, () => {
			updates.skipVersion(newVersion);
			updateModal.setState({ visible: false });
		});
	});
	updateModal.on('remind-later', () => {
		updateModal.setState({ visible: false });
	});
	updateModal.on('install', () => {
		dialog.showMessageBox(getCurrentWindow(), {
			type: 'info',
			title: i18n.__('dialog.updateDownloading.title'),
			message: i18n.__('dialog.updateDownloading.message'),
			buttons: [i18n.__('dialog.updateDownloading.ok')],
			defaultId: 0,
		}, () => {
			updates.downloadUpdate();
			updateModal.setState({ visible: false });
		});
	});

	updates.on('configuration-set', ({ canUpdate, canAutoUpdate, canSetAutoUpdate }) => {
		aboutModal.setState({ canUpdate, canAutoUpdate, canSetAutoUpdate });
	});
	updates.on('error', () => aboutModal.showUpdateError());
	updates.on('checking-for-update', () => aboutModal.setState({ checking: true }));
	updates.on('update-available', ({ version }) => {
		aboutModal.setState({
			visible: false,
			checking: false,
			checkingMessage: null,
		});
		updateModal.setState({
			visible: true,
			newVersion: version,
		});
	});
	updates.on('update-not-available', () => aboutModal.showNoUpdateAvailable());
	// updates.on('download-progress', ({ bytesPerSecond, percent, total, transferred }) => console.log(percent));
	updates.on('update-downloaded', async () => {
		const whenInstall = await askWhenToInstallUpdate();

		if (whenInstall === 'later') {
			await warnDelayedUpdateInstall();
			return;
		}

		destroyAll();
		updates.quitAndInstall();
	});

	webviews.on(channels.badgeChanged, (url, badge) => {
		const { preferences: { showWindowOnUnreadChanged } } = store.getState();
		if (typeof badge === 'number' && showWindowOnUnreadChanged) {
			const mainWindow = remote.getCurrentWindow();
			mainWindow.showInactive();
		}

		servers.set(url, { badge });
	});

	webviews.on(channels.titleChanged, (url, title) => {
		servers.set(url, { title });
	});

	webviews.on(channels.focus, (url) => {
		servers.setActive(url);
	});

	webviews.on(channels.sidebarStyleChanged, (url, style) => {
		servers.set(url, { style });
	});

	webviews.on(channels.selectScreenshareSource, (url) => {
		screenshareModal.setState({ visible: false, url });
	});

	webviews.on(channels.reloadServer, (url) => {
		webviews.reload({ url }, { fromUrl: true });
	});

	webviews.on(channels.editFlagsChanged, (url, editFlags) => {
		menus.setState({
			...editFlags,
			canGoBack: webviews.getWebContents({ url }).canGoBack(),
			canGoForward: webviews.getWebContents({ url }).canGoForward(),
		});
	});

	webviews.on(channels.triggerContextMenu, (url, params) => {
		const {
			preferences: {
				enabledDictionaries,
			},
		} = store.getState();
		const { selectionText } = params;
		const corrections = spellchecking.getCorrections(selectionText);
		const availableDictionaries = spellchecking.getAvailableDictionaries();
		const dictionaries = availableDictionaries.map((dictionary) => ({
			dictionary,
			enabled: enabledDictionaries.includes(dictionary),
		}));
		const multipleDictionaries = spellchecking.supportsMultipleDictionaries();

		contextMenu.trigger({ ...params, corrections, dictionaries, multipleDictionaries });
	});

	webviews.on('did-navigate', (url, lastPath) => {
		servers.set(url, { lastPath });
		menus.setState({
			canGoBack: webviews.getWebContents({ url }).canGoBack(),
			canGoForward: webviews.getWebContents({ url }).canGoForward(),
		});
	});

	webviews.on('ready', () => {
		store.dispatch(stopLoading());
	});

	sidebar.mount();
	landing.mount();
	webviews.mount();
	touchBar.mount();
	aboutModal.mount();
	screenshareModal.mount();
	updateModal.mount();

	await servers.initialize();

	store.dispatch(loadPreferences(preferences.load()));
	store.dispatch(loadServers(servers.getAll()));
};
