export default function(){
	return f.list_files('languages').then(files=>{
		let languages_div=document.getElementById('languages_div');
		languages_div.innerHTML='';
		// Создаем массив промисов для каждого скрипта
		const promises=[];
		for(const file of files){
			const promise=new Promise((resolve,reject)=>{
				const script=document.createElement('script');
				script.src=`languages/${file}`;
				script.onload=resolve;
				script.onerror=reject;
				languages_div.appendChild(script);
			});
			promises.push(promise);
		}
		// Ждем загрузки всех скриптов
		return Promise.all(promises);
	});
}