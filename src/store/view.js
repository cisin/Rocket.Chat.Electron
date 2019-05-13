const SHOW_LANDING = 'SHOW_LANDING';
const SHOW_SERVER = 'SHOW_SERVER';


export const showLanding = () => ({ type: SHOW_LANDING });

export const showServer = (url) => ({ type: SHOW_SERVER, payload: url });

export const reducer = (state = 'landing', { type, payload }) => {
	switch (type) {
		case SHOW_LANDING:
			return 'landing';

		case SHOW_SERVER:
			return { url: payload };
	}

	return state;
};
