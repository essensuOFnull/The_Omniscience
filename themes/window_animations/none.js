export default {
	create: {
		initial: {
			scale: 0,
			opacity: 0,
			transition: {
				duration: 0
			}
		},
		animate: {
			scale: 1,
			opacity: 1,
			transition: {
				duration: 0,
			}
		}
	},
	maximize: {
		animate: {
			scale: 1,
			opacity: 1,
			transition: {
				duration: 0,
			}
		}
	},
	unmaximize: {
		animate: {
			scale: 1,
			opacity: 1,
			transition: {
				duration: 0,
			}
		}
	},
	minimize: {
		animate: {
			scale: 0,
			opacity: 1,
			transition: {
				duration: 0,
			}
		}
	},
	unminimize: {
		animate: {
			scale: 1,
			opacity: 1,
			transition: {
				duration: 0,
			}
		}
	},
	focus: {
		animate: {
			scale: 1,
			opacity: 1,
			transition: {
				duration: 0,
			}
		}
	},
	unfocus: {
		animate: {
			scale: 1,
			opacity: 0.8,
			transition: {
				duration: 0,
			}
		}
	},
	setRect: {
		animate: {
			scale: 1,
			opacity: 1,
			transition: {
				duration: 0,
			}
		}
	},
	closing: {
		animate: {
			scale: 0,
			opacity: 0,
			transition: {
				duration: 0,
			}
		}
	},
	setContentScale: {
		animate: {
			scale: 1,
			transition: {
				duration: 0,
			}
		}
	}
};