import wrap_in_frame from './wrap_in_frame';
import create_element_from_HTML from './create_element_from_HTML';
import get_transparent_space_text from './get_transparent_space_text';
export default function(text,removable=false){
	return wrap_in_frame(create_element_from_HTML(get_transparent_space_text(text)),'<button/>',removable);
}