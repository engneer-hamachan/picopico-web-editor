function parseDocLine(line, state) {
	if (/^=end(\s|$)/.test(line)) {
		return {
			tokens: [{ type: "comment", text: line }],
			nextState: { mode: TOKENIZE_STATE.NORMAL },
		};
	}

	return { tokens: [{ type: "comment", text: line }], nextState: state };
}

function parseInlineComment(line, startIndex) {
	return { tokens: [{ type: "comment", text: line.slice(startIndex) }] };
}

function parseDocStart(line) {
	if (/^=begin(\s|$)/.test(line))
		return {
			tokens: [{ type: "comment", text: line }],
			nextState: { mode: TOKENIZE_STATE.DOC },
		};

	return null;
}

function parseEndMarker(line) {
	if (line !== "__END__") return null;
	return {
		tokens: [{ type: "comment", text: line }],
		nextState: { mode: TOKENIZE_STATE.DOC },
	};
}
