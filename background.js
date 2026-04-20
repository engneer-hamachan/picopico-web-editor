chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
	if (msg.type === "fetchWasm") {
		fetch(chrome.runtime.getURL("worker/ti.wasm"))
			.then((res) => res.arrayBuffer())
			.then((buffer) => {
				const bytes = new Uint8Array(buffer);
				const base64 = btoa(
					Array.from(bytes, (b) => String.fromCharCode(b)).join(""),
				);
				sendResponse({ base64 });
			})
			.catch((err) => {
				sendResponse({ error: err.message });
			});

		return true;
	}

	if (msg.type === "fetchText") {
		fetch(chrome.runtime.getURL(msg.filename))
			.then((res) => res.text())
			.then((text) => {
				sendResponse({ text });
			})
			.catch((err) => {
				sendResponse({ error: err.message });
			});

		return true;
	}
});
