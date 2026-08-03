import create_element_from_HTML from './create_element_from_HTML';
import set_select_options from './set_select_options';
import wrap_in_frame from './wrap_in_frame';
export default function(options,removable=false){
	let select=create_element_from_HTML('<select/>');
	set_select_options(select,options);
	select.style.margin = (-1 * d.symbol_size) + 'px';
	select.style.padding = d.symbol_size + 'px';
	select.style.marginRight='0';
	select.style.cursor='pointer';
	select.style.background='#00000000';
	let frame=wrap_in_frame(select,`<button style='background:#000;'/>`,removable);
	frame.style.pointerEvents='none';
	return[frame,select];
}