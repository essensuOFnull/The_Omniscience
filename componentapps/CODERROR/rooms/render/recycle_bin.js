if(!window.CODERROR.__originals__.data.save.temp.room.preparation){
	/*очистка*/
	f.clear_symbols_grid();
	f.focus_camera_on_player();
	/*отрисовка карты*/
	f.print_text_to_symbols_grid(window.CODERROR.__originals__.data.save.temp.room.data.grounwindow.CODERROR.__originals__.data.text,0-window.CODERROR.__originals__.data.save.temp.camera[0]/window.CODERROR.__originals__.data.symbol_size,0-window.CODERROR.__originals__.data.save.temp.camera[1]/window.CODERROR.__originals__.data.symbol_size);
	/*отрисовка игрока*/
	f.render_player();
}