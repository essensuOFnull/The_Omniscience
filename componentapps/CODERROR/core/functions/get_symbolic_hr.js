import create_element_from_HTML from './create_element_from_HTML';
export default function(){
	return create_element_from_HTML(`<div class='symbolic_hr'><pre>${'-'.repeat(666)}</pre></div>`);
}