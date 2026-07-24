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
				duration: 0.3,
				type: "spring",
				damping: 20,
				stiffness: 250
			}
		}
	},
	maximize: {
		animate: {
			scale: 1,
			opacity: 1,
			transition: {
				duration: 0.3,
				type: "spring",
				damping: 20,
				stiffness: 250
			}
		}
	},
	unmaximize: {
		animate: {
			scale: 1,
			opacity: 1,
			transition: {
				duration: 0.3,
				type: "spring",
				damping: 20,
				stiffness: 250
			}
		}
	},
	minimize: {
		animate: {
			scale: 0,
			opacity: 1,
			transition: {
				duration: 0.3,
				type: "spring",
				damping: 20,
				stiffness: 250
			}
		}
	},
	unminimize: {
		animate: {
			scale: 1,
			opacity: 1,
			transition: {
				duration: 0.3,
				type: "spring",
				damping: 20,
				stiffness: 250
			}
		}
	},
	focus: {
		animate: {
			scale: 1,
			opacity: 1,
			transition: {
				duration: 0.3,
				type: "spring",
				damping: 20,
				stiffness: 250
			}
		}
	},
	unfocus: {
		animate: {
			scale: 1,
			opacity: 0.8,
			transition: {
				duration: 0.3,
				type: "spring",
				damping: 20,
				stiffness: 250
			}
		}
	},
	setRect: {
		animate: {
			scale: 1,
			opacity: 1,
			transition: {
				duration: 0.3,
				type: "spring",
				damping: 20,
				stiffness: 250
			}
		}
	},
	closing: {
		animate: {
			scale: 0,
			opacity: 0,
			transition: {
				duration: 0.3,
				type: "spring",
				damping: 20,
				stiffness: 250
			}
		}
	},
	setContentScale: {
		animate: {
			scale: 1,
			transition: {
				duration: 0.3,
				type: "spring",
				damping: 20,
				stiffness: 250
			}
		}
	}
};