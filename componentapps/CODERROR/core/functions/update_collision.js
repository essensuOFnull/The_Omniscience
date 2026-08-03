import update_player_collider from './update_player_collider';
export default function(ground_collider=window.CODERROR.__originals__.data.save.temp.grounwindow.CODERROR.__originals__.data.collider){
	update_player_collider();
	let nickname=window.CODERROR.__originals__.data.save.player.nickname,
	position=['save','world','players',nickname,'position'],
	touch_wall=[...position,'touch_wall'],
	collider=[...position,'collider'];
	_.set(d,touch_wall,{
		/**упирается ли игрок в стену снизу*/
		below:false,
		/**упирается ли игрок в стену слева*/
		left:false,
		/**упирается ли игрок в стену справа*/
		right:false,
		/**упирается ли игрок в стену сверху*/
		higher:false
	});
	for(let y=_.get(d,[...collider,0,1]);y<_.get(d,[...collider,1,1]);y++){
		for(let x=_.get(d,[...collider,0,0]);x<_.get(d,[...collider,1,0]);x++){
			// Проверка снизу
			if(_.get(ground_collider,[y+1,x])){
				_.set(d,[...touch_wall,'below'],true);
			}
			// Проверка сверху
			if(_.get(ground_collider,[y-1,x])){
				_.set(d,[...touch_wall,'higher'],true);
			}
			// Проверка справа
			if(_.get(ground_collider,[y,x+1])){
				_.set(d,[...touch_wall,'right'],true);
			}
			// Проверка слева
			if(_.get(ground_collider,[y,x-1])){
				_.set(d,[...touch_wall,'left'],true);
			}
		}
	}
}