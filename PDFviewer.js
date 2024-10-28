import React, { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';

// Required for react-pdf to work
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

function PDFViewer() {
  const [file, setFile] = useState(null);
  const [numPages, setNumPages] = useState(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [scale, setScale] = useState(1.0);

  // Handle file upload
  const onFileChange = (event) => {
    const file = event.target.files[0];
    setFile(file);
  };

  // Called when PDF document loads successfully
  const onDocumentLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setPageNumber(1);
  };

  // Handle zoom in/out
  const handleZoomIn = () => setScale(scale + 0.1);
  const handleZoomOut = () => setScale(Math.max(0.1, scale - 0.1));

  return (
    <div className="pdf-viewer">
      <div className="controls">
        <input 
          type="file" 
          accept=".pdf"
          onChange={onFileChange}
        />
        <button onClick={handleZoomIn}>Zoom In</button>
        <button onClick={handleZoomOut}>Zoom Out</button>
      </div>

      <div className="document-container">
        {file && (
          <Document
            file={file}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={console.error}
          >
            <Page 
              pageNumber={pageNumber} 
              scale={scale}
            />
          </Document>
        )}
      </div>

      {file && (
        <div className="page-info">
          Page {pageNumber} of {numPages}
        </div>
      )}
    </div>
  );
}

export default PDFViewer;