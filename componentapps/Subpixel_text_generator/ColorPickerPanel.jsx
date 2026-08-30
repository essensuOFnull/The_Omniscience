import React, { useContext, useEffect } from 'react';
import { Box, Typography, TextField, Slider } from '@mui/material';
import { Sketch } from '@uiw/react-color'; // меняем импорт
import { AppContext } from './App';

export default function ColorPickerPanel() {
	const { state, dispatch } = useContext(AppContext);
	const { hex, alpha } = state.currentColor;

	const handleHexChange = (e) => {
		const value = e.target.value;
		if (/^#[0-9a-fA-F]{6}$/.test(value)) {
			dispatch({ type: 'SET_CURRENT_COLOR', payload: { hex: value, alpha } });
		}
	};

	const handleAlphaChange = (e, newValue) => {
		dispatch({ type: 'SET_CURRENT_COLOR', payload: { hex, alpha: newValue } });
	};

	// Преобразование HEX в RGB для слайдеров
	const hexToRgb = (h) => {
		const r = parseInt(h.slice(1, 3), 16);
		const g = parseInt(h.slice(3, 5), 16);
		const b = parseInt(h.slice(5, 7), 16);
		return { r, g, b };
	};
	const { r, g, b } = hexToRgb(hex);

	const handleRgbChange = (channel, value) => {
		const newColor = { r, g, b };
		newColor[channel] = value;
		const toHex = (c) => c.toString(16).padStart(2, '0');
		const newHex = `#${toHex(newColor.r)}${toHex(newColor.g)}${toHex(newColor.b)}`;
		dispatch({ type: 'SET_CURRENT_COLOR', payload: { hex: newHex, alpha } });
	};

	useEffect(() => {
		document.getElementById('sketch').querySelectorAll('*').forEach(child => {
			if(!child.value){
				child.classList.add('ignore_The_Omniscience_Theme');
			}
		})
	});
	return (
		<Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
			<Typography variant="subtitle2" gutterBottom>Цвет точки</Typography>
			<Box sx={{ display: 'flex', justifyContent: 'center', mb: 1 }}>
				<Sketch
					id="sketch"
					color={hex}
					onChange={(color) => dispatch({ type: 'SET_CURRENT_COLOR', payload: { hex: color.hex, alpha } })}
					style={{ width: 220 }} // задаём ширину, чтобы не растягивался
				/>
			</Box>
		</Box>
	);
}