function tokenizeLine(line, state) {
	const tokens = [];

	if (state.mode === TOKENIZE_STATE.DOC) return parseDocLine(line, state);

	if (state.mode === TOKENIZE_STATE.HEREDOC)
		return parseHeredocLine(line, state);

	if (state.mode === TOKENIZE_STATE.STRING)
		return parseStringLine(line, state, tokenizeLine);

	let i = 0;
	let previousToken = "";
	let defState = DEF_STATE.NONE;

	const docStart = parseDocStart(line);
	if (docStart) return docStart;

	const endMarker = parseEndMarker(line);
	if (endMarker) return endMarker;

	while (i < line.length) {
		const char = line[i];

		if (char === "#") {
			tokens.push(...parseInlineComment(line, i).tokens);
			break;
		}

		if (char === " " || char === "\t") {
			let whitespace = "";
			while (i < line.length && (line[i] === " " || line[i] === "\t"))
				whitespace += line[i++];

			tokens.push({ type: "default", text: whitespace });

			continue;
		}

		// a&.b
		if (char === "&" && line[i + 1] === ".") {
			tokens.push({ type: "default", text: "&." });

			previousToken = "&.";

			i += 2;

			continue;
		}

		// A::B
		if (char === ":" && line[i + 1] === ":") {
			tokens.push({ type: "default", text: "::" });

			previousToken = "::";

			i += 2;

			continue;
		}

		const result =
			parseHeredocStart(line, i, previousToken, tokenizeLine) ??
			parseInlineString(line, i) ??
			parseQuotedSymbol(line, i) ??
			parseNumber(line, i, previousToken) ??
			parseInstanceVariable(line, i) ??
			parseGlobalVariable(line, i) ??
			parseSymbol(line, i) ??
			parseIdentifier(line, i, { previousToken, defState }) ??
			parseRegexp(line, i, previousToken);

		if (result) {
			tokens.push(...result.tokens);

			defState = result.defState ?? DEF_STATE.NONE;
			i = result.endIndex;

			if ("previousToken" in result) previousToken = result.previousToken;
			if (result.nextLineState) state = result.nextLineState;
			if (result.done) break;

			continue;
		}

		if (char === ".") {
			tokens.push({ type: "default", text: "." });

			defState =
				defState === DEF_STATE.AFTER_RECEIVER
					? DEF_STATE.AFTER_DOT
					: DEF_STATE.NONE;
			previousToken = ".";

			i++;

			continue;
		}

		tokens.push({ type: "default", text: char });

		if (defState !== DEF_STATE.AFTER_RECEIVER) defState = DEF_STATE.NONE;

		previousToken = char;

		i++;
	}

	return { tokens, nextState: state };
}
