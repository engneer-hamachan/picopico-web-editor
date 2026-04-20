importScripts("wasm_exec.js");

const originalWarn = console.warn;
console.warn = (...args) => {
	if (args[0] && String(args[0]).includes("missed timeout event")) return;
	originalWarn.apply(console, args);
};

let tiWasmModule = null;
let wasmReadyResolvers = [];

function waitForWasm() {
	if (tiWasmModule) return Promise.resolve();

	return new Promise((resolve) => wasmReadyResolvers.push(resolve));
}

function removeAfterLastDot(content, line, character) {
	const lines = content.split("\n");

	if (line < lines.length) {
		let currentLine = lines[line];

		if (character <= currentLine.length) {
			currentLine = currentLine.substring(0, character);
		}

		const lastDotIdx = currentLine.lastIndexOf(".");

		if (lastDotIdx !== -1) {
			currentLine = currentLine.substring(0, lastDotIdx);
		}

		lines[line] = currentLine;
		content = lines.join("\n");
	}
	return content;
}

const WASM_TIMEOUT_MS = 2000;

let pendingMessage = null;
let executing = false;

self.onmessage = (event) => {
	if (event.data && event.data.type === "init") {
		tiWasmModule = event.data.module;

		for (const resolve of wasmReadyResolvers) resolve();

		wasmReadyResolvers = [];

		return;
	}

	pendingMessage = event;

	if (!executing) drainQueue();
};

async function drainQueue() {
	while (pendingMessage) {
		executing = true;
		const event = pendingMessage;
		pendingMessage = null;

		try {
			await handleMessage(event);
		} catch (_) {}
	}
	executing = false;
}

async function handleMessage(event) {
	const { code, id, mode, row, character } = event.data;

	await waitForWasm();

	const isSuggest = mode === "suggest";
	const isDefineInfo = mode === "defineInfo";
	const processedCode = isSuggest
		? removeAfterLastDot(code, (row || 1) - 1, character || 0)
		: code;

	let output = "";

	const go = new Go();
	const originalResume = go._resume.bind(go);
	go._resume = () => {
		try {
			originalResume();
		} catch (_) {}
	};

	const originalWriteSync = globalThis.fs.writeSync.bind(globalThis.fs);
	globalThis.fs.writeSync = (fileDescriptor, buffer) => {
		if (fileDescriptor === 1 || fileDescriptor === 2) {
			output += new TextDecoder().decode(buffer);
			return buffer.length;
		}
		return originalWriteSync(fileDescriptor, buffer);
	};

	const wasmInstance = await WebAssembly.instantiate(
		tiWasmModule,
		go.importObject,
	);

	self.tiCode = new TextEncoder().encode(processedCode);
	self.tiSuggest = isSuggest;
	self.tiDefineInfo = isDefineInfo;
	self.tiRow = row || 0;

	try {
		await Promise.race([
			go.run(wasmInstance),
			new Promise((resolve) => setTimeout(resolve, WASM_TIMEOUT_MS)),
		]);
	} catch (_) {
	} finally {
		globalThis.fs.writeSync = originalWriteSync;
	}

	self.postMessage({ id, mode, output: output.trim() });
}
