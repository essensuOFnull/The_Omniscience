import React, { useRef, useEffect } from 'react';
import { Box, IconButton, Typography, Paper } from '@mui/material';
import { Close } from '@mui/icons-material';

const CallPanel = ({ localStream, remoteStream, onHangup, isScreenShare = false }) => {
	const localVideoRef = useRef(null);
	const remoteVideoRef = useRef(null);

	useEffect(() => {
		if (localVideoRef.current && localStream) localVideoRef.current.srcObject = localStream;
	}, [localStream]);

	useEffect(() => {
		if (remoteVideoRef.current && remoteStream) remoteVideoRef.current.srcObject = remoteStream;
	}, [remoteStream]);

	return (
		<Box sx={{
			position: 'relative',
			p: 1,
			background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)',
			borderRadius: 3,
			boxShadow: '0 0 20px #7C4DFF',
			animation: 'glitch 0.5s infinite alternate',
			'@keyframes glitch': {
				'0%': { boxShadow: '0 0 20px #7C4DFF' },
				'100%': { boxShadow: '0 0 30px #00E5FF, 0 0 15px #7C4DFF' },
			},
		}}>
			<Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
				<Typography variant="subtitle2" color="white">
					{isScreenShare ? '📺 Стрим экрана' : '📞 Звонок'}
				</Typography>
				<IconButton size="small" onClick={onHangup} sx={{ color: 'white' }}>
					<Close />
				</IconButton>
			</Box>
			<Box display="flex" gap={1} flexWrap="wrap">
				{remoteStream && (
					<Paper sx={{ flex: 2, minWidth: 200, bgcolor: 'black', overflow: 'hidden', borderRadius: 2 }}>
						<video ref={remoteVideoRef} autoPlay playsInline style={{ width: '100%', display: 'block' }} />
					</Paper>
				)}
				{localStream && (
					<Paper sx={{ flex: 1, minWidth: 100, bgcolor: 'black', overflow: 'hidden', borderRadius: 2, border: '2px solid #7C4DFF' }}>
						<video ref={localVideoRef} autoPlay muted playsInline style={{ width: '100%', display: 'block' }} />
					</Paper>
				)}
			</Box>
		</Box>
	);
};

export default CallPanel;