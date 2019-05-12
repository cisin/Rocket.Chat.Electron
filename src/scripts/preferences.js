const persist = async (entries) => localStorage.setItem('preferences', JSON.stringify(entries));

const load = async () => {
	let entries;
	try {
		entries = JSON.parse(localStorage.getItem('preferences')) || {};
	} catch (error) {
		entries = {};
	}

	if (localStorage.getItem('hideTray')) {
		entries.hasTray = localStorage.getItem('hideTray') !== 'true';
		localStorage.removeItem('hideTray');
	}

	if (localStorage.getItem('autohideMenu')) {
		entries.hasMenus = localStorage.getItem('autohideMenu') !== 'true';
		localStorage.removeItem('autohideMenu');
	}

	if (localStorage.getItem('sidebar-closed')) {
		entries.hasSidebar = localStorage.getItem('sidebar-closed') !== 'true';
		localStorage.removeItem('sidebar-closed');
	}

	if (localStorage.getItem('showWindowOnUnreadChanged')) {
		entries.showWindowOnUnreadChanged = localStorage.getItem('showWindowOnUnreadChanged') === 'true';
		localStorage.removeItem('showWindowOnUnreadChanged');
	}

	await persist(entries);

	return entries;
};

export const preferences = {
	load,
	persist,
};
