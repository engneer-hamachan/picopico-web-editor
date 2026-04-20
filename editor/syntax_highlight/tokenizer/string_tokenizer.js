function parseStringContent(line, startIndex, state) {
	const tokens = [];
	const { closingDelimiter, interpolated = true } = state;

	let i = startIndex;
	let buffer = "";

	while (i < line.length) {
		const char = line[i];

		// \n, \t, \\, \"
		if (char === "\\" && i + 1 < line.length) {
			if (buffer) tokens.push({ type: "string", text: buffer });

			tokens.push({ type: "escape", text: char + line[i + 1] });

			i += 2;

			continue;
		}

		// #{...}
		if (interpolated && char === "#" && line[i + 1] === "{") {
			if (buffer) tokens.push({ type: "string", text: buffer });

			const interpolation = parseInterpolationBlock(line, i, closingDelimiter);

			tokens.push(...interpolation.tokens);

			i = interpolation.endIndex;

			continue;
		}

		// ', ", `
		if (char === closingDelimiter) {
			if (buffer) tokens.push({ type: "string", text: buffer });

			tokens.push({ type: "string", text: char });

			return {
				tokens,
				nextState: { mode: TOKENIZE_STATE.NORMAL },
				endIndex: i + 1,
			};
		}

		buffer += char;

		i++;
	}

	if (buffer) tokens.push({ type: "string", text: buffer });

	return { tokens, nextState: state, endIndex: i };
}

function parseStringLine(line, state, tokenizeLine) {
	const {
		tokens: stringTokens,
		nextState,
		endIndex,
	} = parseStringContent(line, 0, state);

	if (nextState.mode === TOKENIZE_STATE.NORMAL && endIndex < line.length) {
		const tail = tokenizeLine(line.slice(endIndex), {
			mode: TOKENIZE_STATE.NORMAL,
		});

		return {
			tokens: [...stringTokens, ...tail.tokens],
			nextState: tail.nextState,
		};
	}

	return { tokens: stringTokens, nextState };
}

function parseHeredocLine(line, state) {
	if ((state.heredocSquiggly ? line.trimStart() : line) === state.heredocEnd) {
		return {
			tokens: [{ type: "string", text: line }],
			nextState: { mode: TOKENIZE_STATE.NORMAL },
		};
	}

	if (state.heredocInterpolated) {
		const { tokens } = parseStringContent(`${line}\x00`, 0, {
			mode: TOKENIZE_STATE.STRING,
			closingDelimiter: "\x00",
			interpolated: true,
		});

		return {
			tokens: tokens.filter((token) => token.text !== "\x00"),
			nextState: state,
		};
	}

	return { tokens: [{ type: "string", text: line }], nextState: state };
}

function parseInterpolationBlock(line, startIndex, closingDelimiter) {
	const tokens = [{ type: "interpolation", text: "#{" }];

	let i = startIndex + 2;
	let depth = 1;
	let content = "";

	let closed = false;

	while (i < line.length) {
		const char = line[i];

		if (char === closingDelimiter && depth === 1) break;

		if (char === "{") depth++;
		else if (char === "}") {
			depth--;

			if (depth === 0) {
				closed = true;
				break;
			}
		}

		content += char;
		i++;
	}

	if (!closed) {
		return {
			tokens: [{ type: "string", text: "#{" }],
			endIndex: startIndex + 2,
		};
	}

	if (content) tokens.push({ type: "default", text: content });

	tokens.push({ type: "interpolation", text: "}" });

	return { tokens, endIndex: i + 1 };
}

function parseInlineString(line, i) {
	const char = line[i];
	if (char !== '"' && char !== "'" && char !== "`") return null;

	const stringState = {
		mode: TOKENIZE_STATE.STRING,
		closingDelimiter: char,
		interpolated: char !== "'",
	};

	const {
		tokens: stringTokens,
		nextState,
		endIndex,
	} = parseStringContent(line, i + 1, stringState);

	const spansLine = nextState.mode === TOKENIZE_STATE.STRING;

	return {
		tokens: [{ type: "string", text: char }, ...stringTokens],
		endIndex,
		previousToken: char,
		nextLineState: spansLine ? nextState : undefined,
		done: spansLine,
	};
}

function parseHeredocStart(line, i, previousToken, tokenizeLine) {
	if (line[i] !== "<" || line[i + 1] !== "<") return null;
	const match = line.slice(i).match(/^<<([-~]?)(['"`]?)([a-zA-Z_]\w*)\2/);

	if (!match || /[_a-zA-Z0-9]/.test(lastChar(previousToken))) return null;
	const tail = tokenizeLine(line.slice(i + match[0].length), {
		mode: TOKENIZE_STATE.NORMAL,
	});

	return {
		tokens: [{ type: "string", text: match[0] }, ...tail.tokens],
		endIndex: line.length,
		previousToken: match[0],
		done: true,
		nextLineState: {
			mode: TOKENIZE_STATE.HEREDOC,
			heredocEnd: match[3],
			heredocSquiggly: match[1] === "~",
			heredocInterpolated: match[2] !== "'",
		},
	};
}
