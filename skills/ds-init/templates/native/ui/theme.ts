import config from '../../design-system.json' with { type: 'json' }

export const THEMES = config.themes as readonly string[]
export const DEFAULT_THEME = THEMES[0]!
export const COLOR_SCHEMES = ['system', 'light', 'dark'] as const
export type ColorScheme = (typeof COLOR_SCHEMES)[number]

export const THEME_STORAGE_KEY = 'hs:theme'
export const SCHEME_STORAGE_KEY = 'hs:scheme'

/** Applies stored theme + scheme to <html> before paint. Keep it tiny and dependency-free. */
export const themeBootScript = `try{var d=document.documentElement,t=localStorage.getItem('${THEME_STORAGE_KEY}'),s=localStorage.getItem('${SCHEME_STORAGE_KEY}');if(t&&${JSON.stringify(THEMES)}.indexOf(t)>-1)d.dataset.theme=t;if(s==='light'||s==='dark')d.dataset.colorScheme=s}catch(e){}`
