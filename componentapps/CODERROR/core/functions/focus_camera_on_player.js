export default function(){
	d.save.temp.camera=[f.logical_to_screen(d.save.world.players[d.save.player.nickname].position.coordinates[0])-(Math.floor(d.columns/2)*d.symbol_size),f.logical_to_screen(d.save.world.players[d.save.player.nickname].position.coordinates[1])-(Math.floor(d.rows/2)*d.symbol_size)];
}