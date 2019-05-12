const LOAD_PREFERENCES = 'LOAD_PREFERENCES';
const SET_PREFERENCE = 'SET_PREFERENCE';

export const loadPreferences = (preferences) => ({
	type: LOAD_PREFERENCES,
	payload: preferences,
});

export const setPreference = (preference, value) => ({
	type: SET_PREFERENCE,
	payload: {
		[preference]: value,
	},
});

const initialState = {
	hasTray: process.platform !== 'linux',
	hasMenus: true,
	hasSidebar: true,
	showWindowOnUnreadChanged: false,
};

export const reducer = (state = initialState, { type, payload }) => {
	switch (type) {
		case LOAD_PREFERENCES:
			return { ...state, ...payload };

		case SET_PREFERENCE:
			return { ...state, ...payload };
	}

	return state;
};
