import React, { useState, useRef, useEffect, useCallback } from 'react';
import ScaleSettings from './ScaleSettings';
import MeasurementTools from './MeasurementTools';
import { FaCloudUploadAlt, FaSearchPlus, FaSearchMinus } from 'react-icons/fa';

const ImageViewer = () => {
  const [image, setImage] = useState(null);
  const [scale, setScale] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isPanning, setIsPanning] = useState(false);
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [startPanPosition, setStartPanPosition] = useState({ x: 0, y: 0 });
  const [scaleFactor, setScaleFactor] = useState(null);
  const [isSettingScale, setIsSettingScale] = useState(false);
  const [scalePoints, setScalePoints] = useState({ start: null, end: null });
  const [measurementMode, setMeasurementMode] = useState(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPoints, setCurrentPoints] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [canSetScale, setCanSetScale] = useState(false);
  const [isDynamicLine, setIsDynamicLine] = useState(false);
  const [dynamicLineEnd, setDynamicLineEnd] = useState(null);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);

  // Handle file upload
  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    setError(null);
    setLoading(true);
    setCanSetScale(false); // Reset scale setting ability

    try {
      if (!file || !file.type.match('image.*')) {
        throw new Error('Please upload a valid image file (PNG or JPEG)');
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          setImage(img);
          setLoading(false);
          setCanSetScale(true); // Enable scale setting after image loads
          console.log('Image loaded successfully');
        };
        img.onerror = () => {
          setError('Error loading image');
          setLoading(false);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  // Draw image and measurements
  const drawCanvas = useCallback(() => {
    console.log('Drawing canvas');
    console.log('Current scale points:', scalePoints);
    
    if (!canvasRef.current || !image) {
      console.log('Missing canvas or image:', {
        hasCanvas: !!canvasRef.current,
        hasImage: !!image
      });
      return;
    }

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');

      // Set canvas size to match image
      canvas.width = image.width;
      canvas.height = image.height;

      console.log('Canvas dimensions:', {
        width: canvas.width,
        height: canvas.height
      });

      // Clear canvas
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw image
      ctx.drawImage(image, 0, 0);

      // Draw scale points with error checking
      if (scalePoints.start) {
        console.log('Drawing start point');
        ctx.beginPath();
        ctx.arc(scalePoints.start.x, scalePoints.start.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = 'red';
        ctx.fill();
      }

      if (scalePoints.end) {
        console.log('Drawing end point');
        ctx.beginPath();
        ctx.arc(scalePoints.end.x, scalePoints.end.y, 5, 0, 2 * Math.PI);
        ctx.fillStyle = 'red';
        ctx.fill();

        // Draw thick orange line between points
        ctx.beginPath();
        ctx.moveTo(scalePoints.start.x, scalePoints.start.y);
        ctx.lineTo(scalePoints.end.x, scalePoints.end.y);
        ctx.strokeStyle = 'orange';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Draw measurements with technical labels
      measurements.forEach(measurement => {
        if (measurement.type === 'distance') {
          // Draw the measurement line
          ctx.beginPath();
          ctx.moveTo(measurement.points[0].x, measurement.points[0].y);
          ctx.lineTo(measurement.points[1].x, measurement.points[1].y);
          ctx.strokeStyle = 'blue';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Draw dots at start and end points
          [measurement.points[0], measurement.points[1]].forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 3, 0, 2 * Math.PI);
            ctx.fillStyle = 'blue';
            ctx.fill();
          });

          // Calculate midpoint and angle
          const midX = (measurement.points[0].x + measurement.points[1].x) / 2;
          const midY = (measurement.points[0].y + measurement.points[1].y) / 2;
          const angle = Math.atan2(
            measurement.points[1].y - measurement.points[0].y,
            measurement.points[1].x - measurement.points[0].x
          );

          // Determine which side to place the label based on line angle
          const leaderLength = 40;
          // If line is more horizontal, place label above or below
          // If line is more vertical, place label left or right
          const isMoreHorizontal = Math.abs(Math.cos(angle)) > Math.abs(Math.sin(angle));
          const leaderAngle = isMoreHorizontal ? 
            (midY > canvas.height/2 ? Math.PI * 3/2 : Math.PI/2) : // above or below
            (midX > canvas.width/2 ? Math.PI : 0); // left or right

          // Calculate leader line end point
          const leaderX = midX + Math.cos(leaderAngle) * leaderLength;
          const leaderY = midY + Math.sin(leaderAngle) * leaderLength;

          // Draw leader line
          ctx.beginPath();
          ctx.moveTo(midX, midY);
          ctx.lineTo(leaderX, leaderY);
          ctx.strokeStyle = 'blue';
          ctx.lineWidth = 1;
          ctx.stroke();

          // Prepare text
          const labelText = measurement.label || '';
          const measurementText = `${measurement.value.toFixed(2)} ft`;
          ctx.font = '14px Arial';
          
          // Calculate text dimensions
          const labelWidth = ctx.measureText(labelText).width;
          const measurementWidth = ctx.measureText(measurementText).width;
          const maxWidth = Math.max(labelWidth, measurementWidth);
          const padding = 6;
          const labelHeight = labelText ? 40 : 24;

          // Position the background box based on leader line angle
          let boxX, boxY;
          
          if (isMoreHorizontal) {
            // For horizontal lines
            boxX = leaderX - maxWidth/2;
            boxY = midY > canvas.height/2 ? 
              leaderY - labelHeight - padding : // place above
              leaderY + padding; // place below
          } else {
            // For vertical lines
            boxX = midX > canvas.width/2 ? 
              leaderX - maxWidth - padding : // place to the left
              leaderX + padding; // place to the right
            boxY = leaderY - labelHeight/2;
          }

          // Draw background
          ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
          ctx.beginPath();
          ctx.roundRect(
            boxX,
            boxY,
            maxWidth + padding * 2,
            labelHeight + padding * 2,
            4
          );
          ctx.fill();

          // Draw text
          ctx.fillStyle = 'blue';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          
          if (labelText) {
            ctx.fillText(labelText, boxX + padding, boxY + labelHeight/2 - 8);
          }
          ctx.fillText(measurementText, boxX + padding, boxY + labelHeight/2 + 8);
        } else if (measurement.type === 'area') {
          // Draw the measurement line
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
          ctx.strokeStyle = measurement.type === 'distance' ? 'blue' : 'green';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Draw current area measurement
          if (scaleFactor && currentPoints.length > 2) {
            const area = calculatePolygonArea([...currentPoints, dynamicLineEnd]);
            const realArea = area * scaleFactor * scaleFactor;

            ctx.font = '16px Arial';
            ctx.fillStyle = 'green';
            ctx.fillText(`${realArea.toFixed(2)} sq ft`, dynamicLineEnd.x + 10, dynamicLineEnd.y - 10);
          }
        }
      });

      // Draw current measurement points
      if (currentPoints.length > 0) {
        ctx.beginPath();
        ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
        currentPoints.forEach(point => {
          ctx.lineTo(point.x, point.y);
        });
        ctx.strokeStyle = measurementMode === 'distance' ? 'blue' : 'green';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      // Draw current distance measurement
      if (measurementMode === 'distance' && currentPoints.length > 0) {
        ctx.beginPath();
        ctx.moveTo(currentPoints[0].x, currentPoints[0].y);

        if (currentPoints.length === 1) {
          // If only one point, draw dynamic line to cursor
          ctx.lineTo(dynamicLineEnd.x, dynamicLineEnd.y);
        } else {
          // If both points set, draw line between them
          ctx.lineTo(currentPoints[1].x, currentPoints[1].y);
        }

        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw the current distance if scale is set
        if (scaleFactor && currentPoints.length === 1) {
          const pixelDistance = Math.sqrt(
            Math.pow(dynamicLineEnd.x - currentPoints[0].x, 2) +
            Math.pow(dynamicLineEnd.y - currentPoints[0].y, 2)
          );
          const realDistance = pixelDistance * scaleFactor;

          ctx.font = '16px Arial';
          ctx.fillStyle = 'blue';
          ctx.fillText(`${realDistance.toFixed(2)} ft`, dynamicLineEnd.x + 10, dynamicLineEnd.y - 10);
        }
      }

      // Draw current area measurement
      if (measurementMode === 'area' && currentPoints.length > 0) {
        ctx.beginPath();
        ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
        currentPoints.forEach((point, index) => {
          if (index > 0) {
            ctx.lineTo(point.x, point.y);
          }
        });

        if (currentPoints.length > 2) {
          ctx.closePath();
        } else {
          ctx.lineTo(dynamicLineEnd.x, dynamicLineEnd.y);
        }

        ctx.strokeStyle = 'green';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw the current area if scale is set and polygon is closed
        if (scaleFactor && currentPoints.length > 2) {
          const area = calculatePolygonArea([...currentPoints, dynamicLineEnd]);
          const realArea = area * scaleFactor * scaleFactor;

          ctx.font = '16px Arial';
          ctx.fillStyle = 'green';
          ctx.fillText(`${realArea.toFixed(2)} sq ft`, dynamicLineEnd.x + 10, dynamicLineEnd.y - 10);
        }
      }

      if (isDynamicLine && scalePoints.start && dynamicLineEnd) {
        console.log('Drawing dynamic line:', {
          startX: scalePoints.start.x,
          startY: scalePoints.start.y,
          endX: dynamicLineEnd.x,
          endY: dynamicLineEnd.y
        });

        ctx.beginPath();
        ctx.moveTo(scalePoints.start.x, scalePoints.start.y);
        ctx.lineTo(dynamicLineEnd.x, dynamicLineEnd.y);
        ctx.strokeStyle = 'orange';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Draw dynamic measurement line
      if (isDrawing && measurementMode === 'distance' && currentPoints.length === 1 && dynamicLineEnd) {
        ctx.beginPath();
        ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
        ctx.lineTo(dynamicLineEnd.x, dynamicLineEnd.y);
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw measurement label
        if (scaleFactor) {
          const pixelDistance = Math.sqrt(
            Math.pow(dynamicLineEnd.x - currentPoints[0].x, 2) +
            Math.pow(dynamicLineEnd.y - currentPoints[0].y, 2)
          );
          const realDistance = pixelDistance * scaleFactor;

          ctx.font = '16px Arial';
          ctx.fillStyle = 'blue';
          ctx.fillText(`${realDistance.toFixed(2)} ft`, dynamicLineEnd.x + 10, dynamicLineEnd.y - 10);
        }
      }
    } catch (error) {
      console.error('Error in drawCanvas:', error);
      setError(`Error drawing canvas: ${error.message}`);
    }
  }, [image, scalePoints, measurements, currentPoints, measurementMode, isDynamicLine, dynamicLineEnd, scaleFactor, isDrawing]);

  // Handle zoom
  const handleZoom = (zoomType) => {
    const newScale = zoomType === 'in' ? scale + 0.1 : scale - 0.1;
    if (newScale > 0.1) {
      setScale(newScale);
    }
  };

  // Pan handlers
  const handleMouseDown = (e) => {
    if (!isSettingScale) {
      setIsPanning(true);
      setStartPanPosition({
        x: e.clientX - panPosition.x,
        y: e.clientY - panPosition.y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isPanning && !isSettingScale) {
      setPanPosition({
        x: e.clientX - startPanPosition.x,
        y: e.clientY - startPanPosition.y
      });
    }

<<<<<<< HEAD
<<<<<<< HEAD
    // Update dynamic line for measurements and scale setting
    if ((isDrawing && measurementMode === 'distance') || isDynamicLine) {
      const { x, y } = getTransformedCoordinates(e);
      setDynamicLineEnd({ x, y });
      drawCanvas();
    }
=======
    // Handle dynamic line for measurements
    if (isDrawing && measurementMode === 'distance') {
      const rect = canvasRef.current.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;
      const x = (rawX - panPosition.x) / scale;
      const y = (rawY - panPosition.y) / scale;

      setDynamicLineEnd({ x, y });
      drawCanvas();
=======
    // Handle dynamic line for measurements
    if (isDrawing && measurementMode === 'distance') {
      const rect = canvasRef.current.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;
      const x = (rawX - panPosition.x) / scale;
      const y = (rawY - panPosition.y) / scale;

      setDynamicLineEnd({ x, y });
      drawCanvas();
>>>>>>> parent of 2557c27 (working measurement tool with updated css)
    }

    // Keep existing scale setting dynamic line
    if (isDynamicLine) {
      const rect = canvasRef.current.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;
      const x = (rawX - panPosition.x) / scale;
      const y = (rawY - panPosition.y) / scale;

      setDynamicLineEnd({ x, y });
    }
<<<<<<< HEAD
>>>>>>> parent of 2557c27 (working measurement tool with updated css)
=======
>>>>>>> parent of 2557c27 (working measurement tool with updated css)
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Update handleCanvasDoubleClick for scale setting
  const handleCanvasDoubleClick = (e) => {
    console.log('Double click detected');
    console.log('isSettingScale:', isSettingScale);
    console.log('canSetScale:', canSetScale);
    
    if (!isSettingScale || !canSetScale) {
      console.log('Not in scale setting mode or cannot set scale yet');
      return;
    }

    if (!image) {
      setError('Please upload an image first');
      return;
    }

    try {
      e.preventDefault();
      const rect = canvasRef.current.getBoundingClientRect();
      const rawX = e.clientX - rect.left;
      const rawY = e.clientY - rect.top;
      const x = (rawX - panPosition.x) / scale;
      const y = (rawY - panPosition.y) / scale;

      console.log('Click coordinates:', {
        clientX: e.clientX,
        clientY: e.clientY,
        rectLeft: rect.left,
        rectTop: rect.top,
        panX: panPosition.x,
        panY: panPosition.y,
        scale: scale,
        calculatedX: x,
        calculatedY: y
      });

      if (!scalePoints.start) {
        console.log('Setting first point:', { x, y });
        setScalePoints({ start: { x, y }, end: null });
        setIsDynamicLine(true); // Start the dynamic line
        setDebugInfo({
          lastAction: 'Set first point',
          clickCoordinates: { x, y },
          scaleStatus: 'First point set'
        });
      } else if (!scalePoints.end) {
        console.log('Setting second point:', { x, y });
        setScalePoints({ ...scalePoints, end: { x, y } });
        setIsDynamicLine(false); // End the dynamic line
        setDynamicLineEnd(null); // Reset the dynamic line end
        setDebugInfo({
          lastAction: 'Set second point',
          clickCoordinates: { x, y },
          scaleStatus: 'Both points set'
        });
      }

      drawCanvas();
    } catch (error) {
      console.error('Error in handleCanvasDoubleClick:', error);
      setError(`Error setting scale point: ${error.message}`);
    }
  };

  // Update handleCanvasClick for measurements
  const handleCanvasClick = (e) => {
    console.log('Canvas clicked');
    console.log('Current measurement mode:', measurementMode);
    console.log('Is drawing:', isDrawing);

    if (measurementMode) {
      try {
        e.preventDefault();
        const rect = canvasRef.current.getBoundingClientRect();
        const rawX = e.clientX - rect.left;
        const rawY = e.clientY - rect.top;
        const x = (rawX - panPosition.x) / scale;
        const y = (rawY - panPosition.y) / scale;

        console.log('Click coordinates:', {
          raw: { x: rawX, y: rawY },
          adjusted: { x, y },
          scale,
          panPosition
        });

        if (measurementMode === 'distance') {
          console.log('Handling distance measurement');
          handleDistanceMeasurement(x, y);
        } else if (measurementMode === 'area') {
          console.log('Handling area measurement');
          handleAreaMeasurement(x, y);
        }
      } catch (error) {
        console.error('Error in handleCanvasClick:', error);
        setError(`Error measuring: ${error.message}`);
      }
    }
  };

  // Update handleDistanceMeasurement with logging
  const handleDistanceMeasurement = (x, y) => {
    console.log('Distance measurement:', {
      isDrawing,
      currentPoints,
      newPoint: { x, y }
    });

    try {
      if (!isDrawing) {
        console.log('Starting new distance measurement');
        setIsDrawing(true);
        setCurrentPoints([{ x, y }]);
        setDynamicLineEnd({ x, y }); // Initialize dynamic line end
        drawCanvas();
      } else {
        console.log('Completing distance measurement');
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
        setDynamicLineEnd(null);
        drawCanvas();
      }
    } catch (error) {
      console.error('Error in handleDistanceMeasurement:', error);
      setError(`Error measuring distance: ${error.message}`);
      setIsDrawing(false);
      setCurrentPoints([]);
      setDynamicLineEnd(null);
    }
  };

  // Add handleAreaMeasurement function
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

  // Add calculatePolygonArea function
  const calculatePolygonArea = (points) => {
    let area = 0;
    for (let i = 0; i < points.length; i++) {
      const j = (i + 1) % points.length;
      area += points[i].x * points[j].y;
      area -= points[j].x * points[i].y;
    }
    return Math.abs(area / 2);
  };

  // Add handleDeleteMeasurement function
  const handleDeleteMeasurement = (index) => {
    setMeasurements(measurements.filter((_, i) => i !== index));
  };

  // Add handleScaleSet function
  const handleScaleSet = (newScaleFactor) => {
    setScaleFactor(newScaleFactor);
    setIsSettingScale(false);
    setScalePoints({ start: null, end: null });
  };

  // Add this function to handle scale setting state changes
  const handleScaleSettingChange = (newIsSettingScale) => {
    console.log('Setting scale mode:', newIsSettingScale);
    setIsSettingScale(newIsSettingScale);
    if (!newIsSettingScale) {
      setScalePoints({ start: null, end: null });
    }
  };

  useEffect(() => {
    drawCanvas();
  }, [drawCanvas, scale, panPosition]);

  return (
    <div className="image-viewer">
      <div className="sidebar">
        <div className="sidebar-header">
          <h2>Landscape Measurement Tool</h2>
        </div>
        <div className="sidebar-content">
          <div className="file-input">
            <label htmlFor="file-upload" className="custom-file-upload">
              <FaCloudUploadAlt /> Choose Image
            </label>
            <input 
              id="file-upload"
              type="file" 
              accept="image/*" 
              onChange={handleFileUpload} 
            />
          </div>
          <div className="zoom-controls">
            <button onClick={() => handleZoom('in')} disabled={!image}>
              <FaSearchPlus />
            </button>
            <button onClick={() => handleZoom('out')} disabled={!image}>
              <FaSearchMinus />
            </button>
          </div>
          <ScaleSettings 
            onScaleSet={handleScaleSet}
            isSettingScale={isSettingScale}
            setIsSettingScale={handleScaleSettingChange}
            scalePoints={scalePoints}
            disabled={!canSetScale}
          />
          {scaleFactor && (
            <div className="scale-info">
              Scale: 1 px = {scaleFactor.toFixed(4)} ft
            </div>
          )}
          <MeasurementTools 
            measurementMode={measurementMode}
            setMeasurementMode={setMeasurementMode}
            measurements={measurements}
            setMeasurements={setMeasurements}
            onDeleteMeasurement={handleDeleteMeasurement}
            isDrawing={isDrawing}
          />
        </div>
      </div>
      <div className="image-container">
        {!image && !loading && (
          <div className="upload-prompt">
            Please upload an image to begin
          </div>
        )}

        {loading && <div className="loading">Loading image...</div>}
        {error && <div className="error">{error}</div>}
        
        <div className="viewer-window">
          <div 
            ref={containerRef}
            className={`canvas-container ${isSettingScale ? 'setting-scale' : ''}`}
            onMouseDown={!isSettingScale ? handleMouseDown : undefined}
            onMouseMove={handleMouseMove}
            onMouseUp={!isSettingScale ? handleMouseUp : undefined}
            onMouseLeave={!isSettingScale ? handleMouseUp : undefined}
            onDoubleClick={handleCanvasDoubleClick}
            onClick={handleCanvasClick}
            style={{
              cursor: isSettingScale 
                ? 'crosshair' 
                : measurementMode 
                  ? 'crosshair' 
                  : (isPanning ? 'grabbing' : 'grab')
            }}
          >
            <div 
              style={{
                transform: `translate(${panPosition.x}px, ${panPosition.y}px) scale(${scale})`,
                transformOrigin: '0 0'
              }}
            >
              <canvas ref={canvasRef} />
            </div>
          </div>
        </div>

        {isSettingScale && image && (
          <div className="scale-instructions">
            {!scalePoints.start 
              ? "Double-click to set first point" 
              : !scalePoints.end 
                ? "Double-click to set second point" 
                : "Enter the real-world distance"}
          </div>
        )}

        {measurementMode && (
          <div className="measurement-instructions">
            {!isDrawing 
              ? "Click to set start point" 
              : measurementMode === 'distance' 
                ? "Click to set end point" 
                : "Click to add points, click near start to close area"}
          </div>
        )}
      </div>
    </div>
  );
};

export default ImageViewer;
