import { app as mainApp, remote } from 'electron';
const app = mainApp || remote.app;


const LOAD_PREFERENCES = 'LOAD_PREFERENCES';
const SET_PREFERENCES = 'SET_PREFERENCES';

export const loadPreferences = (preferences) => ({
	type: LOAD_PREFERENCES,
	payload: preferences,
});

export const setPreferences = (preferences) => ({
	type: SET_PREFERENCES,
	payload: preferences,
});

const filterState = ({
	hasTray = process.platform !== 'linux',
	hasMenus = true,
	hasSidebar = true,
	showWindowOnUnreadChanged = false,
	enabledDictionaries = [app.getLocale()],
}) => ({
	hasTray,
	hasMenus,
	hasSidebar,
	showWindowOnUnreadChanged,
	enabledDictionaries,
});

export const reducer = (state = filterState({}), { type, payload }) => {
	switch (type) {
		case LOAD_PREFERENCES:
			return filterState({ ...payload });

		case SET_PREFERENCES:
			return filterState({ ...state, ...payload });

	}

	return state;
};
