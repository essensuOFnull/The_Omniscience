export default function(element) {
	let parent = element.parentElement;
	while(parent && parent.nodeType === Node.ELEMENT_NODE) {
		if(parent.hasAttribute('data-cursor')) {
			return parent.getAttribute('data-cursor');
		}
		parent = parent.parentElement;
	}
	return 'default';
}