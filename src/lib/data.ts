import { REMOTE_ASSETS_BASE_URL } from '../app/constants.js';

export function url(path = '') {
	return `${import.meta.env.SITE}${import.meta.env.BASE_URL}${path}`;
}

export function asset(path: string) {
	return `${REMOTE_ASSETS_BASE_URL}/${path}`;
}
