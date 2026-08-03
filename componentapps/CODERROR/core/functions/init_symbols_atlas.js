import create_symbols_atlas from './create_symbols_atlas';
import check_atlas_cache from './check_atlas_cache';
import load_cached_atlases from'./load_cached_atlases';
export default async function() {
    // Проверяем наличие кэша атласов СИНХРОННО
    await check_atlas_cache().then(async cacheValid => {
        if (cacheValid) {
            console.log('Using cached symbol atlases');
            // Загружаем атласы из кэша
            await load_cached_atlases();
        } else {
            console.log('Generating new symbol atlases');
            // Создаем атласы в памяти
            await create_symbols_atlas();
        }
    }).catch(async error => {
        console.warn('Cache check failed, generating new atlases:', error);
        await create_symbols_atlas();
    });
}