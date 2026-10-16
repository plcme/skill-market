import { MARKET_COLORS_SCRIPT } from './market-colors';
import { THEME_SCRIPT } from './theme';

/** Everything resolved before first paint, as one inline <head> script: theme, then up/down colours. */
export const PREPAINT_SCRIPT = [THEME_SCRIPT, MARKET_COLORS_SCRIPT].join(';');
