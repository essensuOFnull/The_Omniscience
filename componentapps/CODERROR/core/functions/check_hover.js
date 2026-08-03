import check_dragover from './check_dragover';
export default function(element){
	return(element.matches(':hover')||check_dragover(element));
}