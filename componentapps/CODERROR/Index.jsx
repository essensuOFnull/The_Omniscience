import React, { useEffect, useRef } from 'react';
import ReactDOM from 'react-dom/client';

import {
	CircularProgress,
} from '@mui/material';

import {create} from 'jss';
import jssPresetDefault from 'jss-preset-default';

import './core/styles.js';

// create a global JSS instance and attach styles created from the styles factory
window.jssInstance = create(jssPresetDefault());
window.jssSheet = window.jssInstance.createStyleSheet(window.stylesFactory(window.styleTokens)).attach();

import './core/general/message_bus.js';
import './core/index/data.js';
import './core/index/functions.js';
import './core/general/functions.js';
import './core/index/main.js';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<>
	<CircularProgress
		id="loading"
		size={'min(80vw,80vh)'}
		sx={{
			color: '#f0f',
			position:'absolute',
			left:'50%',
			top:'50%',
			transform:'translate(-50%,-50%)',
		}}
	/>
	<div id="wrapper"></div>
	<img id="cursor" src="" />

	<div id="languages_div" style="display:contents;">
		<script src="../../../componentapps/CODERROR/languages/default.js"></script>
	</div>
</>);

import './core/general/message_bus.js';
import './core/CODERROR/preinit.js';
import './core/CODERROR/data.js';
import './core/CODERROR/functions.js';
import './core/general/functions.js';
import './core/CODERROR/message_system.js';
import './core/CODERROR/sound_console.js';
import './core/CODERROR/initial_settings.js';
import './core/CODERROR/main.js';
import './core/index/message_system.js';