const LOAD_SERVERS = 'LOAD_SERVERS';

export const loadServers = (servers) => ({
	type: LOAD_SERVERS,
	payload: servers,
});

export const reducer = (state = [], { type, payload }) => {
	switch (type) {
		case LOAD_SERVERS:
			return [...payload];
	}

	return state;
};
