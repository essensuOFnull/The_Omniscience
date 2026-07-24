export default function(){
    const [w,h]=mainWindow.getContentSize();
    global.mainWindowWidth=w;
    global.mainWindowHeight=h;
}