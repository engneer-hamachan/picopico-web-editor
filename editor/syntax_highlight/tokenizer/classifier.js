function classifyWord(word, { previousToken, defState, line, afterWordIndex }) {
	const isDotted =
		previousToken === "." || previousToken === "&." || previousToken === "::";

	if (isDotted && defState !== DEF_STATE.AFTER_DOT)
		return classifyDottedWord(word, previousToken);

	return (
		classifyInDefContext(word, defState, line, afterWordIndex) ??
		classifyByName(word)
	);
}

function classifyDottedWord(word, previousToken) {
	const tokenType =
		previousToken === "::" && /^[A-Z]/.test(word) ? "constant" : "default";

	return { tokenType, nextDefState: DEF_STATE.NONE };
}

function classifyInDefContext(word, defState, line, afterWordIndex) {
	switch (defState) {
		case DEF_STATE.AFTER_DEF: {
			let scanIndex = afterWordIndex;

			while (
				scanIndex < line.length &&
				(line[scanIndex] === " " || line[scanIndex] === "\t")
			)
				scanIndex++;

			if (line[scanIndex] === ".") {
				let tokenType = "default";

				if (BUILTIN_LITERALS.has(word)) tokenType = "builtinLiteral";
				else if (/^[A-Z]/.test(word)) tokenType = "constant";

				return { tokenType, nextDefState: DEF_STATE.AFTER_RECEIVER };
			}

			return { tokenType: "method", nextDefState: DEF_STATE.NONE };
		}

		case DEF_STATE.AFTER_DOT:
			return { tokenType: "method", nextDefState: DEF_STATE.NONE };
	}

	return null;
}

function classifyByName(word) {
	if (BUILTIN_LITERALS.has(word))
		return { tokenType: "builtinLiteral", nextDefState: DEF_STATE.NONE };

	if (RUBY_KEYWORDS.has(word))
		return {
			tokenType: "keyword",
			nextDefState:
				word === "def" || word === "undef"
					? DEF_STATE.AFTER_DEF
					: DEF_STATE.NONE,
		};

	if (BUILTIN_METHODS.has(word))
		return { tokenType: "keyword", nextDefState: DEF_STATE.NONE };

	if (/^[A-Z]/.test(word))
		return { tokenType: "constant", nextDefState: DEF_STATE.NONE };

	return { tokenType: "default", nextDefState: DEF_STATE.NONE };
}
