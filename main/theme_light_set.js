import electronPkg from 'electron';
const{nativeTheme}=electronPkg;

export default function() {
    nativeTheme.themeSource = 'light';
}