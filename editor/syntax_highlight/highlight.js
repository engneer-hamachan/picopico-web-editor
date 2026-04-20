const TOKEN_CLASSES = {
	keyword: "hl-keyword",
	builtinLiteral: "hl-builtin-literal",
	constant: "hl-constant",
	method: "hl-method",
	string: "hl-string",
	escape: "hl-escape",
	regexp: "hl-regexp",
	symbol: "hl-symbol",
	number: "hl-number",
	comment: "hl-comment",
	instanceVariable: "hl-instance-variable",
	interpolation: "hl-interpolation",
	default: "hl-default",
};

function escapeHtml(text) {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;");
}

function coloredSpan(type, text) {
	return `<span class="${TOKEN_CLASSES[type]}">${escapeHtml(text)}</span>`;
}

function updateHighlight() {
	const editor = document.getElementById("editor");
	const highlightBackground = document.getElementById("highlight-bg");
	const content = document.getElementById("highlight-content");

	if (!editor || !highlightBackground || !content) return;

	const lines = editor.value.split("\n");

	let state = { mode: TOKENIZE_STATE.NORMAL };

	const htmlLines = lines.map((line) => {
		const { tokens, nextState } = tokenizeLine(line, state);
		state = nextState;
		return tokens.map((token) => coloredSpan(token.type, token.text)).join("");
	});

	content.innerHTML = htmlLines.join("\n");

	highlightBackground.style.top = `${-editor.scrollTop}px`;
	highlightBackground.style.left = `${-editor.scrollLeft}px`;
}

var highlightLocked = false;

function scheduleHighlight() {
	if (highlightLocked) return;

	highlightLocked = true;

	requestAnimationFrame(() => {
		updateHighlight();
		highlightLocked = false;
	});
}

function initSyntaxHighlight() {
	const editor = document.getElementById("editor");

	if (!editor) return;

	editor.addEventListener("input", scheduleHighlight);

	let lastValue = editor.value;

	setInterval(() => {
		if (editor.value !== lastValue) {
			lastValue = editor.value;
			scheduleHighlight();
		}
	}, 200);

	updateHighlight();
}

if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", initSyntaxHighlight);
} else {
	initSyntaxHighlight();
}
