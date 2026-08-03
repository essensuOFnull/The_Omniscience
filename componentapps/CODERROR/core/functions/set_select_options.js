export default function(selectElement,options) {
	selectElement.innerHTML='';
	options.forEach(optionText=>{
		let option=document.createElement('option');
		option.textContent=optionText;// Задаем текст отображения
		selectElement.appendChild(option);
	});
}