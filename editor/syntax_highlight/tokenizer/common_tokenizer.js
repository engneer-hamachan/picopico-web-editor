function isRegexContext(char, previousToken, isLineStart) {
	if (char !== "/") return false;
	if (isLineStart) return true;
	if (RUBY_KEYWORDS.has(previousToken)) return true;
	if (/^[=!|&({,;~+\-*%<>?:[\\]$/.test(previousToken)) return true;

	return false;
}

function parseNumber(line, i, previousToken) {
	if (!/[0-9]/.test(line[i]) || /[_a-zA-Z0-9]/.test(lastChar(previousToken)))
		return null;

	const match = line
		.slice(i)
		.match(
			/^(?:0x[0-9a-fA-F][0-9a-fA-F_]*|0b[01][01_]*|0o[0-7][0-7_]*|0[0-7_]*|[1-9][0-9_]*)(?:\.[0-9][0-9_]*)?(?:[eE][+-]?[0-9][0-9_]*)?[ri]?/,
		);

	if (!match) return null;

	return {
		tokens: [{ type: "number", text: match[0] }],
		endIndex: i + match[0].length,
		previousToken: match[0],
	};
}

function parseRegexp(line, i, previousToken) {
	if (!isRegexContext(line[i], previousToken, previousToken === ""))
		return null;

	let end = i + 1;

	while (end < line.length) {
		if (line[end] === "\\" && end + 1 < line.length) {
			end += 2;
		} else if (line[end] === "[") {
			end++;
			while (end < line.length && line[end] !== "]") {
				if (line[end] === "\\") end++;
				end++;
			}
			if (end < line.length) end++;
		} else if (line[end] === "/") {
			end++;
			while (end < line.length && /[iomxneus]/.test(line[end])) end++;
			break;
		} else {
			end++;
		}
	}

	const regexp = line.slice(i, end);
	return {
		tokens: [{ type: "regexp", text: regexp }],
		endIndex: end,
		previousToken: regexp,
	};
}
