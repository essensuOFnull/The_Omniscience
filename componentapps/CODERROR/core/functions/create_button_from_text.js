export default function(text,removable=false){
	return f.wrap_in_frame(f.create_element_from_HTML(f.get_transparent_space_text(text)),'<button/>',removable);
}