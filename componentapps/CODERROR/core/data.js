window.CODERROR.__originals__.data={
/**целевой TPS (количество итераций физики мира в секунду)*/
fixed_TPS:60,
/**фактический TPS*/
TPS:0,
/**средний FPS за секунду*/
FPS:0,
/**клавиши которые нельзя забиндить*/
ignored_keys:['F11','F12'],
/**данные языков*/
languages:{},
/**данные сохранения*/
save:{
	/**текущий мир*/
	world:{
		/**информация об игроках в текущем мире*/
		players:{
			/**отвечает за работу когда персонаж не выбран*/
			'':{
				position:{
					room_id:'disclaimer'
				}
			}
		}
	},
	/**временные данные*/
	temp:{
		/**данные текущей комнаты*/
		room:{
			/**стоит ли инициализировать комнату*/
			preparation:true
		}
	}
},
/**доступные персонажи*/
characters:[],
/**доступные миры*/
worlds:[],
/**находится ли игрок во вкладке одиночной игры или мультиплеера*/
is_singleplayer:true,

FS_DB_NAME:'coderror-file-system',
FS_STORE_NAME:'handles',
FS_KEY:'directory',
need_directory_permission:true,
/**данные иконки сайта*/
favicon:{},
symbol_size:16,
/**экземпляр MidiPlayer*/
midi_player:null,
/**выбранное MIDI-устройство вывода*/
midi_output:null
}