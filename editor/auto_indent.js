(() => {
	const INDENT_UNIT = "  ";

	const INDENT_INCREASE = new Set([
		"begin",
		"class",
		"module",
		"def",
		"if",
		"unless",
		"elsif",
		"else",
		"rescue",
		"ensure",
		"case",
		"when",
		"in",
		"while",
		"until",
		"for",
	]);

	const INDENT_DECREASE = new Set([
		"end",
		"else",
		"elsif",
		"rescue",
		"ensure",
		"when",
		"in",
		"}",
		"]",
		")",
	]);

	// `do` or `{`
	function hasBlockOpener(line) {
		return /(?:\bdo\b|{)\s*(?:\|[^|]*\|)?\s*(?:#.*)?$/.test(line);
	}

	// def method(...) = expr
	function isEndlessDef(line) {
		return /\bdef\s+\S+\s*(?:\([^)]*\))?\s*=(?![>=])/.test(stripComment(line));
	}

	// \, ., ,, :, *, /, %, +, =, -, |, &, ?, ||, &&, and, or, (, [, {
	function hasContinuation(line) {
		const strippedLine = stripComment(line);
		return /(?:(?<!%)[({[]|[\\.,:*/%+]|(?<!<%)[-=]|(?<![:\w])[|&?]|\|\||&&|\band\b|\bor\b)$/.test(
			strippedLine,
		);
	}

	function leadingSpaces(line) {
		return (line.match(/^( *)/) || ["", ""])[1];
	}

	function headWord(line) {
		return (line.trim().match(/^([a-zA-Z_]\w*)/) || ["", ""])[1];
	}

	function stripComment(line) {
		return line.replace(/\s*#.*$/, "").trimEnd();
	}

	function lineStartOf(text, cursorPosition) {
		let index = cursorPosition;
		while (index > 0 && text[index - 1] !== "\n") index--;
		return index;
	}

	function getPrevLine(text, lineStart) {
		if (lineStart === 0) return "";
		const prevLineStart = lineStartOf(text, lineStart - 1);
		return text.substring(prevLineStart, lineStart - 1);
	}

	function init() {
		const editor = document.getElementById("editor");
		if (!editor) return;

		editor.addEventListener("keydown", (event) => {
			if (event.key !== "Enter") return;
			if (event.shiftKey || event.ctrlKey || event.altKey || event.metaKey)
				return;
			if (event.defaultPrevented) return;

			const text = editor.value;
			const cursorPosition = editor.selectionStart;
			const lineStart = lineStartOf(text, cursorPosition);
			const line = text.substring(lineStart, cursorPosition);
			const indentation = leadingSpaces(line);
			const word = headWord(line);
			const trimmedLine = line.trim();

			const shouldDecrease =
				(INDENT_DECREASE.has(word) || INDENT_DECREASE.has(trimmedLine)) &&
				indentation.length >= INDENT_UNIT.length;

			const currentIndent = shouldDecrease
				? indentation.slice(INDENT_UNIT.length)
				: indentation;

			const prevLine = getPrevLine(text, lineStart);

			const addIndent =
				(INDENT_INCREASE.has(word) &&
					!(word === "def" && isEndlessDef(line))) ||
				hasBlockOpener(line) ||
				(hasContinuation(line) &&
					!hasContinuation(prevLine) &&
					!hasBlockOpener(prevLine));

			const nextIndent = currentIndent + (addIndent ? INDENT_UNIT : "");
			const lineContent = line.slice(indentation.length);

			event.preventDefault();

			editor.setRangeText(
				`${currentIndent + lineContent}\n${nextIndent}`,
				lineStart,
				cursorPosition,
				"end",
			);

			editor.dispatchEvent(new Event("input"));
		});
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", init);
	} else {
		init();
	}
})();
