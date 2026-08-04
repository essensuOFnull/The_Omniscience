import _ from 'lodash';
export default function(){
	_.set(window,['CODERROR','__originals__','data','save','player'],{
		/**ник персонажа*/
		nickname:'',
		interface:{
			hotbar:{
				slot_count:0,
				active_slot_index:0
			}
		}
	});
}