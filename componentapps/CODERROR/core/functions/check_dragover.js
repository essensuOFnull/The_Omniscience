export default function(element){
	if (!element.__dragoverHandlersAdded){
		let handlers={
			dragenter:(event)=>{
				event.preventDefault();
				if(!d.dragover_states.get(element)){
					element.classList.add('dragover');
					d.dragover_states.set(element,true);
				}
			},
			dragover:(event)=>{
				event.preventDefault();
				if(!d.dragover_states.get(element)){
					element.classList.add('dragover');
					d.dragover_states.set(element,true);
				}
			},
			dragleave:(event)=>{
				if(!event.relatedTarget||!element.contains(event.relatedTarget)){
					element.classList.remove('dragover');
					d.dragover_states.set(element,false);
				}
			},
			drop:(event)=>{
				event.preventDefault();
				element.classList.remove('dragover');
				d.dragover_states.set(element,false);
			}
		};
		element.addEventListener('dragenter',handlers.dragenter);
		element.addEventListener('dragover',handlers.dragover);
		element.addEventListener('dragleave',handlers.dragleave);
		element.addEventListener('drop',handlers.drop);
		element.__dragoverHandlersAdded=true;
		Object.assign(element,{__dragoverHandlers:handlers});
	}
	return d.dragover_states.get(element)||false;
}