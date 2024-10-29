import React, { useState } from 'react';
import '../styles/MeasurementTools.css';

function MeasurementTools({ 
  measurementMode, 
  setMeasurementMode,
  measurements,
  onDeleteMeasurement,
  isDrawing,
  setMeasurements,
  scale,
  pdfViewerRef
}) {
  const [areaPoints, setAreaPoints] = useState([]);
  const [areaLabels, setAreaLabels] = useState([]);
  const [isDrawingArea, setIsDrawingArea] = useState(false);

  const handleLabelChange = (index, newLabel) => {
    const newMeasurements = [...measurements];
    newMeasurements[index] = {
      ...newMeasurements[index],
      label: newLabel
    };
    setMeasurements(newMeasurements);
  };

  const handleLabelInput = (e, index) => {
    const newLabels = [...areaLabels];
    newLabels[index] = e.target.value;
    setAreaLabels(newLabels);
  };

  return (
    <div className="measurement-tools">
      <button
        className={measurementMode === 'distance' ? 'active' : ''}
        onClick={() => setMeasurementMode(measurementMode === 'distance' ? null : 'distance')}
        disabled={isDrawing}
      >
        Distance
      </button>
      <button
        className={measurementMode === 'area' ? 'active' : ''}
        onClick={() => setMeasurementMode(measurementMode === 'area' ? null : 'area')}
        disabled={isDrawing}
      >
        Area
      </button>

      {measurements.length > 0 && (
        <div className="measurements-list">
          <h3>Measurements</h3>
          {measurements.map((measurement, index) => (
            <div key={index} className="measurement-item">
              <input
                type="text"
                value={measurement.label || ''}
                onChange={(e) => handleLabelChange(index, e.target.value)}
                placeholder={`${measurement.type === 'distance' ? 'Distance' : 'Area'} ${index + 1}`}
                className="label-input"
              />
              <div className="measurement-content">
                <span className="measurement-value">
                  {measurement.type === 'distance' 
                    ? `${measurement.value.toFixed(2)} ft` 
                    : `${measurement.value.toFixed(2)} sq ft`}
                </span>
                <button 
                  className="delete-btn"
                  onClick={() => onDeleteMeasurement(index)}
                >
                  ×
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <svg className="measurement-overlay">
        {areaPoints.length > 0 && (
          <g>
            {/* Drawing lines between points */}
            <path
              d={`M ${areaPoints[0].x * scale} ${areaPoints[0].y * scale} 
                  ${areaPoints.slice(1).map(p => `L ${p.x * scale} ${p.y * scale}`).join(' ')}
                  ${isDrawingArea ? '' : 'Z'}`}
              className="area-path"
              fill={isDrawingArea ? 'none' : 'rgba(255, 0, 0, 0.2)'}
              stroke="red"
              strokeWidth="2"
            />
            
            {/* Animated dots at vertices */}
            {areaPoints.map((point, index) => (
              <circle
                key={index}
                cx={point.x * scale}
                cy={point.y * scale}
                r="4"
                className="vertex-dot"
              />
            ))}
          </g>
        )}

        {/* Labels */}
        {areaLabels.map((label, index) => {
          const points = areaPoints.slice(index * 3);
          if (points.length < 3) return null;

          // Calculate centroid for label position
          const centroid = {
            x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
            y: points.reduce((sum, p) => sum + p.y, 0) / points.length
          };

          return (
            <foreignObject
              key={index}
              x={centroid.x * scale - 50}
              y={centroid.y * scale - 10}
              width="100"
              height="20"
            >
              <input
                type="text"
                value={label}
                onChange={(e) => handleLabelInput(e, index)}
                className="area-label-input"
                placeholder="Enter label"
              />
            </foreignObject>
          );
        })}
      </svg>
    </div>
  );
}

export default MeasurementTools;
