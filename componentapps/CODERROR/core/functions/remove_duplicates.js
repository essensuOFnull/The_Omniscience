export default function(arr){
	let seen=new Set();
	let result=[];
	/*Идем по массиву в обратном порядке*/
	for(let i=arr.length-1;i>=0;i--){
		let value=arr[i];
		if(!seen.has(value)){
			seen.add(value);
			result.push(value);
		}
	}
	/*Перевернем результат, чтобы вернуть его в правильном порядке*/
	return result.reverse();
}