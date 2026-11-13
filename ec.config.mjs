// @ts-check
import {defineEcConfig, pluginFramesTexts} from 'astro-expressive-code';

pluginFramesTexts.addLocale('ru', {
	terminalWindowFallbackTitle: 'Терминал',
	copyButtonTooltip: 'Копировать код',
	copyButtonCopied: 'Скопировано!',
});

export default defineEcConfig({
	themes: ['github-light'],
	defaultLocale: 'ru',
	// Keep source indentation and comments when readers copy runnable examples.
	tabWidth: 0,
	frames: {
		extractFileNameFromCode: false,
		removeCommentsWhenCopyingTerminalFrames: false,
	},
	styleOverrides: {
		borderRadius: '8px',
		codeFontSize: '14px',
		codeLineHeight: '1.65',
		uiFontSize: '13px',
		frames: {shadowColor: 'transparent'},
	},
});
