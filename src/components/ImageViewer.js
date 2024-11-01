import React, { useState, useRef, useEffect, useCallback } from 'react';
import ScaleSettings from './ScaleSettings';
import MeasurementTools from './MeasurementTools';
import { FaCloudUploadAlt } from 'react-icons/fa';

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

  // Add this new helper function to get transformed coordinates
  const getTransformedCoordinates = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    
    // Get click position relative to canvas
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    // Transform coordinates based on current pan and scale
    const transformedX = (clickX - panPosition.x) / scale;
    const transformedY = (clickY - panPosition.y) / scale;

    return { x: transformedX, y: transformedY };
  };

  // Draw image and measurements
  const drawCanvas = useCallback(() => {
    if (!canvasRef.current || !image) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    // Set canvas size to match image
    canvas.width = image.width;
    canvas.height = image.height;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Save the current context state
    ctx.save();

    // Apply transformations
    ctx.translate(panPosition.x, panPosition.y);
    ctx.scale(scale, scale);

    // Draw image
    ctx.drawImage(image, 0, 0);

    // Draw scale points and dynamic line
    if (scalePoints.start) {
      // Draw first point
      ctx.beginPath();
      ctx.arc(scalePoints.start.x, scalePoints.start.y, 5/scale, 0, 2 * Math.PI);
      ctx.fillStyle = 'red';
      ctx.fill();

      // Draw dynamic line while setting scale
      if (!scalePoints.end && dynamicLineEnd) {
        ctx.beginPath();
        ctx.moveTo(scalePoints.start.x, scalePoints.start.y);
        ctx.lineTo(dynamicLineEnd.x, dynamicLineEnd.y);
        ctx.strokeStyle = 'orange';
        ctx.lineWidth = 3/scale;
        ctx.stroke();
      }
    }

    // Draw final scale line if both points are set
    if (scalePoints.end) {
      ctx.beginPath();
      ctx.arc(scalePoints.end.x, scalePoints.end.y, 5/scale, 0, 2 * Math.PI);
      ctx.fillStyle = 'red';
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(scalePoints.start.x, scalePoints.start.y);
      ctx.lineTo(scalePoints.end.x, scalePoints.end.y);
      ctx.strokeStyle = 'orange';
      ctx.lineWidth = 3/scale;
      ctx.stroke();
    }

    // Draw measurements
    measurements.forEach(measurement => {
      if (measurement.type === 'distance') {
        // Draw the line
        ctx.beginPath();
        ctx.moveTo(measurement.points[0].x, measurement.points[0].y);
        ctx.lineTo(measurement.points[1].x, measurement.points[1].y);
        ctx.strokeStyle = '#2196F3'; // Modern blue color
        ctx.lineWidth = 2/scale;
        ctx.stroke();

        // Calculate midpoint for label position
        const midX = (measurement.points[0].x + measurement.points[1].x) / 2;
        const midY = (measurement.points[0].y + measurement.points[1].y) / 2;

        // Draw label background with modern styling
        const label = measurement.label || `Distance ${measurements.indexOf(measurement) + 1}`;
        const value = `${measurement.value.toFixed(2)} ft`;
        ctx.font = `${14/scale}px Arial`;
        const labelWidth = ctx.measureText(label).width;
        const valueWidth = ctx.measureText(value).width;
        const width = Math.max(labelWidth, valueWidth) + 24/scale;
        const height = 52/scale;
        const boxY = midY - height - 10/scale;

        // Draw background with shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.2)';
        ctx.shadowBlur = 8/scale;
        ctx.shadowOffsetX = 2/scale;
        ctx.shadowOffsetY = 2/scale;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.beginPath();
        ctx.roundRect(
          midX - width/2, 
          boxY,
          width, 
          height, 
          6/scale
        );
        ctx.fill();

        // Reset shadow for text
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;

        // Draw label text with proper vertical centering
        ctx.fillStyle = '#1976D2';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        // Calculate vertical positions for centered text
        const labelY = boxY + height * 0.3;
        const valueY = boxY + height * 0.7;

        // Draw the text
        ctx.fillText(label, midX, labelY);
        ctx.fillStyle = '#2196F3';
        ctx.fillText(value, midX, valueY);
      }
    });

    // Draw current measurement
    if (currentPoints.length > 0 && dynamicLineEnd && measurementMode === 'distance') {
      ctx.beginPath();
      ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
      ctx.lineTo(dynamicLineEnd.x, dynamicLineEnd.y);
      ctx.strokeStyle = 'blue';
      ctx.lineWidth = 2/scale;
      ctx.stroke();

      if (scaleFactor) {
        const distance = Math.sqrt(
          Math.pow(dynamicLineEnd.x - currentPoints[0].x, 2) +
          Math.pow(dynamicLineEnd.y - currentPoints[0].y, 2)
        ) * scaleFactor;

        ctx.font = `${14/scale}px Arial`;
        ctx.fillStyle = 'blue';
        ctx.fillText(
          `${distance.toFixed(2)} ft`,
          dynamicLineEnd.x + 10/scale,
          dynamicLineEnd.y - 10/scale
        );
      }
    }

    // Draw area measurement in progress
    if (measurementMode === 'area' && currentPoints.length > 0) {
      // Draw lines between existing points
      ctx.beginPath();
      ctx.moveTo(currentPoints[0].x, currentPoints[0].y);
      currentPoints.forEach((point, index) => {
        if (index > 0) {
          ctx.lineTo(point.x, point.y);
        }
      });

      // Draw dynamic line to current mouse position
      if (dynamicLineEnd) {
        ctx.lineTo(dynamicLineEnd.x, dynamicLineEnd.y);
        
        // If we have more than 2 points, show potential closing line
        if (currentPoints.length > 2) {
          ctx.lineTo(currentPoints[0].x, currentPoints[0].y);
        }
      }

      ctx.strokeStyle = 'green';
      ctx.lineWidth = 2/scale;
      ctx.stroke();

      // Draw vertices for existing points
      currentPoints.forEach(point => {
        ctx.beginPath();
        ctx.arc(point.x, point.y, 5/scale, 0, 2 * Math.PI);
        ctx.fillStyle = 'green';
        ctx.fill();
      });

      // Draw temporary area calculation if we have more than 2 points
      if (currentPoints.length > 2 && dynamicLineEnd) {
        const tempPoints = [...currentPoints, dynamicLineEnd];
        const area = calculatePolygonArea(tempPoints);
        const realArea = area * scaleFactor * scaleFactor;

        // Position the area text near the last point
        const lastPoint = currentPoints[currentPoints.length - 1];
        ctx.font = `${14/scale}px Arial`;
        ctx.fillStyle = 'green';
        ctx.fillText(
          `${realArea.toFixed(2)} sq ft`,
          lastPoint.x + 10/scale,
          lastPoint.y - 10/scale
        );
      }
    }

    // Draw completed area measurements
    measurements.forEach(measurement => {
      if (measurement.type === 'area') {
        // Draw the polygon
        ctx.beginPath();
        ctx.moveTo(measurement.points[0].x, measurement.points[0].y);
        measurement.points.forEach((point, index) => {
          if (index > 0) {
            ctx.lineTo(point.x, point.y);
          }
        });
        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 255, 0, 0.2)';
        ctx.fill();
        ctx.strokeStyle = 'green';
        ctx.lineWidth = 2/scale;
        ctx.stroke();

        // Calculate centroid for label position
        const centroid = getCentroid(measurement.points);

        // Draw label background
        const label = measurement.label || `Area ${measurements.indexOf(measurement) + 1}`;
        const value = `${measurement.value.toFixed(2)} sq ft`;
        ctx.font = `${14/scale}px Arial`;
        const labelWidth = ctx.measureText(label).width;
        const valueWidth = ctx.measureText(value).width;
        const width = Math.max(labelWidth, valueWidth) + 20/scale;
        const height = 40/scale;

        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.fillRect(centroid.x - width/2, centroid.y - height/2, width, height);

        // Draw label text
        ctx.fillStyle = 'green';
        ctx.textAlign = 'center';
        ctx.fillText(label, centroid.x, centroid.y - 5/scale);
        ctx.fillText(value, centroid.x, centroid.y + 15/scale);
      }
    });

    // Restore the context state
    ctx.restore();
  }, [image, scale, panPosition, scalePoints, measurements, currentPoints, dynamicLineEnd, measurementMode, scaleFactor]);

  // Add helper function to calculate centroid
  const getCentroid = (points) => {
    const centroid = points.reduce(
      (acc, point) => ({
        x: acc.x + point.x / points.length,
        y: acc.y + point.y / points.length
      }),
      { x: 0, y: 0 }
    );
    return centroid;
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

    // Handle dynamic line for scale setting
    if (isSettingScale && scalePoints.start && !scalePoints.end) {
      const { x, y } = getTransformedCoordinates(e);
      setDynamicLineEnd({ x, y });
    }

    // Handle dynamic line for measurements (both distance and area)
    if (isDrawing && (measurementMode === 'distance' || measurementMode === 'area')) {
      const { x, y } = getTransformedCoordinates(e);
      setDynamicLineEnd({ x, y });
    }

    drawCanvas();
  };

  const handleMouseUp = () => {
    setIsPanning(false);
  };

  // Update handleCanvasClick to handleCanvasDoubleClick
  const handleCanvasDoubleClick = (e) => {
    if (!isSettingScale || !canSetScale || !image) {
      return;
    }

    try {
      e.preventDefault();
      const { x, y } = getTransformedCoordinates(e);

      if (!scalePoints.start) {
        setScalePoints({ start: { x, y }, end: null });
        setIsDynamicLine(true);
      } else if (!scalePoints.end) {
        setScalePoints({ ...scalePoints, end: { x, y } });
        setIsDynamicLine(false);
        setDynamicLineEnd(null);
      }

      drawCanvas();
    } catch (error) {
      console.error('Error in handleCanvasDoubleClick:', error);
      setError(`Error setting scale point: ${error.message}`);
    }
  };

  // Add click handler for measurements
  const handleCanvasClick = (e) => {
    if (!measurementMode) return;

    try {
      e.preventDefault();
      const { x, y } = getTransformedCoordinates(e);

      if (measurementMode === 'distance') {
        handleDistanceMeasurement(x, y);
      } else if (measurementMode === 'area') {
        handleAreaMeasurement(x, y);
      }
    } catch (error) {
      console.error('Error in handleCanvasClick:', error);
      setError(`Error measuring: ${error.message}`);
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

  // Update handleAreaMeasurement to include better visual feedback
  const handleAreaMeasurement = (x, y) => {
    if (!isDrawing) {
      setIsDrawing(true);
      setCurrentPoints([{ x, y }]);
      setDynamicLineEnd({ x, y }); // Initialize dynamic line end
    } else {
      const newPoints = [...currentPoints, { x, y }];
      setCurrentPoints(newPoints);
      setDynamicLineEnd({ x, y });
      
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
          setDynamicLineEnd(null);
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
            onMouseMove={handleMouseMove} // Add the onMouseMove handler
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