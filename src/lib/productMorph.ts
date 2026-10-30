import {clamp, interactionWeight, makeParticles, particlePosition, repelParticle, smooth, type Particle, type Point} from './particleMorph';

const MASK_WIDTH = 600;

function surface(width: number, height: number) {
	const canvas = document.createElement('canvas');
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext('2d', {willReadFrequently: true});
	if (!ctx) throw new Error('Canvas 2D unavailable');
	return {canvas, ctx};
}

function sample(ctx: CanvasRenderingContext2D, step: number): Point[] {
	const {width, height} = ctx.canvas;
	const {data} = ctx.getImageData(0, 0, width, height);
	const points: Point[] = [];
	for (let y = 0; y < height; y += step) for (let x = 0; x < width; x += step) {
		const i = (y * width + x) * 4;
		// Ignore the dark face fill; the particles become its actual strokes and features.
		if (data[i + 3] > 100 && data[i] > 80) points.push({x: x / width, y: y / height});
	}
	return points;
}

function textMask(svg: SVGSVGElement, height: number) {
	const mask = surface(MASK_WIDTH, height);
	const {ctx} = mask;
	ctx.scale(MASK_WIDTH / svg.viewBox.baseVal.width, height / svg.viewBox.baseVal.height);
	ctx.textAlign = 'center';
	for (const text of svg.querySelectorAll('text')) {
		const css = getComputedStyle(text);
		ctx.font = `${css.fontWeight} ${css.fontSize} ${css.fontFamily}`;
		ctx.letterSpacing = css.letterSpacing === 'normal' ? '0px' : css.letterSpacing;
		ctx.fillStyle = css.fill;
		ctx.fillText(text.textContent ?? '', text.x.baseVal[0].value, text.y.baseVal[0].value);
	}
	return mask;
}

/** Rasterize the existing SVG, with its entry pose, instead of maintaining another face. */
async function faceImage(svg: SVGSVGElement, personCSS: CSSStyleDeclaration) {
	const copy = svg.cloneNode(true) as SVGSVGElement;
	const originals = [svg, ...svg.querySelectorAll('*')];
	const clones = [copy, ...copy.querySelectorAll('*')];
	for (let i = 0; i < originals.length; i++) {
		const css = getComputedStyle(originals[i]);
		for (const paint of ['fill', 'stroke', 'stroke-width', 'stroke-linecap', 'stroke-linejoin']) {
			clones[i].setAttribute(paint, css.getPropertyValue(paint));
		}
		clones[i].removeAttribute('class');
		clones[i].removeAttribute('data-story-motion');
	}
	// Initial expression values are shared with the native CSS animations.
	const value = (key: string) => parseFloat(personCSS.getPropertyValue(key));
	const eyes = svg.querySelector('.product-eyes')!;
	clones[originals.indexOf(eyes)].setAttribute('transform', `translate(${value('--entry-eye-x')} ${value('--entry-eye-y')})`);
	const brow = svg.querySelector<SVGGraphicsElement>('.product-brow')!;
	const box = brow.getBBox();
	clones[originals.indexOf(brow)].setAttribute('transform', `rotate(${value('--entry-brow-angle')} ${box.x + box.width / 2} ${box.y + box.height / 2})`);
	clones[originals.indexOf(svg.querySelector('.product-insight')!)].remove();
	copy.setAttribute('width', '120');
	copy.setAttribute('height', '120');
	const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(copy)], {type: 'image/svg+xml'}));
	try {
		const image = new Image();
		image.src = url;
		await image.decode();
		return image;
	} finally {
		URL.revokeObjectURL(url);
	}
}

class ProductMorph extends HTMLElement {
	private abort?: AbortController;
	private observer?: ResizeObserver;
	private frame = 0;
	private revision = 0;
	private fontsReady = false;
	private sizeKey = '';
	private start = 0;
	private span = 1;
	private lastProgress = -1;
	private particles: Particle[] = [];
	private canvas?: HTMLCanvasElement;
	private ctx?: CanvasRenderingContext2D;
	private pointer?: Point;
	private brush: Point = {x: 0, y: 0};
	private brushStrength = 0;
	private lastFrameTime = 0;

	connectedCallback() {
		const canvas = this.querySelector<HTMLCanvasElement>('.product-particles');
		const ctx = canvas?.getContext('2d');
		if (!canvas || !ctx) return; // Static view or unavailable Canvas: retain the SVG fallback.
		this.canvas = canvas;
		this.ctx = ctx;
		this.abort = new AbortController();
		const {signal} = this.abort;
		window.addEventListener('scroll', this.queueDraw, {passive: true, signal});
		window.addEventListener('resize', this.refresh, {passive: true, signal});
		// The decorative scene stays pointer-events:none; normal page controls and scrolling win.
		window.addEventListener('pointermove', this.movePointer, {passive: true, signal});
		window.addEventListener('pointerout', event => { if (!event.relatedTarget) this.leavePointer(); }, {passive: true, signal});
		window.addEventListener('blur', this.leavePointer, {signal});
		matchMedia('(prefers-reduced-motion: reduce), (forced-colors: active)').addEventListener('change', this.refresh, {signal});
		void document.fonts.ready.then(() => {
			if (signal.aborted) return;
			this.fontsReady = true;
			this.observer = new ResizeObserver(this.refresh);
			this.observer.observe(this);
			this.observer.observe(document.body);
			this.refresh();
		});
	}

	disconnectedCallback() {
		this.abort?.abort();
		this.observer?.disconnect();
		cancelAnimationFrame(this.frame);
		this.frame = 0;
		this.fontsReady = false;
		this.fallback();
	}

	private fallback() {
		this.revision++;
		this.sizeKey = '';
		this.removeAttribute('data-particle-ready');
		this.style.removeProperty('--particle-face-opacity');
		this.style.removeProperty('--particle-text-opacity');
		this.pointer = undefined;
		this.brushStrength = 0;
		cancelAnimationFrame(this.frame);
		this.frame = 0;
	}

	private movePointer = (event: PointerEvent) => {
		if (event.pointerType === 'touch') return;
		this.pointer = {x: event.clientX, y: event.clientY};
		if (interactionWeight((scrollY - this.start) / this.span) > 0) {
			this.queueDraw();
		}
	};

	private leavePointer = () => {
		this.pointer = undefined;
		if (this.brushStrength > 0) this.queueDraw();
	};

	private updateBrush(weight: number, time: number) {
		if (!weight) {
			const changed = this.brushStrength > 0;
			this.brushStrength = 0;
			this.lastFrameTime = time;
			return {changed, settling: false};
		}
		const rect = this.canvas!.getBoundingClientRect();
		const target = this.pointer && {
			x: (this.pointer.x - rect.left) / rect.width,
			y: (this.pointer.y - rect.top) / rect.height,
		};
		const inside = target && target.x >= 0 && target.x <= 1 && target.y >= 0 && target.y <= 1;
		const aim = inside ? 1 : 0;
		const follow = 1 - Math.exp(-Math.min(64, time - this.lastFrameTime || 16) / 65);
		this.lastFrameTime = time;
		const previous = this.brushStrength;
		let distance = 0;
		if (inside) {
			if (previous === 0) this.brush = target;
			distance = Math.hypot(target.x - this.brush.x, target.y - this.brush.y);
			this.brush.x += (target.x - this.brush.x) * follow;
			this.brush.y += (target.y - this.brush.y) * follow;
			if (distance < .0005) this.brush = target;
		}
		this.brushStrength += (aim - this.brushStrength) * follow;
		if (Math.abs(aim - this.brushStrength) < .001) this.brushStrength = aim;
		return {changed: previous !== this.brushStrength || distance > 0, settling: this.brushStrength !== aim || distance >= .0005};
	}

	private refresh = () => {
		if (!this.fontsReady) return;
		const scene = this.closest('.scope-scene');
		if (!scene || getComputedStyle(scene).display === 'none') { this.fallback(); return; }
		const track = scene.parentElement?.querySelector('.product-timeline-track');
		if (!track || !this.canvas || !this.ctx) return;
		const rect = track.getBoundingClientRect();
		const inset = parseFloat(getComputedStyle(track).getPropertyValue('view-timeline-inset'));
		this.start = scrollY + rect.top - inset;
		this.span = rect.height - (innerHeight - inset);
		const box = getComputedStyle(this);
		const width = parseFloat(box.width), height = parseFloat(box.height);
		const dpr = Math.min(devicePixelRatio || 1, 2);
		if (!width || !height || !(this.span > 0)) { this.fallback(); return; }
		const key = `${width}/${height}/${dpr}`;
		if (key !== this.sizeKey) {
			this.sizeKey = key;
			const revision = ++this.revision;
			void this.build(width, height, dpr, revision).catch(() => {
				if (revision === this.revision) this.fallback();
			});
		} else this.queueDraw();
	};

	private async build(width: number, height: number, dpr: number, revision: number) {
		const brief = this.querySelector<SVGSVGElement>('.product-brief')!;
		const person = this.querySelector<HTMLElement>('.product-person')!;
		const face = this.querySelector<SVGSVGElement>('.product-face')!;
		const css = getComputedStyle(person);
		const value = (key: string) => parseFloat(css.getPropertyValue(key));
		const maskHeight = Math.round(MASK_WIDTH * height / width);
		const text = textMask(brief, maskHeight);
		const target = surface(MASK_WIDTH, maskHeight);
		const faceWidth = parseFloat(css.width), faceHeight = parseFloat(css.height);
		const cx = parseFloat(css.left) + faceWidth * (.5 + value('--entry-x'));
		const cy = parseFloat(css.top) + faceHeight * (.5 + value('--entry-y'));
		const scale = value('--entry-scale');
		const angle = value('--entry-angle') * Math.PI / 180;
		const image = await faceImage(face, css);
		if (!this.isConnected || revision !== this.revision) return;
		target.ctx.scale(MASK_WIDTH / width, maskHeight / height);
		target.ctx.translate(cx, cy);
		target.ctx.rotate(angle);
		target.ctx.drawImage(image, -faceWidth * scale / 2, -faceHeight * scale / 2, faceWidth * scale, faceHeight * scale);
		const particles = makeParticles(sample(text.ctx, 2), sample(target.ctx, 1));
		if (!particles.length) throw new Error('Empty particle mask');
		this.particles = particles;
		this.canvas!.width = Math.round(width * dpr);
		this.canvas!.height = Math.round(height * dpr);
		this.canvas!.dataset.particleCount = String(particles.length);
		this.lastProgress = -1;
		this.setAttribute('data-particle-ready', '');
		this.draw();
	}

	private queueDraw = () => {
		if (this.frame || !this.hasAttribute('data-particle-ready')) return;
		this.frame = requestAnimationFrame(time => { this.frame = 0; this.draw(time); });
	};

	private draw(time = performance.now()) {
		if (!this.ctx || !this.canvas || !this.hasAttribute('data-particle-ready')) return;
		const progress = Math.min(.13, clamp((scrollY - this.start) / this.span));
		const interaction = interactionWeight(progress);
		const brush = this.updateBrush(interaction, time);
		if (progress === this.lastProgress && !brush.changed) return;
		this.lastProgress = progress;
		const {ctx, canvas} = this;
		const {width, height} = canvas;
		ctx.clearRect(0, 0, width, height);
		const handoff = smooth((progress - .115) / .015);
		this.style.setProperty('--particle-face-opacity', String(handoff));
		const grain = smooth((progress - .03) / .01);
		this.style.setProperty('--particle-text-opacity', String(1 - grain));
		if (progress >= .13) return; // No background animation after the handoff.
		ctx.globalAlpha = grain * (1 - handoff);
		if (grain > 0) {
			const travel = clamp((progress - .04) / .075);
			ctx.fillStyle = '#eef2f8';
			ctx.beginPath();
			for (const particle of this.particles) {
				const base = particlePosition(particle, travel);
				const p = repelParticle(base, this.brush, interaction * this.brushStrength, height / width);
				const radius = particle.radius * width / MASK_WIDTH;
				ctx.moveTo(p.x * width + radius, p.y * height);
				ctx.arc(p.x * width, p.y * height, radius, 0, Math.PI * 2);
			}
			ctx.fill();
		}
		ctx.globalAlpha = 1;
		if (brush.settling) this.queueDraw(); // Only a short pointer response, not an idle animation loop.
	}
}

if (!customElements.get('product-morph')) customElements.define('product-morph', ProductMorph);
