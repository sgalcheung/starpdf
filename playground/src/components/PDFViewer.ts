import * as pdfjsLib from "pdfjs-dist";
import * as pdfjsViewer from "pdfjs-dist/web/pdf_viewer.mjs";

import "pdfjs-dist/web/pdf_viewer.css";

/**
 * PDF.js Worker
 */
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
	"pdfjs-dist/build/pdf.worker.mjs",
	import.meta.url,
).toString();

/**
 * Base URL
 *
 * /astro-reader/
 */
const basePath = import.meta.env.BASE_URL;

const CMAP_URL = `${basePath}/cmaps/`;

/**
 * PDF.js Sandbox
 */
const SANDBOX_BUNDLE_SRC = new URL("pdfjs-dist/build/pdf.sandbox.mjs", import.meta.url).toString();

/**
 * PDF Viewer 初始化
 */
export async function initPdfViewer(): Promise<void> {
	const containers = document.querySelectorAll<HTMLDivElement>(".viewerContainer");

	for (const container of containers) {
		/**
		 * 防止重复初始化
		 */
		if (container.dataset.initialized === "true") {
			continue;
		}

		/**
		 * PDF URL
		 */
		const pdfUrl = container.dataset.pdfUrl;

		if (!pdfUrl) {
			console.error("[PDF] pdfUrl is empty");
			continue;
		}

		/**
		 * PDF.js 要求：
		 *
		 * container
		 *   └── viewer
		 */
		const viewer = container.firstElementChild;

		if (!(viewer instanceof HTMLDivElement)) {
			console.error("[PDF] viewer must be HTMLDivElement");
			continue;
		}

		/**
		 * 标记初始化
		 */
		container.dataset.initialized = "true";

		try {
			/**
			 * EventBus
			 */
			const eventBus = new pdfjsViewer.EventBus();

			/**
			 * Link Service
			 */
			const pdfLinkService = new pdfjsViewer.PDFLinkService({
				eventBus,
			});

			/**
			 * Find Controller
			 */
			const pdfFindController = new pdfjsViewer.PDFFindController({
				eventBus,
				linkService: pdfLinkService,
			});

			/**
			 * Scripting Manager
			 */
			const pdfScriptingManager = new pdfjsViewer.PDFScriptingManager({
				eventBus,
				sandboxBundleSrc: SANDBOX_BUNDLE_SRC,
			});

			/**
			 * PDF Viewer
			 */
			const pdfViewer = new pdfjsViewer.PDFViewer({
				container,
				eventBus,
				linkService: pdfLinkService,
				findController: pdfFindController,
				scriptingManager: pdfScriptingManager,
			});

			/**
			 * 设置 Viewer
			 */
			pdfLinkService.setViewer(pdfViewer);

			pdfScriptingManager.setViewer(pdfViewer);

			/**
			 * 页面初始化完成
			 */
			eventBus.on("pagesinit", () => {
				pdfViewer.currentScaleValue = "page-width";
			});

			/**
			 * Fetch PDF
			 */
			const response = await fetch(pdfUrl, {
				headers: {
					"x-requested-with": "XMLHttpRequest",
				},
			});

			if (!response.ok) {
				throw new Error(`Failed to fetch PDF: ${response.status} ${response.statusText}`);
			}

			/**
			 * ArrayBuffer
			 */
			const arrayBuffer = await response.arrayBuffer();

			/**
			 * PDF.js Loading
			 */
			const loadingTask = pdfjsLib.getDocument({
				data: arrayBuffer,
				cMapUrl: CMAP_URL,
				cMapPacked: true,
				enableXfa: true,
			});

			/**
			 * 等待 PDF.js
			 */
			const pdfDocument = await loadingTask.promise;

			/**
			 * 设置 PDF Document
			 */
			pdfViewer.setDocument(pdfDocument);

			/**
			 * Link Service
			 */
			pdfLinkService.setDocument(pdfDocument, null);
		} catch (error) {
			/**
			 * 初始化失败时允许重新初始化
			 */
			delete container.dataset.initialized;

			throw error;
		}
	}
}

/**
 * 初始化
 *
 * Astro Component 的 script
 * 可能比组件 DOM 更早执行。
 */
function init(): void {
	setTimeout(() => {
		initPdfViewer().catch((error) => {
			console.error("[PDF] initialization failed:", error);
		});
	}, 0);
}

/**
 * 首次加载
 */
if (document.readyState === "loading") {
	document.addEventListener("DOMContentLoaded", init, {
		once: true,
	});
} else {
	init();
}

/**
 * Starlight / Astro 客户端导航
 */
document.addEventListener("astro:after-swap", () => {
	setTimeout(() => {
		initPdfViewer().catch((error) => {
			console.error("[PDF] navigation initialization failed:", error);
		});
	}, 0);
});
