import remove_event_listener from './remove_event_listener';
import jsons_to_dict_list from './jsons_to_dict_list';
export default function(name,element,function_part){
    /*Удаляем старые обработчики перед добавлением новых*/
    remove_event_listener(name,element);
    let handlers={
        drop:null,
        click:null,
        change:null
    };
    if(name==='get_json'){
        let jsonInput=document.createElement('input');
        jsonInput.type='file';
        jsonInput.multiple=true;
        jsonInput.accept='.json';
        jsonInput.style.display='none';
        /*Обработчик для drag-and-drop*/
        let dropHandler=async(e)=>{
            e.preventDefault();
            try{
                let dicts=await jsons_to_dict_list(e.dataTransfer.files);
                let merged=_.merge({},...dicts);
                function_part(merged);
            }catch(error){
                console.error('Ошибка:',error);
            }
        };
        /*Обработчик для клика (открытие проводника)*/
        let clickHandler=()=>{
            jsonInput.click();
        };
        /*Обработчик выбора файлов (общий для всех вызовов)*/
        let changeHandler=async(e)=>{
            try{
                let files=Array.from(e.target.files);
                let dicts=await jsons_to_dict_list(files);
                let merged=_.merge({},...dicts);
                function_part(merged);
                jsonInput.value='';
            }catch(error){
                console.error('Ошибка:',error);
            }
        };
        /*Сохраняем ссылки на обработчики*/
        handlers.drop=dropHandler;
        handlers.click=clickHandler;
        handlers.change=changeHandler;
        /*Навешиваем обработчики*/
        element.addEventListener('drop',dropHandler);
        element.addEventListener('click',clickHandler);
        jsonInput.addEventListener('change',changeHandler);
        /*Сохраняем созданный input и обработчики*/
        window.CODERROR.__originals__.data.event_handlers.set(element,{
            name,
            handlers,
            elements:{jsonInput}
        });
    }
}