function parseInstanceVariable(line, i) {
	if (line[i] !== "@") return null;

	const match = line
		.slice(i)
		.match(/^@@?[_a-zA-Z\u0080-\uFFFF][_a-zA-Z0-9\u0080-\uFFFF]*/);

	if (!match) return null;

	return {
		tokens: [{ type: "instanceVariable", text: match[0] }],
		endIndex: i + match[0].length,
		previousToken: match[0],
	};
}

function parseGlobalVariable(line, i) {
	if (line[i] !== "$") return null;

	const match = line
		.slice(i)
		.match(
			/^\$(?:[_a-zA-Z\u0080-\uFFFF][_a-zA-Z0-9\u0080-\uFFFF]*|\d+|[-!$&"'*+,./0:;<>?@`~^\\]|[A-Z_]+)/,
		);

	if (match) {
		return {
			tokens: [{ type: "instanceVariable", text: match[0] }],
			endIndex: i + match[0].length,
			previousToken: match[0],
		};
	}

	return {
		tokens: [{ type: "instanceVariable", text: "$" }],
		endIndex: i + 1,
		previousToken: "$",
	};
}

function parseQuotedSymbol(line, i) {
	if (line[i] !== ":" || (line[i + 1] !== '"' && line[i + 1] !== "'"))
		return null;

	return {
		tokens: [{ type: "symbol", text: ":" }],
		endIndex: i + 1,
		previousToken: ":",
	};
}

function parseSymbol(line, i) {
	if (line[i] !== ":") return null;

	if (line[i + 1] && /[_a-zA-Z\u0080-\uFFFF]/.test(line[i + 1])) {
		const match = line
			.slice(i + 1)
			.match(/^[_a-zA-Z\u0080-\uFFFF][_a-zA-Z0-9\u0080-\uFFFF]*[?!]?/);

		if (match) {
			const name = `:${match[0]}`;
			return {
				tokens: [{ type: "symbol", text: name }],
				endIndex: i + 1 + match[0].length,
				previousToken: name,
			};
		}
	}

	return null;
}

function parseIdentifier(line, i, { previousToken, defState }) {
	const match = line
		.slice(i)
		.match(/^[_a-zA-Z\u0080-\uFFFF][_a-zA-Z0-9\u0080-\uFFFF]*[?!]?/);

	if (!match) return null;

	const word = match[0];
	const afterWordIndex = i + word.length;

	if (line[afterWordIndex] === ":" && line[afterWordIndex + 1] !== ":") {
		return {
			tokens: [{ type: "symbol", text: `${word}:` }],
			endIndex: afterWordIndex + 1,
			previousToken: `${word}:`,
		};
	}

	const { tokenType, nextDefState } = classifyWord(word, {
		previousToken,
		defState,
		line,
		afterWordIndex,
	});

	return {
		tokens: [{ type: tokenType, text: word }],
		endIndex: afterWordIndex,
		previousToken: word,
		defState: nextDefState,
	};
}
