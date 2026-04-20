(() => {
	const worker = new TiWorker(2000);
	let lastCheckedCode = null;
	let pendingId = 0;
	let debounceTimer = null;
	let lastErrors = [];
	let lastInfos = [];

	function parseOutput(output) {
		const errors = [];
		const infos = [];

		if (!output) return { errors, infos };

		for (const line of output.split("\n")) {
			switch (line[0]) {
				case "@": {
					const parts = line.slice(1).split(":::");
					if (parts.length < 3) continue;

					const row = parseInt(parts[1], 10);
					if (Number.isNaN(row)) continue;

					let signature = parts.slice(2).join(":::");
					signature = signature.replace(/\s*\[[ic]\/\w+\]$/, "");

					infos.push({ row, signature });

					break;
				}

				case "%":
					break;

				default: {
					const parts = line.trim().split(":::");
					if (parts.length < 3) continue;

					const row = parseInt(parts[1], 10);
					const message = parts.slice(2).join(":::");

					if (!Number.isNaN(row) && message) errors.push({ row, message });
				}
			}
		}
		return { errors, infos };
	}

	function measureCharWidth(computedStyle) {
		const ruler = document.createElement("span");
		ruler.className = "ti-ruler";
		ruler.style.fontSize = computedStyle.fontSize;
		ruler.style.fontFamily = computedStyle.fontFamily;
		ruler.textContent = "x";

		document.body.appendChild(ruler);

		const charWidth = ruler.getBoundingClientRect().width;

		document.body.removeChild(ruler);

		return charWidth;
	}

	const tooltip = document.createElement("div");
	tooltip.className = "ti-tooltip";
	document.body.appendChild(tooltip);

	function renderErrorMarkers(errors) {
		const overlay = document.getElementById("ti-overlay");
		const editor = document.getElementById("editor");

		if (!overlay || !editor) return;

		tooltip.classList.remove("visible");
		overlay.innerHTML = "";

		if (errors.length === 0) return;

		const computedStyle = window.getComputedStyle(editor);

		const lineHeight =
			parseFloat(computedStyle.lineHeight) ||
			parseFloat(computedStyle.fontSize) * 1.4;

		const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
		const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
		const scrollTop = editor.scrollTop;
		const lines = editor.value.split("\n");
		const charWidth = measureCharWidth(computedStyle);

		errors.forEach((error) => {
			const lineText = lines[error.row - 1] || "";
			const trimmedText = lineText.trimStart();
			const leadingWidth = (lineText.length - trimmedText.length) * charWidth;
			const textWidth = Math.max(trimmedText.trimEnd().length * charWidth, 4);
			const div = document.createElement("div");

			div.className = "ti-error-marker";
			div.style.left = `${paddingLeft + leadingWidth}px`;
			div.style.width = `${textWidth}px`;
			div.style.top = `${paddingTop + (error.row - 1) * lineHeight - scrollTop}px`;
			div.style.height = `${lineHeight}px`;

			div.addEventListener("mouseenter", (event) => {
				tooltip.textContent = error.message;
				tooltip.classList.add("visible");
				tooltip.style.left = `${event.clientX + 12}px`;
				tooltip.style.top = `${event.clientY + 12}px`;
			});

			div.addEventListener("mousemove", (event) => {
				tooltip.style.left = `${event.clientX + 12}px`;
				tooltip.style.top = `${event.clientY + 12}px`;
			});

			div.addEventListener("mouseleave", () => {
				tooltip.classList.remove("visible");
			});

			overlay.appendChild(div);
		});
	}

	function renderCodeLens(infos) {
		const overlay = document.getElementById("ti-codelens-overlay");
		const editor = document.getElementById("editor");

		if (!overlay || !editor) return;

		overlay.innerHTML = "";
		if (infos.length === 0) return;

		const computedStyle = window.getComputedStyle(editor);

		const lineHeight =
			parseFloat(computedStyle.lineHeight) ||
			parseFloat(computedStyle.fontSize) * 1.4;

		const paddingTop = parseFloat(computedStyle.paddingTop) || 0;
		const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
		const scrollTop = editor.scrollTop;
		const lines = editor.value.split("\n");
		const charWidth = measureCharWidth(computedStyle);

		const rowToSignatures = new Map();
		for (const info of infos) {
			if (!rowToSignatures.has(info.row)) rowToSignatures.set(info.row, []);
			rowToSignatures.get(info.row).push(info.signature);
		}

		for (const [row, signatures] of rowToSignatures) {
			const lineText = lines[row - 1] || "";
			const left = paddingLeft + lineText.length * charWidth + 8;
			const top = paddingTop + (row - 1) * lineHeight - scrollTop;
			const div = document.createElement("div");

			div.className = "ti-codelens";
			div.dataset.row = row;
			div.style.left = `${left}px`;
			div.style.top = `${top}px`;
			div.style.height = `${lineHeight}px`;
			div.style.lineHeight = `${lineHeight}px`;
			div.style.fontSize = computedStyle.fontSize;
			div.style.fontFamily = computedStyle.fontFamily;
			div.textContent = signatures.map((s) => `# ${s}`).join("  ");

			overlay.appendChild(div);
		}
	}

	worker.onmessage = (event) => {
		if (event.data.id !== pendingId) return;

		const { errors, infos } = parseOutput(event.data.output);

		lastErrors = errors;
		lastInfos = infos;

		renderErrorMarkers(lastErrors);
		renderCodeLens(lastInfos);
	};

	worker.onerror = (event) => {
		console.error("ti-worker error:", event);
	};

	function clearAll() {
		lastErrors = [];
		lastInfos = [];
		renderErrorMarkers([]);
		renderCodeLens([]);
	}

	function updateCodeLensPositions() {
		const overlay = document.getElementById("ti-codelens-overlay");
		const editor = document.getElementById("editor");

		if (!overlay || !editor) return;

		const divs = overlay.querySelectorAll("[data-row]");
		if (divs.length === 0) return;

		const computedStyle = window.getComputedStyle(editor);
		const paddingLeft = parseFloat(computedStyle.paddingLeft) || 0;
		const lines = editor.value.split("\n");
		const charWidth = measureCharWidth(computedStyle);

		divs.forEach((div) => {
			const row = parseInt(div.dataset.row, 10);
			const lineText = lines[row - 1] || "";
			div.style.left = `${paddingLeft + lineText.length * charWidth + 8}px`;
		});
	}

	function scheduleCheck() {
		if (!window.typeSupportEnabled) return;

		clearTimeout(debounceTimer);

		debounceTimer = setTimeout(() => {
			if (!window.typeSupportEnabled) return;

			const editor = document.getElementById("editor");
			if (!editor) return;

			const code = editor.value;
			if (code === lastCheckedCode) return;

			lastCheckedCode = code;

			if (!code.trim()) {
				clearAll();
				return;
			}

			pendingId++;

			worker.postMessage(
				{ code: `${code}\n`, id: pendingId, mode: "defineInfo" },
				true,
			);
		}, 200);
	}

	function init() {
		const editor = document.getElementById("editor");
		if (!editor) return;

		editor.addEventListener("input", () => {
			updateCodeLensPositions();
			scheduleCheck();
		});

		editor.addEventListener("scroll", () => {
			if (!window.typeSupportEnabled) return;
			renderErrorMarkers(lastErrors);
			renderCodeLens(lastInfos);
		});

		window.addEventListener("typeSupportChanged", (event) => {
			if (!event.detail) {
				clearTimeout(debounceTimer);
				lastCheckedCode = null;
				clearAll();
			} else {
				scheduleCheck();
			}
		});
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}
})();
