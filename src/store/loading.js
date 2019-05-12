const START_LOADING = 'START_LOADING';
const STOP_LOADING = 'STOP_LOADING';


export const startLoading = () => ({ type: START_LOADING });
export const stopLoading = () => ({ type: STOP_LOADING });

const initialState = true;

export const reducer = (state = initialState, { type }) => {
	switch (type) {
		case 'START_LOADING':
			return true;

		case 'STOP_LOADING':
			return false;
	}

	return state;
};
