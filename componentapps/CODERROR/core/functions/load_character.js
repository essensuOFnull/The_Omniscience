import fetch_json from './fetch_json';
export default async function(filename) {
	return await fetch_json(`YOUR_DATA/characters/${filename}`);
}