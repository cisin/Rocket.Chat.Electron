import { remote } from 'electron';
import { EventEmitter } from 'events';
import url from 'url';
import { normalizeServerUrl, loadJson } from '../utils';
const { config } = remote.require('./main');


let entries = [];

const events = new EventEmitter();

const has = (serverUrl) => entries.some(({ url }) => url === serverUrl);

const get = (serverUrl) => entries.find(({ url }) => url === serverUrl);

const getAll = () => entries;

const setActive = (serverUrl) => {
	for (const entry of entries) {
		entry.active = entry.url === serverUrl;
	}

	const activatedServer = entries.find(({ active }) => active);
	activatedServer ? events.emit('active-setted', activatedServer) : events.emit('active-cleared');
};

const set = (serverUrl, { url, active, ...entry }) => {
	const index = entries.findIndex(({ url }) => url === serverUrl);
	if (index < 0) {
		return;
	}

	const isTitleChanging = entries[index].title !== entry.title;

	entries[index] = {
		...entries[index],
		...entry,
	};

	if (isTitleChanging) {
		events.emit('title-setted', entries[index]);
		return;
	}

	events.emit('updated', entries[index]);
};

const add = (serverUrl) => {
	const index = entries.findIndex(({ url }) => url === serverUrl);
	if (index > -1) {
		setActive(serverUrl);
		return;
	}

	const entry = {
		url: serverUrl,
	};

	const parsedUrl = url.parse(serverUrl);
	const { auth } = parsedUrl;
	if (auth) {
		entry.authUrl = serverUrl;
		delete parsedUrl.auth;
		entry.url = url.format(parsedUrl);
		[entry.username, entry.password] = auth.split(':');
	}

	entry.title = entry.url;

	entries.push(entry);

	events.emit('added', entry);
};

const remove = (serverUrl) => {
	const index = entries.findIndex(({ url }) => url === serverUrl);
	if (index < 0) {
		return;
	}

	const entry = entries[index];
	entries.splice(index, 1);

	if (!entries.some(({ active }) => active)) {
		const activatedServer = entries.find(({ active }) => active);
		activatedServer ? events.emit('active-setted', activatedServer) : events.emit('active-cleared');
	}

	events.emit('removed', entry);
};

const sort = (urls) => {
	entries = entries.sort(({ url: a }, { url: b }) => urls.indexOf(a) - urls.indexOf(b));

	events.emit('sorted');
};

const migrateFromLocalStorage = () => {
	const value = localStorage.getItem('rocket.chat.hosts');

	if (typeof value !== 'string') {
		return;
	}

	if (value.match(/^https?:\/\//)) {
		const url = normalizeServerUrl(value);
		entries = [
			{
				url,
				title: url,
				active: true,
			},
		];
		return;
	}

	try {
		const parsedEntries = JSON.parse(value);
		const active = (() => {
			try {
				const value = localStorage.getItem('rocket.chat.currentHost');
				return (!value || value === 'null') ? null : normalizeServerUrl(value);
			} catch (error) {
				return null;
			}
		})();
		const sorting = (() => {
			try {
				return JSON.parse(localStorage.getItem('rocket.chat.sortOrder')) || [];
			} catch (error) {
				return [];
			}
		})();

		if (Array.isArray(parsedEntries)) {
			entries = (
				parsedEntries
					.map(normalizeServerUrl)
					.map((url) => ({
						url,
						title: url,
						active: url === active,
					}))
					.sort(({ url: a }, { url: b }) => sorting.indexOf(a) - sorting.indexOf(b))
			);
			return;
		}

		if (typeof parsedEntries !== 'object') {
			return;
		}

		entries = (
			Object.values(parsedEntries)
				.map(({ url, ...props }) => ({
					url,
					...props,
					active: url === active,
				}))
				.sort(({ url: a }, { url: b }) => sorting.indexOf(a) - sorting.indexOf(b))
		);
	} catch (error) {
		entries = [];
	}

	localStorage.removeItem('rocket.chat.hosts');
	localStorage.removeItem('rocket.chat.currentHost');
	localStorage.removeItem('rocket.chat.sortOrder');
};

const migrateFromDefaults = async () => {
	const appEntries = await loadJson('servers.json', 'app');
	const userEntries = await loadJson('servers.json', 'user');
	entries = [
		...(
			Object.entries(appEntries)
				.map(([title, url]) => ({
					url: normalizeServerUrl(url),
					title,
				}))
		),
		...(
			Object.entries(userEntries)
				.map(([title, url]) => ({
					url: normalizeServerUrl(url),
					title,
				}))
		),
	];

	if (entries[0]) {
		entries[0].active = true;
	}
};

const initialize = async () => {
	if (localStorage.getItem('rocket.chat.hosts')) {
		await migrateFromLocalStorage();
		events.emit('loaded', entries);
		return;
	}

	entries = config.get('servers', []);

	if (entries.length === 0) {
		await migrateFromDefaults();
		events.emit('loaded', entries, true);
		return;
	}

	events.emit('loaded', entries);
};

const validate = async (serverUrl, timeout = 5000) => {
	try {
		const headers = new Headers();

		if (serverUrl.includes('@')) {
			const url = new URL(serverUrl);
			serverUrl = url.origin;
			headers.set('Authorization', `Basic ${ btoa(`${ url.username }:${ url.password }`) }`);
		}
		const response = await Promise.race([
			fetch(`${ serverUrl }/api/info`, { headers }),
			new Promise((resolve, reject) => setTimeout(() => reject('timeout'), timeout)),
		]);

		if (response.status === 401) {
			return 'basic-auth';
		}

		if (!response.ok) {
			return 'invalid';
		}

		const { success } = await response.json();
		if (!success) {
			return 'invalid';
		}

		return 'valid';
	} catch (error) {
		return 'invalid';
	}
};

export const servers = Object.assign(events, {
	initialize,
	has,
	get,
	getAll,
	setActive,
	set,
	add,
	remove,
	sort,
	validate,
});
