import electronPkg from 'electron';
const{contextBridge, ipcRenderer}=electronPkg;
import xtermPkg from '@xterm/xterm';
const {Terminal}=xtermPkg;
import {FitAddon} from '@xterm/addon-fit';
