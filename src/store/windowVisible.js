const SHOW_WINDOW = 'SHOW_WINDOW';
const HIDE_WINDOW = 'HIDE_WINDOW';


export const showWindow = () => ({ type: SHOW_WINDOW });

export const hideWindow = () => ({ type: HIDE_WINDOW });

const initialState = true;

export const reducer = (state = initialState, { type }) => {
	switch (type) {
		case SHOW_WINDOW:
			return true;

		case HIDE_WINDOW:
			return false;
	}

	return state;
};
