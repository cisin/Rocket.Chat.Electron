import createDebugger from 'debug';
import {
	forwardToRenderer,
	forwardToMain,
	getInitialStateRenderer,
	replayActionMain,
	replayActionRenderer,
} from 'electron-redux';
import { applyMiddleware, combineReducers, createStore } from 'redux';
import { reducer as windowVisible } from './windowVisible';
import { reducer as loading } from './loading';
import { reducer as preferences } from './preferences';
import { reducer as servers } from './servers';
import { reducer as view } from './view';


const reducer = combineReducers({
	windowVisible,
	loading,
	preferences,
	servers,
	view,
});

const debug = createDebugger('rc:store');
const isRendererProcess = process.type === 'renderer';

const middlewares = [
	...(isRendererProcess ? [forwardToMain] : []),
	...(!isRendererProcess ? [forwardToRenderer] : []),
];

const debugReducer = (reducer) => (state, action) => {
	const { type, payload } = action;
	debug(...[type, payload].filter(Boolean));
	return reducer(state, action);
};

export const store = createStore(
	process.env.NODE_ENV ? debugReducer(reducer) : reducer,
	isRendererProcess ? getInitialStateRenderer() : {},
	applyMiddleware(...middlewares),
);

isRendererProcess ? replayActionRenderer(store) : replayActionMain(store);

if (process.env.NODE_ENV === 'development' && isRendererProcess) {
	window.store = store;
}
