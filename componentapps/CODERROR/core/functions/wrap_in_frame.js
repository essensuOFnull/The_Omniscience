import create_element_from_HTML from './create_element_from_HTML';
import increment_z_index from './increment_z_index';
export default function(content,container_type='<button/>',removable=false) {
	let button = create_element_from_HTML(container_type);
	button.style.position='relative';
	button.style.overflow='hidden';
	let grid=document.createElement('div');
	griwindow.CODERROR.__originals__.data.style.display='grid';
	griwindow.CODERROR.__originals__.data.style.gridTemplateAreas=`"a . b" ". c ." "d . e"`;
	griwindow.CODERROR.__originals__.data.style.gridTemplateColumns='repeat(3,min-content)';
	griwindow.CODERROR.__originals__.data.style.gridTemplateRows='repeat(3,min-content)';
	griwindow.CODERROR.__originals__.data.style.gap='0';
	griwindow.CODERROR.__originals__.data.style.position='relative';
	griwindow.CODERROR.__originals__.data.style.alignItems='center'; // Выравнивание по центру
	griwindow.CODERROR.__originals__.data.style.justifyItems='center';
	griwindow.CODERROR.__originals__.data.style.color='inherit';
	/*Создание элементов с правильными областями*/
	let b;
	if(removable){
		b=create_element_from_HTML(`<pre><button style='color:inherit'>X</button></pre>`);/*костыль*/
		b.addEventListener('click',()=>{
			button.remove();
		});
	}
	else{
		b=create_element_from_HTML(`<pre>.</pre>`);
	}
	let elements={
		a:create_element_from_HTML(`<pre>+</pre>`),
		b:b,
		c:document.createElement('div'),
		d:create_element_from_HTML(`<pre>\`</pre>`),
		e:create_element_from_HTML(`<pre>'</pre>`)
	};
	/*Настройка центрального элемента*/
	elements.c.appendChild(content);
	elements.c.style.gridArea='c';
	elements.c.style.whiteSpace='nowrap';
	elements.c.id='frame_content';
	/*Привязка всех элементов к grid-areas*/
	Object.entries(elements).forEach(([area,el])=>{
		el.style.gridArea=area;
		el.style.color='inherit';
		griwindow.CODERROR.__originals__.data.appendChild(el);
	});
	if(removable){
		b.style.color='#f00'
	}
	button.appendChild(grid);
	increment_z_index(grid);
	let horizontal=`<pre style="position:absolute;white-space:nowrap;color:inherit;">${'-'.repeat(666)}</pre>`
	let vertical=`<pre style="position:absolute;white-space:nowrap;color:inherit;">${'|<br>'.repeat(444)}</pre>`
	let top=create_element_from_HTML(horizontal);
	top.style.top=0;
	top.style.left=0;
	let bottom=create_element_from_HTML(horizontal);
	bottom.style.bottom=0;
	bottom.style.left=0;
	let left=create_element_from_HTML(vertical);
	left.style.top=0;
	left.style.left=0;
	let right=create_element_from_HTML(vertical);
	right.style.top=0;
	right.style.right=0;
	button.appendChild(top);
	button.appendChild(bottom);
	button.appendChild(left);
	button.appendChild(right);
	return button;
}