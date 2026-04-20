(() => {
	const POPUP_MAX_HEIGHT = 200;
	const POPUP_ROW_HEIGHT = 24;
	const POPUP_PADDING = 8;
	const POPUP_GAP = 2;
	const invalidQueryChar = /[^a-zA-Z0-9_?!]/;

	const worker = new TiWorker(2000);
	worker.onmessage = (e) => {
		if (e.data.mode === "suggest") handleSuggestResponse(e.data);
	};

	const popup = document.createElement("div");
	popup.id = "ti-completion-popup";
	document.body.appendChild(popup);

	let allItems = [];
	let filteredItems = [];
	let selectedIndex = -1;
	let dotPosition = -1;
	let suggestId = 0;
	let pendingSuggestId = 0;
	let currentEnd = 0;
	let ignoreNextInput = false;

	function parseSignatures(output) {
		if (!output) return [];

		const seen = new Set();
		const result = [];

		output.split("\n").forEach((line) => {
			if (!line.startsWith("%")) return;

			const [method, detail, rawDoc] = line.slice(1).split(":::");
			if (!detail) return;
			if (seen.has(detail)) return;

			const doc = (rawDoc || "").replace(/<CR>/g, "\n");

			seen.add(detail);
			result.push({ method, detail, doc });
		});

		return result;
	}

	function filterItems(query) {
		const lower = query.toLowerCase();

		return allItems.filter((item) =>
			item.method.toLowerCase().startsWith(lower),
		);
	}

	function renderPopup() {
		if (filteredItems.length === 0) {
			popup.classList.remove("visible");

			return;
		}

		popup.innerHTML = "";

		filteredItems.forEach((item, i) => {
			const row = document.createElement("div");
			row.title = item.doc || item.detail;
			row.textContent = item.detail;

			row.addEventListener("mousedown", (ev) => {
				ev.preventDefault();
				applyCompletion(item.method);
			});

			row.addEventListener("mouseover", () => {
				selectedIndex = i;
				updateSelectedStyle();
			});

			popup.appendChild(row);
		});

		popup.classList.add("visible");
		updateSelectedStyle();
	}

	function updateSelectedStyle() {
		[...popup.children].forEach((row, i) => {
			row.classList.toggle("selected", i === selectedIndex);
			if (i === selectedIndex) row.scrollIntoView({ block: "nearest" });
		});
	}

	function applyCompletion(method) {
		const editor = document.getElementById("editor");
		if (!editor || dotPosition < 0) {
			hidePopup();
			return;
		}

		const savedDot = dotPosition;
		const end = currentEnd;

		hidePopup();
		editor.focus();
		editor.setRangeText(method, savedDot, end, "end");
		ignoreNextInput = true;
		editor.dispatchEvent(new Event("input"));
	}

	function hidePopup() {
		popup.classList.remove("visible");
		allItems = [];
		filteredItems = [];
		selectedIndex = -1;
		dotPosition = -1;
	}

	function getCursorRowCol(textarea) {
		const text = textarea.value.substring(0, textarea.selectionStart);
		const lines = text.split("\n");
		return { row: lines.length, character: lines[lines.length - 1].length };
	}

	function positionPopup(textarea) {
		const style = window.getComputedStyle(textarea);

		const lineHeight =
			parseFloat(style.lineHeight) || parseFloat(style.fontSize) * 1.5;

		const paddingTop = parseFloat(style.paddingTop) || 0;
		const paddingLeft = parseFloat(style.paddingLeft) || 0;
		const taRect = textarea.getBoundingClientRect();
		const text = textarea.value.substring(0, textarea.selectionStart);
		const lineIndex = text.split("\n").length - 1;

		const lineBottom =
			taRect.top +
			paddingTop +
			(lineIndex + 1) * lineHeight -
			textarea.scrollTop;

		const x = taRect.left + paddingLeft;

		const winH = window.innerHeight;

		const popH = Math.min(
			POPUP_MAX_HEIGHT,
			filteredItems.length * POPUP_ROW_HEIGHT + POPUP_PADDING,
		);

		const lineTop =
			taRect.top + paddingTop + lineIndex * lineHeight - textarea.scrollTop;

		const top =
			lineBottom + popH > winH
				? lineTop - popH - POPUP_GAP
				: lineBottom + POPUP_GAP;

		popup.style.left = `${x}px`;
		popup.style.top = `${Math.max(0, top)}px`;
	}

	function requestSuggest(editor) {
		if (!window.typeSupportEnabled) return;

		const { row, character } = getCursorRowCol(editor);
		suggestId++;
		pendingSuggestId = suggestId;

		worker.postMessage(
			{
				code: editor.value,
				id: suggestId,
				mode: "suggest",
				row: row,
				character: character,
			},
			true,
		);
	}

	function handleSuggestResponse(data) {
		if (data.id !== pendingSuggestId) return;

		allItems = parseSignatures(data.output);

		const editor = document.getElementById("editor");
		if (!editor || dotPosition < 0) return;

		const query = editor.value.substring(dotPosition, editor.selectionStart);
		if (invalidQueryChar.test(query)) {
			hidePopup();
			return;
		}

		filteredItems = filterItems(query);
		selectedIndex = filteredItems.length > 0 ? 0 : -1;

		if (filteredItems.length > 0) positionPopup(editor);

		renderPopup();
	}

	function init() {
		const editor = document.getElementById("editor");
		if (!editor) return;

		editor.addEventListener("keydown", (ev) => {
			if (!popup.classList.contains("visible")) return;

			switch (ev.key) {
				case "ArrowDown":
					ev.preventDefault();
					ev.stopPropagation();
					selectedIndex = Math.min(selectedIndex + 1, filteredItems.length - 1);
					updateSelectedStyle();
					break;

				case "ArrowUp":
					ev.preventDefault();
					ev.stopPropagation();
					selectedIndex = Math.max(selectedIndex - 1, 0);
					updateSelectedStyle();
					break;

				case "Enter":
				case "Tab":
					if (selectedIndex >= 0 && selectedIndex < filteredItems.length) {
						ev.preventDefault();
						ev.stopPropagation();
						applyCompletion(filteredItems[selectedIndex].method);
					}
					break;

				case "Escape":
					hidePopup();
					break;
			}
		});

		editor.addEventListener("input", () => {
			if (ignoreNextInput) {
				ignoreNextInput = false;
				return;
			}

			if (!window.typeSupportEnabled) {
				hidePopup();
				return;
			}

			const pos = editor.selectionStart;
			currentEnd = pos;

			const lastChar = editor.value[pos - 1];

			if (lastChar === ".") {
				dotPosition = pos;
				requestSuggest(editor);

				return;
			}

			if (/[a-zA-Z_]/.test(lastChar) && dotPosition < 0) {
				const textBeforeCursor = editor.value.substring(0, pos);
				const wordMatch = textBeforeCursor.match(/[a-zA-Z_][a-zA-Z0-9_?!]*$/);
				dotPosition = wordMatch ? pos - wordMatch[0].length : pos - 1;
				requestSuggest(editor);

				return;
			}

			if (dotPosition >= 0) {
				if (pos <= dotPosition) {
					hidePopup();
					return;
				}

				const query = editor.value.substring(dotPosition, pos);
				if (invalidQueryChar.test(query)) {
					hidePopup();
					return;
				}

				filteredItems = filterItems(query);
				selectedIndex = filteredItems.length > 0 ? 0 : -1;

				if (filteredItems.length > 0) {
					positionPopup(editor);
					renderPopup();
				} else {
					popup.classList.remove("visible");
				}
			}
		});

		editor.addEventListener("blur", () => {
			setTimeout(hidePopup, 150);
		});

		window.addEventListener("typeSupportChanged", (e) => {
			if (!e.detail) hidePopup();
		});
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}
})();
