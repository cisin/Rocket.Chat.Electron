import { remote } from 'electron';
import { EventEmitter } from 'events';
import i18n from '../i18n';
const { getCurrentWindow, Menu } = remote;


const events = new EventEmitter();

const createSpellCheckingMenuTemplate = ({
	corrections = [],
	dictionaries = [],
	multipleDictionaries,
	isEditable,
}) => {
	if (!isEditable) {
		return [];
	}

	return [
		...(corrections ? [
			...(corrections.length === 0 ? (
				[
					{
						label: i18n.__('contextMenu.noSpellingSuggestions'),
						enabled: false,
					},
				]
			) : (
				corrections.slice(0, 6).map((correction) => ({
					label: correction,
					click: () => events.emit('replace-misspelling', correction),
				}))
			)),
			...(corrections.length > 6 ? [
				{
					label: i18n.__('contextMenu.moreSpellingSuggestions'),
					submenu: corrections.slice(6).map((correction) => ({
						label: correction,
						click: () => events.emit('replace-misspelling', correction),
					})),
				},
			] : []),
			{
				type: 'separator',
			},
		] : []),
		{
			label: i18n.__('contextMenu.spellingLanguages'),
			enabled: dictionaries.length > 0,
			submenu: [
				...dictionaries.map(({ dictionary, enabled }) => ({
					label: dictionary,
					type: multipleDictionaries ? 'checkbox' : 'radio',
					checked: enabled,
					click: ({ checked }) => events.emit('toggle-dictionary', dictionary, checked),
				})),
				{
					type: 'separator',
				},
				{
					label: i18n.__('contextMenu.browseForLanguage'),
					click: () => events.emit('browse-for-dictionary'),
				},
			],
		},
		{
			type: 'separator',
		},
	];
};

const createImageMenuTemplate = ({
	mediaType,
	srcURL,
}) => (
	mediaType === 'image' ?
		[
			{
				label: i18n.__('contextMenu.saveImageAs'),
				click: () => events.emit('save-image-as', srcURL),
			},
			{
				type: 'separator',
			},
		] :
		[]
);

const createLinkMenuTemplate = ({
	linkURL,
	linkText,
}) => (
	linkURL ?
		[
			{
				label: i18n.__('contextMenu.openLink'),
				click: () => events.emit('open-link', linkURL),
			},
			{
				label: i18n.__('contextMenu.copyLinkText'),
				enabled: !!linkText,
				click: () => events.emit('copy-link-text', { text: linkText, url: linkURL }),
			},
			{
				label: i18n.__('contextMenu.copyLinkAddress'),
				click: () => events.emit('copy-link-address', { text: linkText, url: linkURL }),
			},
			{
				type: 'separator',
			},
		] :
		[]
);

const createDefaultMenuTemplate = ({
	editFlags: {
		canUndo = false,
		canRedo = false,
		canCut = false,
		canCopy = false,
		canPaste = false,
		canSelectAll = false,
	} = {},
} = {}) => [
	{
		label: i18n.__('contextMenu.undo'),
		accelerator: 'CommandOrControl+Z',
		enabled: canUndo,
		click: () => events.emit('undo'),
	},
	{
		label: i18n.__('contextMenu.redo'),
		accelerator: process.platform === 'win32' ? 'Control+Y' : 'CommandOrControl+Shift+Z',
		enabled: canRedo,
		click: () => events.emit('redo'),
	},
	{
		type: 'separator',
	},
	{
		label: i18n.__('contextMenu.cut'),
		accelerator: 'CommandOrControl+X',
		enabled: canCut,
		click: () => events.emit('cut'),
	},
	{
		label: i18n.__('contextMenu.copy'),
		accelerator: 'CommandOrControl+C',
		enabled: canCopy,
		click: () => events.emit('copy'),
	},
	{
		label: i18n.__('contextMenu.paste'),
		accelerator: 'CommandOrControl+V',
		enabled: canPaste,
		click: () => events.emit('paste'),
	},
	{
		label: i18n.__('contextMenu.selectAll'),
		accelerator: 'CommandOrControl+A',
		enabled: canSelectAll,
		click: () => events.emit('select-all'),
	},
];

const trigger = (params) => {
	const menu = Menu.buildFromTemplate([
		...createSpellCheckingMenuTemplate(params),
		...createImageMenuTemplate(params),
		...createLinkMenuTemplate(params),
		...createDefaultMenuTemplate(params),
	]);
	menu.popup({ window: getCurrentWindow() });
};

export const contextMenu = Object.assign(events, {
	trigger,
});
