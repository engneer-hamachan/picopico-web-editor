(() => {
	function syncScroll(editor) {
		const bg = document.getElementById("highlight-bg");

		if (bg) {
			bg.style.top = `${-editor.scrollTop}px`;
			bg.style.left = `${-editor.scrollLeft}px`;
		}
	}

	function currentLineNumber(editor) {
		return editor.value.substring(0, editor.selectionStart).split("\n").length;
	}

	function updateActiveLine(editor) {
		const inner = document.getElementById("line-numbers-inner");
		if (!inner) return;

		const active = currentLineNumber(editor);
		const count = editor.value.split("\n").length;
		const parts = [];

		for (let i = 1; i <= count; i++) {
			parts.push(
				`<span class="ti-line-number${i === active ? " active" : ""}">${i}</span>`,
			);
		}

		inner.innerHTML = parts.join("\n");
	}

	function updateLineNumbers(editor) {
		syncScroll(editor);
		updateActiveLine(editor);
	}

	function init() {
		const editor = document.getElementById("editor");
		if (!editor) return;

		editor.addEventListener("scroll", () => {
			syncScroll(editor);
		});

		editor.addEventListener("input", () => {
			updateLineNumbers(editor);
		});

		editor.addEventListener("keyup", () => {
			updateActiveLine(editor);
		});

		editor.addEventListener("mouseup", () => {
			updateActiveLine(editor);
		});

		editor.addEventListener("focus", () => {
			updateActiveLine(editor);
		});

		let lastValue = editor.value;

		setInterval(() => {
			if (editor.value !== lastValue) {
				lastValue = editor.value;
				updateLineNumbers(editor);
			}
		}, 200);

		updateLineNumbers(editor);
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}
})();
