const compiledTiWasmModule = new Promise((resolve, reject) => {
	chrome.runtime.sendMessage({ type: "fetchWasm" }, (response) => {
		if (chrome.runtime.lastError)
			return reject(new Error(chrome.runtime.lastError.message));

		if (response?.base64) resolve(response.base64);
		else reject(new Error(response?.error || "fetchWasm failed"));
	});
})
	.then((base64) => {
		const binary = atob(base64);
		const bytes = new Uint8Array(binary.length);

		for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
		return WebAssembly.compile(bytes.buffer);
	})
	.catch((error) => {
		console.error("[worker] fetchWasm error:", error);
	});

function fetchText(filename) {
	return new Promise((resolve, reject) => {
		chrome.runtime.sendMessage(
			{ type: "fetchText", filename: filename },
			(response) => {
				if (response && response.text != null) resolve(response.text);
				else
					reject(new Error(response?.error || `fetchText failed: ${filename}`));
			},
		);
	});
}

const tiWorkerBlobUrl = Promise.all([
	fetchText("worker/worker_executor.js"),
	fetchText("worker/wasm_exec.js"),
]).then(([workerScript, wasmExecScript]) => {
	const inlinedSrc = workerScript.replace(
		'importScripts("wasm_exec.js")',
		wasmExecScript,
	);
	return URL.createObjectURL(
		new Blob([inlinedSrc], { type: "application/javascript" }),
	);
});

function TiWorker(timeoutMs) {
	this._timeoutMs = timeoutMs;
	this._timer = null;
	this._worker = null;
	this._blobUrl = null;
	this._queue = [];
	this.onmessage = null;
	this.onerror = null;

	tiWorkerBlobUrl.then((blobUrl) => {
		this._blobUrl = blobUrl;
		this._worker = new Worker(blobUrl);
		this._attachHandlers();
		this._sendModule(this._worker);

		for (const item of this._queue.splice(0)) {
			this.postMessage(item.data, item.interrupt);
		}
	});
}

TiWorker.prototype._sendModule = (worker) => {
	compiledTiWasmModule.then((module) => {
		worker.postMessage({ type: "init", module: module });
	});
};

TiWorker.prototype._attachHandlers = function () {
	this._worker.onmessage = (event) => {
		clearTimeout(this._timer);
		this._timer = null;

		if (this.onmessage) this.onmessage(event);

		this._rotate();
	};

	this._worker.onerror = (error) => {
		clearTimeout(this._timer);
		this._timer = null;

		if (this.onerror) this.onerror(error);

		this._rotate();
	};
};

TiWorker.prototype._rotate = function () {
	this._worker.terminate();
	this._worker = new Worker(this._blobUrl);
	this._sendModule(this._worker);
	this._attachHandlers();
};

TiWorker.prototype.postMessage = function (data, interrupt) {
	if (!this._worker) {
		this._queue.push({ data, interrupt });
		return;
	}

	const busy = this._timer !== null;

	clearTimeout(this._timer);

	if (interrupt && busy) this._rotate();

	this._timer = setTimeout(() => {
		console.warn("[worker] no response, restarting worker");
		this._rotate();
		this._timer = null;
	}, this._timeoutMs);

	this._worker.postMessage(data);
};
