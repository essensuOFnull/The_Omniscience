import React, { useContext, useCallback, useMemo, useEffect, useState, useRef } from 'react';
import { Box, Typography, TextField, Slider } from '@mui/material';
import { Saturation, Hue, Alpha, hexToHsva, hsvaToHex } from '@uiw/react-color';
import { AppContext } from './App';

// Локальные утилиты конвертации цветов
const hexToRgb = (hex) => {
	if (!/^#[0-9A-Fa-f]{6}$/.test(hex)) {
		return { r: 0, g: 0, b: 0 };
	}
	const r = parseInt(hex.slice(1, 3), 16);
	const g = parseInt(hex.slice(3, 5), 16);
	const b = parseInt(hex.slice(5, 7), 16);
	return { r, g, b };
};

const rgbToHex = ({ r, g, b }) => {
	const toHex = (c) => {
		const clamped = Math.max(0, Math.min(255, Math.round(c)));
		return clamped.toString(16).padStart(2, '0');
	};
	return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
};

// Парсер hex строки (поддерживает #RGB, #RGBA, #RRGGBB, #RRGGBBAA)
const parseHexInput = (input) => {
	let hex = input.trim();
	if (!hex.startsWith('#')) return null;
	hex = hex.slice(1);
	if (![3, 4, 6, 8].includes(hex.length)) return null;
	// Расширяем короткую запись
	if (hex.length === 3 || hex.length === 4) {
		hex = hex.split('').map(c => c + c).join('');
	}
	if (!/^[0-9A-Fa-f]+$/.test(hex)) return null;
	const hexColor = '#' + hex.slice(0, 6);
	const alphaHex = hex.length === 8 ? hex.slice(6, 8) : null;
	return {
		hex: hexColor,
		alpha: alphaHex ? parseInt(alphaHex, 16) : undefined
	};
};

export default function ColorPickerPanel() {
	const { state, dispatch } = useContext(AppContext);
	const { hex, alpha } = state.currentColor;

	// Локальное состояние для поля hex
	const [hexInput, setHexInput] = useState(hex);
	const hexInputFocused = useRef(false);

	// Синхронизация hexInput при изменении hex или alpha (если поле не в фокусе)
	useEffect(() => {
		if (!hexInputFocused.current) {
			const alphaHex = alpha === 255 ? '' : alpha.toString(16).padStart(2, '0');
			setHexInput(hex + alphaHex);
		}
	}, [hex, alpha]);

	const hsva = useMemo(() => {
		const hsv = hexToHsva(hex);
		return { ...hsv, a: alpha / 255 };
	}, [hex, alpha]);

	const handleSaturationChange = useCallback((newHsva) => {
		const newHex = hsvaToHex(newHsva);
		const newAlpha = Math.round(newHsva.a * 255);
		dispatch({
			type: 'SET_CURRENT_COLOR',
			payload: { hex: newHex, alpha: newAlpha }
		});
	}, [dispatch]);

	const handleHueChange = useCallback((newHue) => {
		if (!newHue || typeof newHue.h !== 'number') return;
		const updatedHsva = { ...hsva, h: newHue.h };
		const newHex = hsvaToHex(updatedHsva);
		dispatch({
			type: 'SET_CURRENT_COLOR',
			payload: { hex: newHex, alpha }
		});
	}, [dispatch, hsva, alpha]);

	// Изменение alpha через компонент Alpha
	const handleAlphaChange = useCallback((newHsva) => {
		dispatch({
			type: 'SET_CURRENT_COLOR',
			payload: { hex: hsvaToHex(newHsva), alpha: Math.round(newHsva.a * 255) }
		});
	}, [dispatch]);

	const updateRgbChannel = useCallback((channel, newValue) => {
		if (typeof newValue !== 'number' || isNaN(newValue)) return;
		const clamped = Math.max(0, Math.min(255, Math.round(newValue)));
		const { r, g, b } = hexToRgb(hex);
		const newColor = { r, g, b, [channel]: clamped };
		const newHex = rgbToHex(newColor);
		dispatch({
			type: 'SET_CURRENT_COLOR',
			payload: { hex: newHex, alpha }
		});
	}, [dispatch, hex, alpha]);

	const handleRgbInputChange = (channel) => (e) => {
		const val = e.target.value;
		if (val === '') return;
		const num = Number(val);
		if (!isNaN(num)) {
			updateRgbChannel(channel, num);
		}
	};

	const handleRgbSliderChange = (channel) => (e, val) => {
		updateRgbChannel(channel, val);
	};

	// Применение введённого hex при потере фокуса или Enter
	const applyHexInput = useCallback(() => {
		const parsed = parseHexInput(hexInput);
		if (parsed) {
			const payload = { hex: parsed.hex };
			if (parsed.alpha !== undefined) {
				payload.alpha = parsed.alpha;
			} else {
				// Если альфа не указана, делаем цвет непрозрачным
				payload.alpha = 255;
			}
			dispatch({ type: 'SET_CURRENT_COLOR', payload });
		} else {
			// Сброс при невалидном вводе – учитываем текущую альфу
			const alphaHex = alpha === 255 ? '' : alpha.toString(16).padStart(2, '0');
			setHexInput(hex + alphaHex);
		}
	}, [hexInput, hex, alpha, dispatch]);

	const handleHexInputChange = (e) => {
		setHexInput(e.target.value);
	};

	const handleHexFocus = () => {
		hexInputFocused.current = true;
	};

	const handleHexBlur = () => {
		hexInputFocused.current = false;
		applyHexInput();
	};

	const handleHexKeyDown = (e) => {
		if (e.key === 'Enter') {
			e.target.blur(); // вызовет onBlur
		}
	};

	// Обработчики для alpha (текстовое поле и слайдер Alpha)
	const handleAlphaInputChange = useCallback((e) => {
		const val = e.target.value;
		if (val === '') {
			dispatch({ type: 'SET_CURRENT_COLOR', payload: { hex, alpha: 0 } });
			return;
		}
		const num = Number(val);
		if (!isNaN(num)) {
			const clamped = Math.max(0, Math.min(255, Math.round(num)));
			dispatch({ type: 'SET_CURRENT_COLOR', payload: { hex, alpha: clamped } });
		}
	}, [dispatch, hex]);

	const { r, g, b } = hexToRgb(hex);

	// useEffect для игнорирования темы (оставлен без изменений)
	useEffect(() => {
		for (let el of document.getElementsByClassName('ignore_The_Omniscience_Box')) {
			el.querySelectorAll('*').forEach(child => {
				child.classList.add('ignore_The_Omniscience_Theme');
			});
		}
	});

	return (
		<Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider', overflowX: 'hidden', userSelect: 'none' }}>
			<Typography variant="subtitle2" gutterBottom>Цвет точки</Typography>

			<Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1, mb: 1 }} className='ignore_The_Omniscience_Box ignore_The_Omniscience_Theme'>
				<Saturation
					hsva={hsva}
					onChange={handleSaturationChange}
					style={{ width: 220, height: 220 }}
				/>
				<Hue
					hue={hsva.h}
					onChange={handleHueChange}
					style={{ width: 220, height: 20 }}
				/>
			</Box>

			{/* Поле для ввода hex */}
			<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
				<TextField
					label="Hex"
					value={hexInput}
					onChange={handleHexInputChange}
					onFocus={handleHexFocus}
					onBlur={handleHexBlur}
					onKeyDown={handleHexKeyDown}
					size="small"
					placeholder="#RRGGBB или #RRGGBBAA"
					sx={{ flex: 1, userSelect: 'text' }}
				/>
			</Box>

			{/* R */}
			<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
				<TextField
					label="R"
					type="number"
					value={r}
					onChange={handleRgbInputChange('r')}
					size="small"
					inputProps={{ min: 0, max: 255, step: 1 }}
					sx={{ width: 90, userSelect: 'text' }}
				/>
				<Slider
					value={r}
					onChange={handleRgbSliderChange('r')}
					min={0}
					max={255}
					step={1}
					valueLabelDisplay="auto"
					sx={{ flex: 1 }}
				/>
			</Box>

			{/* G */}
			<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
				<TextField
					label="G"
					type="number"
					value={g}
					onChange={handleRgbInputChange('g')}
					size="small"
					inputProps={{ min: 0, max: 255, step: 1 }}
					sx={{ width: 90, userSelect: 'text' }}
				/>
				<Slider
					value={g}
					onChange={handleRgbSliderChange('g')}
					min={0}
					max={255}
					step={1}
					valueLabelDisplay="auto"
					sx={{ flex: 1 }}
				/>
			</Box>

			{/* B */}
			<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
				<TextField
					label="B"
					type="number"
					value={b}
					onChange={handleRgbInputChange('b')}
					size="small"
					inputProps={{ min: 0, max: 255, step: 1 }}
					sx={{ width: 90, userSelect: 'text' }}
				/>
				<Slider
					value={b}
					onChange={handleRgbSliderChange('b')}
					min={0}
					max={255}
					step={1}
					valueLabelDisplay="auto"
					sx={{ flex: 1 }}
				/>
			</Box>

			{/* Alpha */}
			<Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
				<TextField
					label="A"
					type="number"
					value={alpha}
					onChange={handleAlphaInputChange}
					size="small"
					inputProps={{ min: 0, max: 255, step: 1 }}
					sx={{ width: 90, userSelect: 'text' }}
				/>
				<Alpha
					className='ignore_The_Omniscience_Box'
					hsva={hsva}
					onChange={handleAlphaChange}
					style={{ flex: 1, height: 20 }}
				/>
			</Box>
		</Box>
	);
}