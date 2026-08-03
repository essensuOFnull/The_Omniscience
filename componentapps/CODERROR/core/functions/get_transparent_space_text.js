export default function(text,color='#fff',background='#000'){
	let escapeHtml=(char)=>{
		let escapes={
			'<':'&lt;',
			'>':'&gt;',
			'&':'&amp;',
			'"':'&quot;',
			"'":'&#39;'
		};
		return escapes[char]||char;
	};
	let areStylesEqual=(a,b)=>{
		let aKeys=Object.keys(a);
		let bKeys=Object.keys(b);
		if(aKeys.length!==bKeys.length)return false;
		for(let key of aKeys){
			if(a[key]!==b[key])return false;
		}
		return true;
	};
	let tokenRegex=/(⦑[^⦒]*⦒)|(\n)|( )|(.)/g;
	let tokens=[];
	let match;
	while((match=tokenRegex.exec(text))!==null){
		if(match[1])tokens.push({type:'tag',value:match[1]});
		else if(match[2])tokens.push({type:'newline'});
		else if(match[3])tokens.push({type:'space'});
		else if(match[4])tokens.push({type:'char',value:match[4]});
	}
	let initialStyles={color,background};
	let currentStyles={...initialStyles};
	let output=[];
	let currentNonSpace={styles:null,content:[]};
	let currentSpace=[];
	let flushNonSpace=()=>{
		if(currentNonSpace.content.length===0)return;
		/*Всегда добавляем наследование, если стили не изменены*/
		let baseStyles={color:'inherit',background:'inherit'};
		let mergedStyles=!areStylesEqual(currentNonSpace.styles,initialStyles) 
			?{...currentNonSpace.styles}
			:baseStyles;
		let styleStr=`style="${Object.entries(mergedStyles).map(([k,v])=>`${k}:${v}`).join(';')}"`;
		let content=currentNonSpace.content.map(escapeHtml).join('');
		output.push(`<pre ${styleStr}>${content}</pre>`);
		currentNonSpace.content=[];
		currentNonSpace.styles=null;
	};
	let flushSpace=()=>{
		if(currentSpace.length===0)return;
		/*Только прозрачный фон и цвет если изменен*/
		let spaceStyles={
			background:'transparent',
			...(currentStyles.color!==initialStyles.color&&{color:currentStyles.color})
		};
		let styleStr=Object.keys(spaceStyles).length>0 
			?`style="${Object.entries(spaceStyles).map(([k,v])=>`${k}:${v}`).join(';')}"`
			:'';
		let content=currentSpace.map(escapeHtml).join('');
		output.push(`<pre ${styleStr}>${content}</pre>`);
		currentSpace=[];
	};
	for(let token of tokens){
		switch(token.type){
			case'tag':{
				let tagContent=token.value.slice(1,-1).trim();
				if(tagContent==='reset'){
					currentStyles={...initialStyles};
				}else{
					const[property,value]=tagContent.split(':').map(p=>p.trim());
					if(property&&value)currentStyles[property]=value;
				}
				flushNonSpace();
				flushSpace();
				break;
			}
			case'newline':
				flushNonSpace();
				flushSpace();
				output.push('<br>');
				break;
			case'space':
				flushNonSpace();
				currentSpace.push(' ');
				break;
			case'char':
				flushSpace();
				if(currentNonSpace.styles&&areStylesEqual(currentStyles,currentNonSpace.styles)){
					currentNonSpace.content.push(token.value);
				}else{
					flushNonSpace();
					currentNonSpace.styles={...currentStyles};
					currentNonSpace.content.push(token.value);
				}
				break;
		}
	}
	flushNonSpace();
	flushSpace();
	return`<div style="display:contents;color:${color};background:${background}">${output.join('')}</div>`;
}