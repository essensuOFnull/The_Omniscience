export default function(options,removable=false){
	let select=f.create_element_from_HTML('<select/>');
	f.set_select_options(select,options);
	select.style.margin = (-1 * d.symbol_size) + 'px';
	select.style.padding = d.symbol_size + 'px';
	select.style.marginRight='0';
	select.style.cursor='pointer';
	select.style.background='#00000000';
	let frame=f.wrap_in_frame(select,`<button style='background:#000;'/>`,removable);
	frame.style.pointerEvents='none';
	return[frame,select];
}