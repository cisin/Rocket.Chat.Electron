import { remote } from 'electron';
const { config } = remote.require('./main');


const load = () => {
	const preferences = config.get('preferences', {
		hasTray: process.platform !== 'linux',
		hasMenus: true,
		hasSidebar: true,
		showWindowOnUnreadChanged: false,
		enabledDictionaries: [navigator.language],
	});

	if (localStorage.getItem('hideTray')) {
		preferences.hasTray = localStorage.getItem('hideTray') !== 'true';
		localStorage.removeItem('hideTray');
	}

	if (localStorage.getItem('autohideMenu')) {
		preferences.hasMenus = localStorage.getItem('autohideMenu') !== 'true';
		localStorage.removeItem('autohideMenu');
	}

	if (localStorage.getItem('sidebar-closed')) {
		preferences.hasSidebar = localStorage.getItem('sidebar-closed') !== 'true';
		localStorage.removeItem('sidebar-closed');
	}

	if (localStorage.getItem('showWindowOnUnreadChanged')) {
		preferences.showWindowOnUnreadChanged = localStorage.getItem('showWindowOnUnreadChanged') === 'true';
		localStorage.removeItem('showWindowOnUnreadChanged');
	}

	if (localStorage.getItem('spellcheckerDictionaries')) {
		try {
			const dictionaries = JSON.parse(localStorage.getItem('spellcheckerDictionaries'));
			preferences.enabledDictionaries = Array.isArray(dictionaries) ? dictionaries.map(String) : [];
		} finally {
			localStorage.removeItem('spellcheckerDictionaries');
		}
	}

	return preferences;
};

export const preferences = {
	load,
};
