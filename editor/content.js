(() => {
	const editor = document.getElementById("editor");
	if (!editor) return;

	window.typeSupportEnabled = false;

	editor.setAttribute("wrap", "off");
	editor.style.width = "100%";

	const lineNumbersInner = document.createElement("div");
	lineNumbersInner.id = "line-numbers-inner";

	const highlightContent = document.createElement("div");
	highlightContent.id = "highlight-content";

	const highlightBg = document.createElement("div");
	highlightBg.id = "highlight-bg";
	highlightBg.appendChild(lineNumbersInner);
	highlightBg.appendChild(highlightContent);

	const tiOverlay = document.createElement("div");
	tiOverlay.id = "ti-overlay";

	const tiCodelensOverlay = document.createElement("div");
	tiCodelensOverlay.id = "ti-codelens-overlay";

	const wrapper = document.createElement("div");
	wrapper.id = "editor-wrapper";
	wrapper.style.flex = "1";

	editor.parentNode.insertBefore(wrapper, editor);
	wrapper.appendChild(highlightBg);
	wrapper.appendChild(editor);
	wrapper.appendChild(tiOverlay);
	wrapper.appendChild(tiCodelensOverlay);

	new MutationObserver(() => {
		const fontSize = editor.style.fontSize;

		if (fontSize) {
			highlightContent.style.fontSize = fontSize;
			lineNumbersInner.style.fontSize = fontSize;
		}

		if (editor.style.flex) {
			wrapper.style.flex = editor.style.flex;
			editor.style.flex = "";
		}
	}).observe(editor, { attributes: true, attributeFilter: ["style"] });

	function injectTypeSupportCheckbox() {
		const controlsBar = document
			.getElementById("editor-font-size")
			?.closest(".controls");

		if (!controlsBar) return;

		const checkbox = document.createElement("input");
		checkbox.type = "checkbox";

		checkbox.addEventListener("change", () => {
			window.typeSupportEnabled = checkbox.checked;

			window.dispatchEvent(
				new CustomEvent("typeSupportChanged", { detail: checkbox.checked }),
			);
		});

		const label = document.createElement("label");
		label.className = "ti-type-support-label";
		label.appendChild(checkbox);
		label.appendChild(document.createTextNode("Type Support"));

		controlsBar.appendChild(label);
	}

	if (document.readyState === "loading") {
		document.addEventListener("DOMContentLoaded", injectTypeSupportCheckbox);
	} else {
		injectTypeSupportCheckbox();
	}
})();
