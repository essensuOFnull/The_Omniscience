export default async function() {
    // Проверяем наличие кэша атласов СИНХРОННО
    await f.check_atlas_cache().then(async cacheValid => {
        if (cacheValid) {
            console.log('Using cached symbol atlases');
            // Загружаем атласы из кэша
            await f.load_cached_atlases();
        } else {
            console.log('Generating new symbol atlases');
            // Создаем атласы в памяти
            await f.create_symbols_atlas();
        }
    }).catch(async error => {
        console.warn('Cache check failed, generating new atlases:', error);
        await f.create_symbols_atlas();
    });
}