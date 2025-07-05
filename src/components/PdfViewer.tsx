// src/components/PdfViews.tsx
import { useEffect, useRef } from "react";
import "pdfjs-dist/web/pdf_viewer.css";

interface Props {
  pdfUrl: string;
}

export default function PdfViews({ pdfUrl }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const loadPdf = async () => {
      const [{ getDocument, GlobalWorkerOptions }, pdfjsViewer] = await Promise.all([
        import("pdfjs-dist"),
        import("pdfjs-dist/web/pdf_viewer.mjs"),
        import("pdfjs-dist/build/pdf.worker?worker")
      ]);

      GlobalWorkerOptions.workerSrc = "/node_modules/pdfjs-dist/build/pdf.worker.mjs";

      const CMAP_URL = "/node_modules/pdfjs-dist/cmaps/";
      const ENABLE_XFA = true;
      const SANDBOX_BUNDLE_SRC = new URL(
        "/node_modules/pdfjs-dist/build/pdf.sandbox.mjs",
        window.location.href
      );

      const eventBus = new pdfjsViewer.EventBus();

      const pdfLinkService = new pdfjsViewer.PDFLinkService({ eventBus });
      const pdfFindController = new pdfjsViewer.PDFFindController({
        eventBus,
        linkService: pdfLinkService,
      });
      const pdfScriptingManager = new pdfjsViewer.PDFScriptingManager({
        eventBus,
        sandboxBundleSrc: SANDBOX_BUNDLE_SRC,
      });

      const pdfViewer = new pdfjsViewer.PDFViewer({
        container: containerRef.current!,
        eventBus,
        linkService: pdfLinkService,
        findController: pdfFindController,
        scriptingManager: pdfScriptingManager,
      });

      pdfLinkService.setViewer(pdfViewer);
      pdfScriptingManager.setViewer(pdfViewer);

      eventBus.on("pagesinit", function () {
        pdfViewer.currentScaleValue = "page-width";
      });

      const loadingTask = getDocument({
        url: pdfUrl,
        cMapUrl: CMAP_URL,
        cMapPacked: true,
        enableXfa: ENABLE_XFA,
      });

      const pdfDocument = await loadingTask.promise;
      pdfViewer.setDocument(pdfDocument);
      pdfLinkService.setDocument(pdfDocument, null);
    };

    loadPdf();
  }, [pdfUrl]);

  return (
    <div
      id="viewerContainer"
      ref={containerRef}
      style={{
        maxWidth: "46rem",
        width: "100%",
        height: "100vh",
        position: "relative",
        overflow: "auto",
        background: "#f9f9f9",
      }}
    >
      <div id="viewer" ref={viewerRef} className="pdfViewer" style={{ position: "relative" }} />
    </div>
  );
}
