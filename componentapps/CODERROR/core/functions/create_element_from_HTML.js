export default function(html){
	let template=document.createElement('template');
	template.innerHTML=html.trim();
	let fragment=template.content;
	/*Проверяем, есть ли ровно один дочерний элемент*/
	if(fragment.childNodes.length===1&&fragment.firstChild.nodeType===Node.ELEMENT_NODE){
		return fragment.firstChild;
	}
	/*Создаём контейнер с display: contents*/
	let container=document.createElement('div');
	container.style.display='contents';
	/*Перемещаем все узлы из фрагмента в контейнер*/
	while(fragment.firstChild){
		container.appendChild(fragment.firstChild);
	}
	return container;
}