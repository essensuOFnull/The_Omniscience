export default function(number){
	/*заполняет случайными символами*/
	if(number==0){
		let step=5,
		offset_y=Math.round(Math.random()*step),
		offset_x=Math.round(Math.random()*step);
		for(let y=offset_y;y<d.rows;y+=step){
			for(let x=offset_x;x<d.columns;x+=step){
				f.set_symbol_data(x, y, f.get_random_char(), f.get_random_color(),f.get_random_color(),0.5);
			}
		}
		f.visual_effect(3);
	}
	/*случайно поворачивает символы*/
	if(number==1){
		for(let y=0;y<d.rows;y++){
			for(let x=0;x<d.columns;x++){
				let container = d.symbols_grid[y][x];
				if(container){
					// поворачиваем сам контейнер вокруг центра ячейки
					const center = d.symbol_size/2;
					container.pivot.set(center, center);
					container.x = x * d.symbol_size + center;
					container.y = y * d.symbol_size + center;
					// случайный угол (в радианах)
					container.rotation = (Math.random() - 0.5) * Math.PI * 2;
				}
			}
		}
	}
	/*откатывает предыдущий*/
	if(number==2){
		for(let y=0;y<d.rows;y++){
			for(let x=0;x<d.columns;x++){
				let container = d.symbols_grid[y][x];
				if(container){
					// сбрасываем поворот и возвращаем контейнер в позицию "top-left"
					container.rotation = 0;
					container.pivot.set(0,0);
					container.x = x * d.symbol_size;
					container.y = y * d.symbol_size;
				}
			}
		}
	}
	/*убирает символы вокруг курсора*/
	if(number==3){
		// Радиус в пикселях — три размера символа
		let radius = 5 * d.symbol_size;
		if(!d.mouse) return;
		let mx = d.mouse.x;
		let my = d.mouse.y;
		// Проходим по ячейкам, попадающим в квадрат ограничивающий круг
		let x0 = Math.floor((mx - radius) / d.symbol_size);
		let x1 = Math.ceil((mx + radius) / d.symbol_size);
		let y0 = Math.floor((my - radius) / d.symbol_size);
		let y1 = Math.ceil((my + radius) / d.symbol_size);
		for(let y = y0; y <= y1; y++){
			for(let x = x0; x <= x1; x++){
				if(x<0||y<0||x>=d.columns||y>=d.rows) continue;
				// Центр ячейки в пикселях
				let cx = x * d.symbol_size + d.symbol_size/2;
				let cy = y * d.symbol_size + d.symbol_size/2;
				let dx = cx - mx;
				let dy = cy - my;
				let dist = Math.sqrt(dx*dx + dy*dy);
				if(dist <= radius){
					// Чем ближе к курсору — тем прозрачнее фон (alpha 0 в центре, 1 на границе)
					let alpha = Math.min(1, Math.max(0, dist / radius));
					// Сохраняем существующий цвет фона, если доступен
					let bgColor = 0x000000;
					let data = d.symbols_grid_data[y] && d.symbols_grid_data[y][x];
					if(data) bgColor = data.bgColor || bgColor;
					// Устанавливаем пустой символ и вычислённую прозрачность фона
					f.set_symbol_data(x, y, '', 0xFFFFFF, bgColor, alpha);
				}
			}
		}
	}
}