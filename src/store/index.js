import createDebugger from 'debug';
import {
	forwardToRenderer,
	forwardToMain,
	getInitialStateRenderer,
	replayActionMain,
	replayActionRenderer,
} from 'electron-redux';
import { applyMiddleware, combineReducers, createStore } from 'redux';
import { reducer as loadingReducer } from './loading';
import { reducer as preferencesReducer } from './preferences';
import { reducer as serversReducer } from './servers';


const reducer = combineReducers({
	loading: loadingReducer,
	preferences: preferencesReducer,
	servers: serversReducer,
});

const debug = createDebugger('rc:store');
const isRendererProcess = process.type === 'renderer';

const middlewares = [
	...(isRendererProcess ? [forwardToMain] : []),
	...(!isRendererProcess ? [forwardToRenderer] : []),
];

const debugReducer = (reducer) => (state, action) => {
	debug(action.type, action.payload);
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
