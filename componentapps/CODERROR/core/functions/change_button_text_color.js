export default function(button,color){
	let targetElement=button.querySelector('#frame_content');
	let firstChild=targetElement.firstElementChild;
	if(firstChild){
		firstChild.style.color=color;
	}else{
		console.log('У элемента нет дочерних элементов.');
	}
}