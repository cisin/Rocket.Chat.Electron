import { app, BrowserWindow, screen } from 'electron';
import { loadJson, writeJson } from '../utils';


export let mainWindow = null;

let state = {};

const loadState = async () => {
	const { x, y, width, height, isMinimized, isMaximized, isHidden } =
		await loadJson('window-state-main.json', 'user');

	state = { x, y, width, height, isMinimized, isMaximized, isHidden };

	if (!state.x || !state.y || !state.width || !state.height) {
		({ x: state.x, y: state.y, width: state.width, height: state.height } = mainWindow.getNormalBounds());
	}

	const isInsideSomeDisplay = screen.getAllDisplays().some(({ workArea: { x, y, width, height } }) => (
		state.x >= x &&
		state.y >= y &&
		state.x + state.width <= x + width &&
		state.y + state.height <= y + height
	));

	if (!isInsideSomeDisplay) {
		const { bounds: { width, height } } = screen.getPrimaryDisplay();
		state.x = (width - state.width) / 2;
		state.y = (height - state.height) / 2;
	}

	mainWindow.setBounds({ x: state.x, y: state.y, width: state.width, height: state.height });
};

const fetchState = () => {
	({ x: state.x, y: state.y, width: state.width, height: state.height } = mainWindow.getNormalBounds());
	state.isMinimized = mainWindow.isMinimized();
	state.isMaximized = mainWindow.isMaximized();
	state.isHidden = !mainWindow.isVisible();

	if (fetchState.timeout) {
		clearTimeout(fetchState.timeout);
	}

	fetchState.timeout = setTimeout(async () => {
		await writeJson('window-state-main.json', state);
	}, 1000);
};

const handleFocus = () => {
	mainWindow.flashFrame(false);
};

const handleClose = async (event) => {
	event.preventDefault();
	await new Promise((resolve) => {
		if (mainWindow.isFullScreen()) {
			mainWindow.once('leave-full-screen', resolve);
			mainWindow.setFullScreen(false);
			return;
		}
		resolve();
	});
	mainWindow.blur();

	const { hideOnClose } = mainWindow;

	if (!hideOnClose) {
		fetchState();
	}

	switch (process.platform) {
		case 'darwin': {
			mainWindow.hide();
			break;
		}

		case 'linux': {
			if (hideOnClose) {
				mainWindow.hide();
			} else {
				mainWindow.destroy();
			}
			break;
		}

		case 'win32': {
			if (hideOnClose) {
				mainWindow.hide();
			} else {
				mainWindow.minimize();
			}
			break;
		}
	}

	if (hideOnClose) {
		fetchState();
	}
};

const forceFocus = () => {
	mainWindow.showInactive();

	if (mainWindow.isMinimized()) {
		mainWindow.restore();
	}

	mainWindow.focus();
};

const showIfNeeded = () => {
	const { hideOnClose } = mainWindow;
	const { isMaximized, isMinimized, isHidden } = state;

	if (isMaximized) {
		mainWindow.maximize();
	}

	if (isMinimized) {
		mainWindow.minimize();
	}

	if (hideOnClose) {
		isHidden ? mainWindow.hide() : mainWindow.show();
		return;
	}

	switch (process.platform) {
		case 'darwin': {
			isHidden ? mainWindow.hide() : mainWindow.show();
			break;
		}

		case 'linux':
		case 'win32': {
			if (isHidden) {
				mainWindow.minimize();
				mainWindow.showInactive();
			} else {
				mainWindow.show();
			}
			break;
		}
	}
};

export const createMainWindow = async () => {
	mainWindow = new BrowserWindow({
		width: 1000,
		height: 700,
		minWidth: 600,
		minHeight: 400,
		titleBarStyle: 'hidden',
		show: false,
		webPreferences: {
			nodeIntegration: true,
			webviewTag: true,
		},
	});

	await loadState();

	mainWindow.on('move', fetchState);
	mainWindow.on('resize', fetchState);
	mainWindow.on('minimize', fetchState);
	mainWindow.on('restore', fetchState);
	mainWindow.on('maximize', fetchState);
	mainWindow.on('unmaximize', fetchState);
	mainWindow.on('show', fetchState);
	mainWindow.on('hide', fetchState);
	mainWindow.on('focus', handleFocus);
	mainWindow.on('close', handleClose);

	mainWindow.hideOnClose = false;
	mainWindow.forceFocus = forceFocus;
	mainWindow.showIfNeeded = showIfNeeded;

	mainWindow.loadFile(`${ app.getAppPath() }/app/public/app.html`);

	if (process.env.NODE_ENV === 'development') {
		mainWindow.webContents.openDevTools();
	}

	await new Promise((resolve) => mainWindow.once('ready-to-show', resolve));
};
