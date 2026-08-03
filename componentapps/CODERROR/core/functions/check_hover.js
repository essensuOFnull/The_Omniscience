export default function(element){
	return(element.matches(':hover')||f.check_dragover(element));
}