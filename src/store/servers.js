const LOAD_SERVERS = 'LOAD_SERVERS';
const SET_SERVER_SIDEBAR_STYLE = 'SET_SERVER_SIDEBAR_STYLE';

export const loadServers = (servers) => ({
	type: LOAD_SERVERS,
	payload: servers,
});

export const setServerSidebarStyle = (url, style) => ({
	type: SET_SERVER_SIDEBAR_STYLE,
	payload: { url, style },
});


const initialState = [];

export const reducer = (state = initialState, { type, payload }) => {
	switch (type) {
		case LOAD_SERVERS:
			return [...state, ...payload];

		case SET_SERVER_SIDEBAR_STYLE: {
			const { url, style } = payload;
			return state.map((server) => {
				if (server.url === url) {
					return { ...server, style };
				}
				return server;
			});
		}
	}

	return state;
};
