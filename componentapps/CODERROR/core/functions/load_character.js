export default async function(filename) {
	return await f.fetch_json(`YOUR_DATA/characters/${filename}`);
}