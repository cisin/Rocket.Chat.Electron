import { app, Menu } from 'electron';
import { EventEmitter } from 'events';
import { mainWindow } from './mainWindow';
import i18n from '../i18n';


let state = {};
const events = new EventEmitter();

const createTemplate = ({
	appName,
	servers = [],
	showTrayIcon = true,
	showMenuBar = true,
	showServerList = true,
	showWindowOnUnreadChanged = false,
	canUndo = true,
	canRedo = true,
	canCut = true,
	canCopy = true,
	canPaste = true,
	canSelectAll = true,
	canGoBack = true,
	canGoForward = true,
}) => ([
	{
		label: process.platform === 'darwin' ? appName : i18n.__('menus.fileMenu'),
		submenu: [
			...(process.platform === 'darwin' ? [
				{
					label: i18n.__('menus.about', { appName }),
					click: () => events.emit('about'),
				},
				{
					type: 'separator',
				},
				{
					submenu: [],
					role: 'services',
				},
				{
					type: 'separator',
				},
				{
					accelerator: 'Command+H',
					role: 'hide',
				},
				{
					accelerator: 'Command+Alt+H',
					role: 'hideothers',
				},
				{
					role: 'unhide',
				},
				{
					type: 'separator',
				},
			] : []),
			...(process.platform !== 'darwin' ? [
				{
					label: i18n.__('menus.addNewServer'),
					accelerator: 'CommandOrControl+N',
					click: () => events.emit('add-new-server'),
				},
			] : []),
			{
				type: 'separator',
			},
			{
				label: i18n.__('menus.quit', { appName }),
				accelerator: 'CommandOrControl+Q',
				click: () => events.emit('quit'),
			},
		],
	},
	{
		label: i18n.__('menus.editMenu'),
		submenu: [
			{
				label: i18n.__('menus.undo'),
				accelerator: 'CommandOrControl+Z',
				enabled: canUndo,
				click: () => events.emit('undo'),
			},
			{
				label: i18n.__('menus.redo'),
				accelerator: process.platform === 'win32' ? 'Control+Y' : 'CommandOrControl+Shift+Z',
				enabled: canRedo,
				click: () => events.emit('redo'),
			},
			{
				type: 'separator',
			},
			{
				label: i18n.__('menus.cut'),
				accelerator: 'CommandOrControl+X',
				enabled: canCut,
				click: () => events.emit('cut'),
			},
			{
				label: i18n.__('menus.copy'),
				accelerator: 'CommandOrControl+C',
				enabled: canCopy,
				click: () => events.emit('copy'),
			},
			{
				label: i18n.__('menus.paste'),
				accelerator: 'CommandOrControl+V',
				enabled: canPaste,
				click: () => events.emit('paste'),
			},
			{
				label: i18n.__('menus.selectAll'),
				accelerator: 'CommandOrControl+A',
				enabled: canSelectAll,
				click: () => events.emit('select-all'),
			},
		],
	},
	{
		label: i18n.__('menus.viewMenu'),
		submenu: [
			{
				label: i18n.__('menus.reload'),
				accelerator: 'CommandOrControl+R',
				click: () => events.emit('reload-server'),
			},
			{
				label: i18n.__('menus.reloadIgnoringCache'),
				click: () => events.emit('reload-server', { ignoringCache: true }),
			},
			{
				label: i18n.__('menus.clearTrustedCertificates'),
				click: () => events.emit('reload-server', { ignoringCache: true, clearCertificates: true }),
			},
			{
				label: i18n.__('menus.openDevTools'),
				accelerator: process.platform === 'darwin' ? 'Command+Alt+I' : 'Ctrl+Shift+I',
				click: () => events.emit('open-devtools-for-server'),
			},
			{
				type: 'separator',
			},
			{
				label: i18n.__('menus.back'),
				accelerator: process.platform === 'darwin' ? 'Command+[' : 'Alt+Left',
				enabled: canGoBack,
				click: () => events.emit('go-back'),
			},
			{
				label: i18n.__('menus.forward'),
				accelerator: process.platform === 'darwin' ? 'Command+]' : 'Alt+Right',
				enabled: canGoForward,
				click: () => events.emit('go-forward'),
			},
			{
				type: 'separator',
			},
			{
				label: i18n.__('menus.showTrayIcon'),
				type: 'checkbox',
				checked: showTrayIcon,
				click: ({ checked }) => events.emit('toggle', 'showTrayIcon', checked),
			},
			...(process.platform !== 'darwin' ? [
				{
					label: i18n.__('menus.showMenuBar'),
					type: 'checkbox',
					checked: showMenuBar,
					click: ({ checked }) => events.emit('toggle', 'showMenuBar', checked),
				},
			] : []),
			{
				label: i18n.__('menus.showServerList'),
				type: 'checkbox',
				checked: showServerList,
				click: ({ checked }) => events.emit('toggle', 'showServerList', checked),
			},
			{
				type: 'separator',
			},
			{
				label: i18n.__('menus.resetZoom'),
				accelerator: 'CommandOrControl+0',
				click: () => events.emit('reset-zoom'),
			},
			{
				label: i18n.__('menus.zoomIn'),
				accelerator: 'CommandOrControl+Plus',
				click: () => events.emit('zoom-in'),
			},
			{
				label: i18n.__('menus.zoomOut'),
				accelerator: 'CommandOrControl+-',
				click: () => events.emit('zoom-out'),
			},
		],
	},
	{
		label: i18n.__('menus.windowMenu'),
		role: 'window',
		submenu: [
			...(process.platform === 'darwin' ? [
				{
					label: i18n.__('menus.addNewServer'),
					accelerator: 'CommandOrControl+N',
					click: () => events.emit('add-new-server'),
				},
				{
					type: 'separator',
				},
			] : []),
			...servers.map((server, i) => ({
				label: (server.title && server.title.replace(/&/g, '&&')) || server.url,
				type: server.active ? 'radio' : 'normal',
				checked: server.active,
				accelerator: `CommandOrControl+${ i + 1 }`,
				click: () => events.emit('select-server', server),
			})),
			{
				type: 'separator',
			},
			{
				label: i18n.__('menus.reload'),
				accelerator: 'CommandOrControl+Shift+R',
				click: () => events.emit('reload-app'),
			},
			{
				label: i18n.__('menus.toggleDevTools'),
				click: () => events.emit('toggle-devtools'),
			},
			{
				type: 'separator',
			},
			{
				label: i18n.__('menus.showOnUnreadMessage'),
				type: 'checkbox',
				checked: showWindowOnUnreadChanged,
				click: ({ checked }) => events.emit('toggle', 'showWindowOnUnreadChanged', checked),
			},
			{
				type: 'separator',
			},
			{
				label: i18n.__('menus.minimize'),
				accelerator: 'CommandOrControl+M',
				role: 'minimize',
			},
			...(process.platform === 'darwin' ? [
				{
					label: i18n.__('menus.showFullScreen'),
					accelerator: 'Control+Command+F',
					role: 'toggleFullScreen',
				},
			] : []),
			{
				label: i18n.__('menus.close'),
				accelerator: 'CommandOrControl+W',
				role: 'close',
			},
		],
	},
	{
		label: i18n.__('menus.helpMenu'),
		role: 'help',
		submenu: [
			{
				label: i18n.__('menus.documentation'),
				click: () => events.emit('open-url', 'https://rocket.chat/docs'),
			},
			{
				type: 'separator',
			},
			{
				label: i18n.__('menus.reportIssue'),
				click: () => events.emit('open-url', 'https://github.com/RocketChat/Rocket.Chat.Electron/issues/new'),
			},
			{
				label: i18n.__('menus.resetAppData'),
				click: () => events.emit('reset-app-data'),
			},
			{
				type: 'separator',
			},
			{
				label: i18n.__('menus.learnMore'),
				click: () => events.emit('open-url', 'https://rocket.chat'),
			},
			...(process.platform !== 'darwin' ? [
				{
					label: i18n.__('menus.about', { appName }),
					click: () => events.emit('about'),
				},
			] : []),
		],
	},
]);

const update = () => {
	const template = createTemplate({ appName: app.getName(), ...state });
	const menu = Menu.buildFromTemplate(template);
	Menu.setApplicationMenu(menu);

	if (process.platform !== 'darwin') {
		const { showMenuBar } = state;
		mainWindow.setAutoHideMenuBar(!showMenuBar);
		mainWindow.setMenuBarVisibility(!!showMenuBar);
	}
};

const setState = (partialState) => {
	const previousState = state;
	state = {
		...state,
		...partialState,
	};
	update(previousState);
};

const mount = () => {
	update();
};

const unmount = () => {
	events.removeAllListeners();

	if (process.platform !== 'darwin') {
		Menu.setApplicationMenu(null);
		return;
	}

	const emptyMenuTemplate = [{
		label: app.getName(),
		submenu: [
			{
				label: i18n.__('menus.quit', { appName: app.getName() }),
				accelerator: 'CommandOrControl+Q',
				click: () => app.quit(),
			},
		],
	}];
	Menu.setApplicationMenu(Menu.buildFromTemplate(emptyMenuTemplate));
};

export const menus = Object.assign(events, {
	setState,
	mount,
	unmount,
});
