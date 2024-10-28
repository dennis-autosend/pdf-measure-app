import React, { useState, useRef, useEffect, useCallback } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import 'pdfjs-dist/build/pdf.worker.min.mjs';
import ScaleSettings from './ScaleSettings';
import MeasurementTools from './MeasurementTools';

// Set worker to use local file
pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs-dist/pdf.worker.min.js';

const PDFViewer = () => {
  const [pdfFile, setPdfFile] = useState(null);
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [startPanPosition, setStartPanPosition] = useState({ x: 0, y: 0 });
  const [scaleFactor, setScaleFactor] = useState(null);
  const [isSettingScale, setIsSettingScale] = useState(false);
  const [scalePoints, setScalePoints] = useState({ start: null, end: null });
  const [measurementMode, setMeasurementMode] = useState(null); // 'distance' or 'area'
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [currentRenderTask, setCurrentRenderTask] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [numPages, setNumPages] = useState(null);
  const [renderingInProgress, setRenderingInProgress] = useState(false);
  const currentPageRef = useRef(currentPage);
  currentPageRef.current = currentPage;

  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    setError(null);
    setLoading(true);

    try {
      if (!file || file.type !== 'application/pdf') {
        throw new Error('Please upload a valid PDF file');
      }

      const fileReader = new FileReader();
      fileReader.onload = async function() {
        try {
          const typedArray = new Uint8Array(this.result);
          const loadedPdf = await pdfjsLib.getDocument(typedArray).promise;
          setNumPages(loadedPdf.numPages);
          setPdfFile(loadedPdf);
          await renderPage(loadedPdf, currentPage);
        } catch (err) {
          setError('Error loading PDF: ' + err.message);
        }
      };
      fileReader.readAsArrayBuffer(file);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Move drawScalePoints definition before renderPage
  const drawScalePoints = useCallback(() => {
    if (!canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    
    if (scalePoints.start) {
      ctx.beginPath();
      ctx.arc(scalePoints.start.x, scalePoints.start.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = 'red';
      ctx.fill();
    }

    if (scalePoints.end) {
      ctx.beginPath();
      ctx.arc(scalePoints.end.x, scalePoints.end.y, 5, 0, 2 * Math.PI);
      ctx.fillStyle = 'red';
      ctx.fill();

      // Draw line between points
      ctx.beginPath();
      ctx.moveTo(scalePoints.start.x, scalePoints.start.y);
      ctx.lineTo(scalePoints.end.x, scalePoints.end.y);
      ctx.strokeStyle = 'red';
      ctx.stroke();
    }
  }, [scalePoints]);

  // Move drawMeasurements definition before renderPage
  const drawMeasurements = useCallback(() => {
    if (!canvasRef.current) return;
    
    const ctx = canvasRef.current.getContext('2d');
    ctx.setTransform(scale, 0, 0, scale, panPosition.x, panPosition.y);
    
    // Draw saved measurements
    measurements.forEach(measurement => {
      ctx.beginPath();
      ctx.moveTo(measurement.points[0].x, measurement.points[0].y);
      measurement.points.forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
      if (measurement.type === 'area') {
        ctx.closePath();
        ctx.fillStyle = 'rgba(255, 0, 0, 0.1)';
        ctx.fill();
      }
      ctx.strokeStyle = 'blue';
      ctx.stroke();
    });

    // Draw current measurement
    if (currentPoints.length > 0) {
      ctx.beginPath();
      ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
      currentPoints.forEach(point => {
        ctx.lineTo(point.x, point.y);
      });
      ctx.strokeStyle = 'red';
      ctx.stroke();
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }, [measurements, currentPoints, scale, panPosition]);

  // Now define renderPage after the drawing functions are defined
  const renderPage = useCallback(async (pdf, pageNum) => {
    if (renderingInProgress) return;
    
    try {
      setRenderingInProgress(true);
      setError(null);

      if (currentRenderTask) {
        await currentRenderTask.cancel();
        setCurrentRenderTask(null);
      }

      const page = await pdf.getPage(pageNum);
      const canvas = canvasRef.current;
      
      if (!canvas || currentPageRef.current !== pageNum) return;
      
      const context = canvas.getContext('2d');
      
      // Fix orientation by rotating the viewport
      const viewport = page.getViewport({ 
        scale: scale,
        rotation: 0,  // Set rotation to 0
        dontFlip: false  // Don't flip the content
      });
      
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Clear any previous content
      context.clearRect(0, 0, canvas.width, canvas.height);

      const renderContext = {
        canvasContext: context,
        viewport: viewport,
        enableWebGL: false,  // Disable WebGL to reduce glitching
        renderInteractiveForms: false
      };

      const renderTask = page.render(renderContext);
      setCurrentRenderTask(renderTask);

      await renderTask.promise;

      // Only draw additional elements if the page hasn't changed
      if (canvas && currentPageRef.current === pageNum) {
        if (scalePoints.start) {
          drawScalePoints();
        }
        drawMeasurements();
      }
    } catch (err) {
      if (err.name !== 'RenderingCancelled') {
        setError('Error rendering PDF: ' + err.message);
      }
    } finally {
      setRenderingInProgress(false);
    }
  }, [scale, drawScalePoints, drawMeasurements, scalePoints.start, currentRenderTask, renderingInProgress]);

  // Handle zoom controls
  const handleZoom = (zoomType) => {
    const newScale = zoomType === 'in' ? scale + 0.1 : scale - 0.1;
    if (newScale > 0.1) {
      setScale(newScale);
    }
  };

  // Pan handlers
  const handleMouseDown = (e) => {
    if (!isSettingScale) {  // Only allow panning when not setting scale
      setIsPanning(true);
      setStartPanPosition({
        x: e.clientX - panPosition.x,
        y: e.clientY - panPosition.y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning && !isSettingScale) {  // Only allow panning when not setting scale
      setPanPosition({
        x: e.clientX - startPanPosition.x,
        y: e.clientY - startPanPosition.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  const handleCanvasClick = (e) => {
    if (isSettingScale) {
      const rect = canvasRef.current.getBoundingClientRect();
      // Account for scale and pan position
      const x = (e.clientX - rect.left - panPosition.x) / scale;
      const y = (e.clientY - rect.top - panPosition.y) / scale;
      
      if (!scalePoints.start) {
        setScalePoints({ start: { x, y }, end: null });
      } else if (!scalePoints.end) {
        setScalePoints({ ...scalePoints, end: { x, y } });
      }
    } else if (measurementMode) {
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (e.clientX - rect.left - panPosition.x) / scale;
      const y = (e.clientY - rect.top - panPosition.y) / scale;
      
      if (measurementMode === 'distance') {
        handleDistanceMeasurement(x, y);
      } else if (measurementMode === 'area') {
        handleAreaMeasurement(x, y);
      }
    }
  };

  const handleDistanceMeasurement = (x, y) => {
    if (!isDrawing) {
      setIsDrawing(true);
      setCurrentPoints([{ x, y }]);
    } else {
      const startPoint = currentPoints[0];
      const pixelDistance = Math.sqrt(
        Math.pow(x - startPoint.x, 2) + Math.pow(y - startPoint.y, 2)
      );
      const realDistance = pixelDistance * scaleFactor;
      
      setMeasurements([...measurements, {
        type: 'distance',
        points: [...currentPoints, { x, y }],
        value: realDistance
      }]);
      
      setIsDrawing(false);
      setCurrentPoints([]);
    }
  };

  const handleAreaMeasurement = (x, y) => {
    if (!isDrawing) {
      setIsDrawing(true);
      setCurrentPoints([{ x, y }]);
    } else {
      const newPoints = [...currentPoints, { x, y }];
      setCurrentPoints(newPoints);
      
      if (newPoints.length >= 3) {
        // Check if click is near starting point to close polygon
        const startPoint = newPoints[0];
        const distance = Math.sqrt(
          Math.pow(x - startPoint.x, 2) + Math.pow(y - startPoint.y, 2)
        );
        
        if (distance < 10 / scale) { // 10 pixels threshold
          const area = calculatePolygonArea(newPoints);
          const realArea = area * scaleFactor * scaleFactor;
          
          setMeasurements([...measurements, {
            type: 'area',
            points: newPoints,
            value: realArea
          }]);
          
          setIsDrawing(false);
          setCurrentPoints([]);
        }
      }
    }
  };

  const calculatePolygonArea = (points) => {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    return Math.abs(area / 2);
  };

  const handleDeleteMeasurement = (index) => {
    setMeasurements(measurements.filter((_, i) => i !== index));
  };

  // Add handleScaleSet function
  const handleScaleSet = (newScaleFactor) => {
    setScaleFactor(newScaleFactor);
    setIsSettingScale(false);
    setScalePoints({ start: null, end: null });
  };

  const handlePageChange = async (newPage) => {
    if (newPage >= 1 && newPage <= numPages && !renderingInProgress) {
      setCurrentPage(newPage);
    }
  };

  useEffect(() => {
    let mounted = true;
    let timeoutId;
    
    const render = async () => {
      if (pdfFile && mounted) {
        // Add a small delay to prevent rapid re-renders
        clearTimeout(timeoutId);
        timeoutId = setTimeout(async () => {
          await renderPage(pdfFile, currentPage);
        }, 100);
      }
    };

    render();

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      if (currentRenderTask) {
        currentRenderTask.cancel();
      }
    };
  }, [pdfFile, currentPage, scale, renderPage, currentRenderTask]);

  return (
    <div className="pdf-viewer">
      <div className="controls">
        <input 
          type="file" 
          accept=".pdf" 
          onChange={handleFileUpload} 
        />
        <button onClick={() => handleZoom('in')}>Zoom In</button>
        <button onClick={() => handleZoom('out')}>Zoom Out</button>
        {numPages && (
          <div className="page-controls">
            <button 
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage <= 1}
            >
              Previous
            </button>
            <span>Page {currentPage} of {numPages}</span>
            <button 
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage >= numPages}
            >
              Next
            </button>
          </div>
        )}
        <ScaleSettings 
          onScaleSet={handleScaleSet}
          isSettingScale={isSettingScale}
          setIsSettingScale={setIsSettingScale}
          scalePoints={scalePoints}
        />
        {scaleFactor && (
          <div className="scale-info">
            Scale: 1 pixel = {scaleFactor.toFixed(4)} feet
          </div>
        )}
        {scaleFactor && (
          <MeasurementTools
            isDrawing={isDrawing}
            setIsDrawing={setIsDrawing}
            measurementMode={measurementMode}
            setMeasurementMode={setMeasurementMode}
            measurements={measurements}
            onDeleteMeasurement={handleDeleteMeasurement}
          />
        )}
      </div>

      {loading && <div className="loading">Loading PDF...</div>}
      {error && <div className="error">{error}</div>}
      
      <div 
        ref={containerRef}
        className={`canvas-container ${isSettingScale ? 'setting-scale' : ''}`}
        onMouseDown={!isSettingScale ? handleMouseDown : undefined}
        onMouseMove={!isSettingScale ? handleMouseMove : undefined}
        onMouseUp={!isSettingScale ? handleMouseUp : undefined}
        onMouseLeave={!isSettingScale ? handleMouseUp : undefined}
        onClick={handleCanvasClick}
      >
        <div 
          style={{
            transform: `translate(${panPosition.x}px, ${panPosition.y}px)`,
          }}
        >
          <canvas ref={canvasRef} />
        </div>
      </div>
    </div>
  );
};

export default PDFViewer;
